import express from "express";
import cors from "cors";
import neo4j from "neo4j-driver";
import "dotenv/config";

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
    // Delete notes belonging to todos in this list, then todos, then the list
    await session.run(
      `MATCH (tl:TodoList {name: $name})
       OPTIONAL MATCH (tl)<-[:BELONGS_TO]-(t:Todo)
       OPTIONAL MATCH (t)-[:HAS_NOTES]->(n:TodoNote)
       DETACH DELETE n, t, tl`,
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

// GET /api/todolists/:name/todos - get all todos in a list (with notes)
app.get("/api/todolists/:name/todos", async (req, res) => {
  const { name } = req.params;
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (tl:TodoList {name: $name})<-[:BELONGS_TO]-(t:Todo)
       OPTIONAL MATCH (t)-[:HAS_NOTES]->(n:TodoNote)
       RETURN t.todoId AS todoId, t.text AS text, t.checked AS checked, t.order AS order, n.text AS noteText`,
      { name },
    );
    const todos = result.records.map((r) => ({
      todoId: r.get("todoId"),
      text: r.get("text"),
      checked: r.get("checked"),
      order: typeof r.get("order") === "object" ? r.get("order").toNumber() : r.get("order"),
      note: r.get("noteText") != null ? { text: r.get("noteText") } : undefined,
    }));
    res.json(todos);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch todos" });
  } finally {
    await session.close();
  }
});

// POST /api/todolists/:name/todos - create a new todo in a list
app.post("/api/todolists/:name/todos", async (req, res) => {
  const { name } = req.params;
  const { text, todoId, checked, order } = req.body;
  const session = driver.session();
  try {
    await session.run(
      `MATCH (tl:TodoList {name: $name})
       CREATE (t:Todo {todoId: $todoId, text: $text, checked: $checked, order: $order})-[:BELONGS_TO]->(tl)
       RETURN t`,
      { name, text, todoId, checked: checked ?? false, order },
    );
    res.json({ todoId, text, checked: checked ?? false, order });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create todo" });
  } finally {
    await session.close();
  }
});

// PUT /api/todos/:todoId - update a todo
app.put("/api/todos/:todoId", async (req, res) => {
  const { todoId } = req.params;
  const { text, checked, order } = req.body;
  const session = driver.session();
  try {
    await session.run(
      `MATCH (t:Todo {todoId: $todoId})
       SET t.text = $text, t.checked = $checked, t.order = $order
       RETURN t`,
      { todoId, text, checked, order },
    );
    res.json({ todoId, text, checked, order });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update todo" });
  } finally {
    await session.close();
  }
});

// DELETE /api/todos/:todoId - delete a todo and its note
app.delete("/api/todos/:todoId", async (req, res) => {
  const { todoId } = req.params;
  const session = driver.session();
  try {
    await session.run(
      `MATCH (t:Todo {todoId: $todoId})
       OPTIONAL MATCH (t)-[:HAS_NOTES]->(n:TodoNote)
       DETACH DELETE n, t`,
      { todoId },
    );
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete todo" });
  } finally {
    await session.close();
  }
});

// DELETE /api/todos - batch delete todos by IDs
app.delete("/api/todos", async (req, res) => {
  const { todoIds } = req.body;
  const session = driver.session();
  try {
    await session.run(
      `MATCH (t:Todo) WHERE t.todoId IN $todoIds
       OPTIONAL MATCH (t)-[:HAS_NOTES]->(n:TodoNote)
       DETACH DELETE n, t`,
      { todoIds },
    );
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to delete todos" });
  } finally {
    await session.close();
  }
});

// GET /api/todos/:todoId/note - get a todo's note
app.get("/api/todos/:todoId/note", async (req, res) => {
  const { todoId } = req.params;
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (t:Todo {todoId: $todoId})-[:HAS_NOTES]->(n:TodoNote)
       RETURN n.text AS text`,
      { todoId },
    );
    if (result.records.length === 0) {
      res.json(null);
    } else {
      res.json({ text: result.records[0].get("text") });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch note" });
  } finally {
    await session.close();
  }
});

// PUT /api/todos/:todoId/note - create or update a todo's note (upsert)
app.put("/api/todos/:todoId/note", async (req, res) => {
  const { todoId } = req.params;
  const { text } = req.body;
  const session = driver.session();
  try {
    await session.run(
      `MATCH (t:Todo {todoId: $todoId})
       MERGE (t)-[:HAS_NOTES]->(n:TodoNote)
       SET n.text = $text, n.links = []
       RETURN n.text AS text`,
      { todoId, text },
    );
    res.json({ text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update note" });
  } finally {
    await session.close();
  }
});

app.listen(port, () => {
  console.log(`Server ready at http://localhost:${port}`);
});
