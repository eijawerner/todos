import express from "express";
import cors from "cors";
import neo4j from "neo4j-driver";
import "dotenv/config";
import { validateOp, applyOp } from "./ops.js";

const app = express();
app.use(cors());
app.use(express.json());

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
);

const port = process.env.PORT || 4000;

// GET /api/todolists - list all todo lists
app.get("/api/todolists", async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run("MATCH (tl:TodoList) RETURN tl.name AS name");
    const todoLists = result.records.map((r) => ({ name: r.get("name") }));
    res.json(todoLists);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch todo lists" });
  } finally {
    await session.close();
  }
});

// POST /api/todolists - create a new todo list
app.post("/api/todolists", async (req, res) => {
  const { name } = req.body;
  const session = driver.session();
  try {
    const existing = await session.run(
      `MATCH (tl:TodoList) WHERE toLower(tl.name) = toLower($name) RETURN tl.name AS name`,
      { name },
    );
    if (existing.records.length > 0) {
      return res.status(409).json({ error: "A list with this name already exists" });
    }
    await session.run(
      `MATCH (u:User {name: "eijrik"})
       CREATE (tl:TodoList {name: $name})-[:CREATED_BY]->(u)
       RETURN tl.name AS name`,
      { name },
    );
    return res.json({ name });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create todo list" });
  } finally {
    await session.close();
  }
});

// DELETE /api/todolists/:name - delete a todo list and all its todos/notes
app.delete("/api/todolists/:name", async (req, res) => {
  const { name } = req.params;
  const session = driver.session();
  try {
    await session.run(
      `MATCH (tl:TodoList {name: $name})
       OPTIONAL MATCH (tl)<-[:BELONGS_TO]-(item)
       WHERE item:Todo OR item:LabelTodo
       OPTIONAL MATCH (item)-[:HAS_NOTES]->(n:TodoNote)
       DETACH DELETE n, item, tl`,
      { name },
    );
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete todo list" });
  } finally {
    await session.close();
  }
});

// GET /api/todolists/:name/todos - get all todos in a list (both Todo and LabelTodo)
app.get("/api/todolists/:name/todos", async (req, res) => {
  const { name } = req.params;
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (tl:TodoList {name: $name})<-[:BELONGS_TO]-(item)
       WHERE item:Todo OR item:LabelTodo
       OPTIONAL MATCH (item)-[:HAS_NOTES]->(n:TodoNote)
       OPTIONAL MATCH (item)-[:SOURCED_FROM]->(li:LabelItem)
       RETURN item.todoId AS todoId,
              COALESCE(li.text, item.text) AS text,
              item.checked AS checked,
              item.order AS order,
              n.text AS noteText,
              li.itemId AS labelItemId,
              item.updatedAt AS updatedAt,
              item.updatedBy AS updatedBy`,
      { name },
    );
    const todos = result.records.map((r) => {
      const base = {
        todoId: r.get("todoId"),
        text: r.get("text"),
        checked: r.get("checked"),
        order: typeof r.get("order") === "object" ? r.get("order").toNumber() : r.get("order"),
        note: r.get("noteText") != null ? { text: r.get("noteText") } : undefined,
      };
      // updatedAt/updatedBy only exist on todos touched via POST /api/ops, so
      // include them conditionally (like labelItemId) to keep older todos clean.
      let mapped = r.get("labelItemId") != null ? { ...base, labelItemId: r.get("labelItemId") } : base;
      const updatedAt = r.get("updatedAt");
      if (updatedAt != null) {
        mapped = { ...mapped, updatedAt: typeof updatedAt === "object" ? updatedAt.toNumber() : updatedAt };
      }
      if (r.get("updatedBy") != null) {
        mapped = { ...mapped, updatedBy: r.get("updatedBy") };
      }
      return mapped;
    });
    res.json(todos);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch todos" });
  } finally {
    await session.close();
  }
});

// Per-todo writes (create/update/delete/note) are handled by POST /api/ops
// below. Label-todo restore on undo goes through the addTodo op's labelItemId.

// POST /api/ops - apply a batch of per-field operations from the client outbox.
// Ops are applied sequentially in request order; each result echoes the op's
// status. A validation failure rejects just that op; a DB error fails the whole
// request with 500 so the client retries the batch (safe: ops are deduped by
// opId, see ops.js).
app.post("/api/ops", async (req, res) => {
  const { ops } = req.body;
  if (!Array.isArray(ops) || ops.length === 0 || ops.length > 100) {
    return res.status(400).json({ error: "ops must be an array of 1 to 100 items" });
  }
  const session = driver.session();
  try {
    const results = [];
    for (const op of ops) {
      const error = validateOp(op);
      if (error) {
        results.push({ opId: op?.opId ?? null, status: "rejected", error });
        continue;
      }
      results.push(await applyOp(session, op));
    }
    res.json({ results });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to apply ops" });
  } finally {
    await session.close();
  }
});

// --------------- Labels ---------------

// GET /api/labels - list all labels with item counts
app.get("/api/labels", async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (l:Label)
       OPTIONAL MATCH (li:LabelItem)-[:PART_OF]->(l)
       RETURN l.labelId AS labelId, l.name AS name, count(li) AS itemCount
       ORDER BY l.name`,
    );
    const labels = result.records.map((r) => ({
      labelId: r.get("labelId"),
      name: r.get("name"),
      itemCount: typeof r.get("itemCount") === "object" ? r.get("itemCount").toNumber() : r.get("itemCount"),
    }));
    res.json(labels);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch labels" });
  } finally {
    await session.close();
  }
});

// POST /api/labels - create a label
app.post("/api/labels", async (req, res) => {
  const { name } = req.body;
  if (typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "Label name is required" });
  }
  const session = driver.session();
  try {
    const existing = await session.run(
      `MATCH (l:Label) WHERE toLower(l.name) = toLower($name) RETURN l`,
      { name },
    );
    if (existing.records.length > 0) {
      return res.status(409).json({ error: "A label with this name already exists" });
    }
    const labelId = crypto.randomUUID();
    await session.run(
      `CREATE (l:Label {labelId: $labelId, name: $name}) RETURN l`,
      { labelId, name },
    );
    return res.json({ labelId, name, itemCount: 0 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create label" });
  } finally {
    await session.close();
  }
});

// DELETE /api/labels/:labelId - delete a label, its items, and any LabelTodos sourced from them
app.delete("/api/labels/:labelId", async (req, res) => {
  const { labelId } = req.params;
  const session = driver.session();
  try {
    await session.run(
      `MATCH (l:Label {labelId: $labelId})
       OPTIONAL MATCH (li:LabelItem)-[:PART_OF]->(l)
       OPTIONAL MATCH (lt:LabelTodo)-[:SOURCED_FROM]->(li)
       OPTIONAL MATCH (lt)-[:HAS_NOTES]->(n:TodoNote)
       DETACH DELETE n, lt, li, l`,
      { labelId },
    );
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete label" });
  } finally {
    await session.close();
  }
});

// GET /api/labels/:labelId/items - get items in a label
app.get("/api/labels/:labelId/items", async (req, res) => {
  const { labelId } = req.params;
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (li:LabelItem)-[:PART_OF]->(l:Label {labelId: $labelId})
       RETURN li.itemId AS itemId, li.text AS text
       ORDER BY li.text`,
      { labelId },
    );
    const items = result.records.map((r) => ({
      itemId: r.get("itemId"),
      text: r.get("text"),
    }));
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch label items" });
  } finally {
    await session.close();
  }
});

// POST /api/labels/:labelId/items - add item to a label
app.post("/api/labels/:labelId/items", async (req, res) => {
  const { labelId } = req.params;
  const { text } = req.body;
  if (typeof text !== "string" || text.trim() === "") {
    return res.status(400).json({ error: "Item text is required" });
  }
  const itemId = crypto.randomUUID();
  const session = driver.session();
  try {
    await session.run(
      `MATCH (l:Label {labelId: $labelId})
       CREATE (li:LabelItem {itemId: $itemId, text: $text})-[:PART_OF]->(l)
       RETURN li`,
      { labelId, itemId, text },
    );
    res.json({ itemId, text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to add label item" });
  } finally {
    await session.close();
  }
});

// PUT /api/labels/:labelId/items/:itemId - edit a label item's text
app.put("/api/labels/:labelId/items/:itemId", async (req, res) => {
  const { itemId } = req.params;
  const { text } = req.body;
  if (typeof text !== "string" || text.trim() === "") {
    return res.status(400).json({ error: "Item text is required" });
  }
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (li:LabelItem {itemId: $itemId})
       SET li.text = $text
       RETURN li`,
      { itemId, text },
    );
    if (result.records.length === 0) {
      return res.status(404).json({ error: "Label item not found" });
    }
    res.json({ itemId, text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update label item" });
  } finally {
    await session.close();
  }
});

// POST /api/todolists/:name/import-label - import label items into a list as LabelTodos
app.post("/api/todolists/:name/import-label", async (req, res) => {
  const { name } = req.params;
  const { labelId } = req.body;
  const session = driver.session();
  try {
    const maxOrderResult = await session.run(
      `MATCH (tl:TodoList {name: $name})<-[:BELONGS_TO]-(item)
       WHERE item:Todo OR item:LabelTodo
       RETURN max(item.order) AS maxOrder`,
      { name },
    );
    let nextOrder = 1.0;
    const maxRaw = maxOrderResult.records[0]?.get("maxOrder");
    if (maxRaw != null) {
      nextOrder = (typeof maxRaw === "object" ? maxRaw.toNumber() : maxRaw) + 1.0;
    }

    const result = await session.run(
      `MATCH (tl:TodoList {name: $name})
       MATCH (li:LabelItem)-[:PART_OF]->(l:Label {labelId: $labelId})
       WHERE NOT EXISTS {
         MATCH (tl)<-[:BELONGS_TO]-(existing:LabelTodo)-[:SOURCED_FROM]->(li)
       }
       WITH tl, li ORDER BY li.text
       WITH tl, collect(li) AS items
       UNWIND range(0, size(items)-1) AS idx
       WITH tl, items[idx] AS li, $nextOrder + idx AS ord
       CREATE (lt:LabelTodo {todoId: randomUUID(), checked: false, order: ord})-[:BELONGS_TO]->(tl)
       CREATE (lt)-[:SOURCED_FROM]->(li)
       RETURN li.text AS text, lt.todoId AS todoId, lt.order AS order, li.itemId AS labelItemId`,
      { name, labelId, nextOrder },
    );
    const created = result.records.map((r) => ({
      todoId: r.get("todoId"),
      text: r.get("text"),
      order: typeof r.get("order") === "object" ? r.get("order").toNumber() : r.get("order"),
      checked: false,
      labelItemId: r.get("labelItemId"),
    }));
    res.json(created);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to import label" });
  } finally {
    await session.close();
  }
});

// DELETE /api/labels/:labelId/items/:itemId - remove item from label (and its LabelTodos)
app.delete("/api/labels/:labelId/items/:itemId", async (req, res) => {
  const { itemId } = req.params;
  const session = driver.session();
  try {
    await session.run(
      `MATCH (li:LabelItem {itemId: $itemId})
       OPTIONAL MATCH (lt:LabelTodo)-[:SOURCED_FROM]->(li)
       OPTIONAL MATCH (lt)-[:HAS_NOTES]->(n:TodoNote)
       DETACH DELETE n, lt, li`,
      { itemId },
    );
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete label item" });
  } finally {
    await session.close();
  }
});

// OpLog nodes only need to outlive the client's retry window (seconds), so
// prune ones older than a few days to keep the dedup index from growing.
const OP_LOG_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
async function pruneOpLog() {
  const session = driver.session();
  try {
    await session.run(
      `MATCH (o:OpLog) WHERE o.appliedAt < timestamp() - $maxAgeMs DETACH DELETE o`,
      { maxAgeMs: OP_LOG_MAX_AGE_MS },
    );
  } catch (e) {
    console.error("OpLog prune failed", e);
  } finally {
    await session.close();
  }
}

if (!process.env.VITEST) {
  pruneOpLog();
  setInterval(pruneOpLog, 6 * 60 * 60 * 1000).unref?.();
  app.listen(port, () => {
    console.log(`Server ready at http://localhost:${port}`);
  });
}

export { app };
