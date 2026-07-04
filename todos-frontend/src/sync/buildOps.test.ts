import { it, expect, beforeEach } from "vitest";
import {
  buildAddTodoOp,
  buildSetTextOp,
  buildSetCheckedOp,
  buildMoveOp,
  buildDeleteTodoOp,
  buildSetNoteOp,
} from "./buildOps";
import { setDeviceName } from "../common/identity";
import { Todo } from "../common/types/Models";

beforeEach(() => {
  localStorage.clear();
});

const regularTodo: Todo = { todoId: "t1", text: "Milk", checked: false, order: 3 };
const labelTodo: Todo = {
  todoId: "lt1",
  text: "Tent",
  checked: true,
  order: 4,
  labelItemId: "li1",
};

it("stamps every op with a fresh opId and the device identity", () => {
  setDeviceName("Eija");
  const a = buildSetTextOp("Trip", "t1", "a");
  const b = buildSetTextOp("Trip", "t1", "b");

  expect(a.opId).toEqual(expect.any(String));
  expect(a.opId).not.toBe(b.opId);
  expect(a.deviceName).toBe("Eija");
  expect(a.deviceId).toEqual(expect.any(String));
  expect(a.listName).toBe("Trip");
});

it("builds a regular addTodo without a labelItemId", () => {
  const op = buildAddTodoOp("Trip", regularTodo);
  expect(op.type).toBe("addTodo");
  expect(op.todoId).toBe("t1");
  expect(op.payload).toEqual({ text: "Milk", checked: false, order: 3 });
  expect(op.labelItemId).toBeUndefined();
});

it("carries labelItemId when adding a label-todo", () => {
  const op = buildAddTodoOp("Trip", labelTodo);
  expect(op.labelItemId).toBe("li1");
  expect(op.payload).toEqual({ text: "Tent", checked: true, order: 4 });
});

it("builds setText", () => {
  expect(buildSetTextOp("Trip", "t1", "Eggs")).toMatchObject({
    type: "setText",
    todoId: "t1",
    payload: { text: "Eggs" },
  });
});

it("builds setChecked", () => {
  expect(buildSetCheckedOp("Trip", "t1", true)).toMatchObject({
    type: "setChecked",
    payload: { checked: true },
  });
});

it("builds move", () => {
  expect(buildMoveOp("Trip", "t1", 2.5)).toMatchObject({
    type: "move",
    payload: { order: 2.5 },
  });
});

it("builds deleteTodo", () => {
  expect(buildDeleteTodoOp("Trip", "t1")).toMatchObject({
    type: "deleteTodo",
    todoId: "t1",
  });
});

it("builds setNote", () => {
  expect(buildSetNoteOp("Trip", "t1", "note")).toMatchObject({
    type: "setNote",
    payload: { text: "note" },
  });
});
