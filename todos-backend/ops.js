// Operation-outbox apply logic.
//
// Every todo mutation the frontend makes is a small per-field "op" (see the
// schema the frontend outbox uses). Offline or online, the client
// appends ops to a persisted outbox and drains them to POST /api/ops, which
// calls applyOp() for each. Ops are idempotent and deduped by opId (see the
// OpLog guard below) so an at-least-once retry can never double-apply or
// resurrect a stale write.

const OP_TYPES = [
  "addTodo",
  "setText",
  "setChecked",
  "move",
  "deleteTodo",
  "setNote",
];

// Returns an error string if the op is malformed, or null if it is valid.
export function validateOp(op) {
  if (!op || typeof op !== "object") return "op must be an object";
  if (typeof op.opId !== "string" || op.opId === "") return "opId is required";
  if (!OP_TYPES.includes(op.type)) return `unknown op type: ${op.type}`;
  if (typeof op.todoId !== "string" || op.todoId === "") return "todoId is required";

  const p = op.payload ?? {};
  switch (op.type) {
    case "addTodo":
      if (typeof op.listName !== "string" || op.listName === "")
        return "listName is required for addTodo";
      if (typeof p.text !== "string") return "addTodo requires payload.text";
      if (typeof p.order !== "number") return "addTodo requires numeric payload.order";
      break;
    case "setText":
      if (typeof p.text !== "string") return "setText requires payload.text";
      break;
    case "setChecked":
      if (typeof p.checked !== "boolean")
        return "setChecked requires boolean payload.checked";
      break;
    case "move":
      if (typeof p.order !== "number") return "move requires numeric payload.order";
      break;
    case "setNote":
      if (typeof p.text !== "string") return "setNote requires payload.text";
      break;
    case "deleteTodo":
      break;
  }
  return null;
}

// Every write stamps who last touched the item (server clock) so clients can
// show "edited by X". Identity is trust-based (no auth); missing => null.
function meta(op) {
  return { deviceName: op.deviceName ?? null, deviceId: op.deviceId ?? null };
}

const STAMP = "item.updatedAt = timestamp(), item.updatedBy = $deviceName, item.updatedByDeviceId = $deviceId";

// Applies a single (already-validated) op. Returns { opId, status } where
// status is "applied" | "noop" | "duplicate". "noop" means the target todo
// was missing (delete-wins). Throws on DB error so the caller can 500 and the
// client retries the whole batch — safe because of the opId dedup below.
export async function applyOp(session, op) {
  // Dedup guard: MERGE the OpLog node and only apply when this opId is new.
  // The single-statement MERGE is atomic (it locks the node), so a concurrent
  // duplicate cannot slip through.
  const log = await session.run(
    `MERGE (o:OpLog {opId: $opId})
     ON CREATE SET o.appliedAt = timestamp(), o.fresh = true
     ON MATCH SET o.fresh = false
     RETURN o.fresh AS fresh`,
    { opId: op.opId },
  );
  if (log.records[0]?.get("fresh") !== true) {
    return { opId: op.opId, status: "duplicate" };
  }

  const applied = { opId: op.opId, status: "applied" };
  const noop = { opId: op.opId, status: "noop" };
  const p = op.payload ?? {};
  const m = meta(op);

  switch (op.type) {
    case "addTodo": {
      if (op.labelItemId != null) {
        // Restore/create a label-todo sourced from its LabelItem (mirrors the
        // POST /todolists/:name/todos restore path).
        const r = await session.run(
          `MATCH (tl:TodoList {name: $name})
           MATCH (li:LabelItem {itemId: $labelItemId})
           MERGE (item:LabelTodo {todoId: $todoId})
           ON CREATE SET item.checked = $checked, item.order = $order, ${STAMP}
           MERGE (item)-[:BELONGS_TO]->(tl)
           MERGE (item)-[:SOURCED_FROM]->(li)
           RETURN item.todoId AS todoId`,
          {
            name: op.listName,
            labelItemId: op.labelItemId,
            todoId: op.todoId,
            checked: p.checked ?? false,
            order: p.order,
            ...m,
          },
        );
        return r.records.length ? applied : noop;
      }
      const r = await session.run(
        `MATCH (tl:TodoList {name: $name})
         MERGE (item:Todo {todoId: $todoId})
         ON CREATE SET item.text = $text, item.checked = $checked, item.order = $order, ${STAMP}
         MERGE (item)-[:BELONGS_TO]->(tl)
         RETURN item.todoId AS todoId`,
        {
          name: op.listName,
          todoId: op.todoId,
          text: p.text,
          checked: p.checked ?? false,
          order: p.order,
          ...m,
        },
      );
      return r.records.length ? applied : noop;
    }

    case "setText": {
      // Text lives on regular Todos only; a LabelTodo's text comes from its
      // LabelItem, so setText structurally never touches one (no :Todo match).
      const r = await session.run(
        `MATCH (item:Todo {todoId: $todoId})
         SET item.text = $text, ${STAMP}
         RETURN item.todoId AS todoId`,
        { todoId: op.todoId, text: p.text, ...m },
      );
      return r.records.length ? applied : noop;
    }

    case "setChecked": {
      const r = await session.run(
        `MATCH (item {todoId: $todoId}) WHERE item:Todo OR item:LabelTodo
         SET item.checked = $checked, ${STAMP}
         RETURN item.todoId AS todoId`,
        { todoId: op.todoId, checked: p.checked, ...m },
      );
      return r.records.length ? applied : noop;
    }

    case "move": {
      const r = await session.run(
        `MATCH (item {todoId: $todoId}) WHERE item:Todo OR item:LabelTodo
         SET item.order = $order, ${STAMP}
         RETURN item.todoId AS todoId`,
        { todoId: op.todoId, order: p.order, ...m },
      );
      return r.records.length ? applied : noop;
    }

    case "deleteTodo": {
      // Capture the id before DETACH DELETE so we can tell match from noop.
      const r = await session.run(
        `MATCH (item {todoId: $todoId}) WHERE item:Todo OR item:LabelTodo
         WITH item, item.todoId AS deletedId
         OPTIONAL MATCH (item)-[:HAS_NOTES]->(n:TodoNote)
         DETACH DELETE n, item
         RETURN deletedId`,
        { todoId: op.todoId },
      );
      return r.records.length ? applied : noop;
    }

    case "setNote": {
      const r = await session.run(
        `MATCH (item {todoId: $todoId}) WHERE item:Todo OR item:LabelTodo
         MERGE (item)-[:HAS_NOTES]->(n:TodoNote)
         SET n.text = $text, n.links = [], ${STAMP}
         RETURN item.todoId AS todoId`,
        { todoId: op.todoId, text: p.text, ...m },
      );
      return r.records.length ? applied : noop;
    }
  }
}
