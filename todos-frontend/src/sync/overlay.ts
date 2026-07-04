import { Todo, isLabelTodo } from "../common/types/Models";
import { Op } from "./opTypes";

// Renders the current view = server todos with pending outbox ops laid on top.
// Ops apply in enqueue order (per-field last-write-wins); deletes win. The
// result is sorted by (order, todoId) so ordering is stable across devices.
export function applyOps(serverTodos: Todo[], ops: Op[]): Todo[] {
  const byId = new Map<string, Todo>();
  for (const t of serverTodos) byId.set(t.todoId, { ...t });

  for (const op of ops) {
    switch (op.type) {
      case "addTodo": {
        const todo: Todo =
          op.labelItemId != null
            ? {
                todoId: op.todoId,
                text: op.payload.text,
                checked: op.payload.checked,
                order: op.payload.order,
                labelItemId: op.labelItemId,
              }
            : {
                todoId: op.todoId,
                text: op.payload.text,
                checked: op.payload.checked,
                order: op.payload.order,
              };
        byId.set(op.todoId, todo);
        break;
      }
      case "setText": {
        const t = byId.get(op.todoId);
        // A label-todo's text comes from its LabelItem, so setText can't change
        // it (matches the backend, which only matches :Todo).
        if (t && !isLabelTodo(t)) byId.set(op.todoId, { ...t, text: op.payload.text });
        break;
      }
      case "setChecked": {
        const t = byId.get(op.todoId);
        if (t) byId.set(op.todoId, { ...t, checked: op.payload.checked });
        break;
      }
      case "move": {
        const t = byId.get(op.todoId);
        if (t) byId.set(op.todoId, { ...t, order: op.payload.order });
        break;
      }
      case "deleteTodo": {
        byId.delete(op.todoId);
        break;
      }
      case "setNote": {
        const t = byId.get(op.todoId);
        if (t) {
          byId.set(op.todoId, {
            ...t,
            note: { text: op.payload.text, links: t.note?.links ?? [] },
          });
        }
        break;
      }
    }
  }

  return [...byId.values()].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.todoId < b.todoId ? -1 : a.todoId > b.todoId ? 1 : 0;
  });
}
