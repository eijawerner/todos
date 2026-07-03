// Per-field operations mirroring the backend contract (todos-backend/ops.js).
// Every todo mutation becomes one of these, appended to the outbox and drained
// to POST /api/ops. clientTs is observability only; conflict resolution is
// per-field last-write-wins by server arrival order (deletes win).

export type OpBase = {
  opId: string;
  deviceId: string;
  deviceName: string;
  listName: string;
  todoId: string;
  clientTs: number;
};

export type AddTodoOp = OpBase & {
  type: "addTodo";
  // present when restoring/creating a label-todo (links to its LabelItem)
  labelItemId?: string;
  payload: { text: string; checked: boolean; order: number };
};

export type SetTextOp = OpBase & { type: "setText"; payload: { text: string } };
export type SetCheckedOp = OpBase & { type: "setChecked"; payload: { checked: boolean } };
export type MoveOp = OpBase & { type: "move"; payload: { order: number } };
export type DeleteTodoOp = OpBase & { type: "deleteTodo"; payload?: Record<string, never> };
export type SetNoteOp = OpBase & { type: "setNote"; payload: { text: string } };

export type Op =
  | AddTodoOp
  | SetTextOp
  | SetCheckedOp
  | MoveOp
  | DeleteTodoOp
  | SetNoteOp;

export type OpStatus = "applied" | "noop" | "rejected" | "duplicate";

export type OpResult = {
  opId: string;
  status: OpStatus;
  error?: string;
};
