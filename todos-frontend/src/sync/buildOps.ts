import {
  AddTodoOp,
  DeleteTodoOp,
  MoveOp,
  SetCheckedOp,
  SetNoteOp,
  SetTextOp,
} from "./opTypes";
import { getIdentity } from "../common/identity";
import { Todo, isLabelTodo } from "../common/types/Models";

// Pure builders that turn a UI action into an outbox op, stamped with this
// device's identity. Kept separate from the handlers so the op-generation logic
// is unit-testable without rendering.

function base(listName: string, todoId: string) {
  const identity = getIdentity();
  return {
    opId: crypto.randomUUID(),
    deviceId: identity.deviceId,
    deviceName: identity.deviceName ?? "",
    listName,
    todoId,
    clientTs: Date.now(),
  };
}

export function buildAddTodoOp(listName: string, todo: Todo): AddTodoOp {
  return {
    ...base(listName, todo.todoId),
    type: "addTodo",
    // A label-todo carries its source link so undo restores it faithfully.
    ...(isLabelTodo(todo) ? { labelItemId: todo.labelItemId } : {}),
    payload: { text: todo.text, checked: todo.checked, order: todo.order },
  };
}

export function buildSetTextOp(listName: string, todoId: string, text: string): SetTextOp {
  return { ...base(listName, todoId), type: "setText", payload: { text } };
}

export function buildSetCheckedOp(
  listName: string,
  todoId: string,
  checked: boolean,
): SetCheckedOp {
  return { ...base(listName, todoId), type: "setChecked", payload: { checked } };
}

export function buildMoveOp(listName: string, todoId: string, order: number): MoveOp {
  return { ...base(listName, todoId), type: "move", payload: { order } };
}

export function buildDeleteTodoOp(listName: string, todoId: string): DeleteTodoOp {
  return { ...base(listName, todoId), type: "deleteTodo", payload: {} };
}

export function buildSetNoteOp(listName: string, todoId: string, text: string): SetNoteOp {
  return { ...base(listName, todoId), type: "setNote", payload: { text } };
}
