import { it, expect } from "vitest";
import { applyOps } from "./overlay";
import { Op } from "./opTypes";
import { Todo } from "../common/types/Models";

const todo = (over: Partial<Todo> = {}): Todo => ({
  todoId: "t1",
  text: "Milk",
  checked: false,
  order: 1,
  ...over,
});

const op = (over: Partial<Op> & Pick<Op, "type">): Op =>
  ({
    opId: "o1",
    deviceId: "d",
    deviceName: "D",
    listName: "Trip",
    todoId: "t1",
    clientTs: 0,
    ...over,
  }) as Op;

it("returns server todos sorted by order then todoId", () => {
  const result = applyOps(
    [todo({ todoId: "b", order: 2 }), todo({ todoId: "a", order: 2 }), todo({ todoId: "c", order: 1 })],
    [],
  );
  expect(result.map((t) => t.todoId)).toEqual(["c", "a", "b"]);
});

it("overlays setText, setChecked, move and setNote", () => {
  const result = applyOps(
    [todo({ todoId: "t1" })],
    [
      op({ type: "setText", payload: { text: "Eggs" } }),
      op({ type: "setChecked", payload: { checked: true } }),
      op({ type: "move", payload: { order: 9 } }),
      op({ type: "setNote", payload: { text: "a dozen" } }),
    ],
  );
  expect(result[0]).toMatchObject({
    text: "Eggs",
    checked: true,
    order: 9,
    note: { text: "a dozen", links: [] },
  });
});

it("adds a new todo via addTodo", () => {
  const result = applyOps(
    [],
    [op({ type: "addTodo", todoId: "new", payload: { text: "Bread", checked: false, order: 3 } })],
  );
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({ todoId: "new", text: "Bread", order: 3 });
});

it("removes a todo via deleteTodo", () => {
  const result = applyOps([todo({ todoId: "t1" })], [op({ type: "deleteTodo" })]);
  expect(result).toEqual([]);
});

it("ignores ops targeting a todo that is not present", () => {
  const result = applyOps(
    [todo({ todoId: "t1" })],
    [op({ type: "setChecked", todoId: "gone", payload: { checked: true } })],
  );
  expect(result).toHaveLength(1);
  expect(result[0].checked).toBe(false);
});

it("does not let setText change a label-todo's text", () => {
  const result = applyOps(
    [todo({ todoId: "lt1", text: "Tent", labelItemId: "li1" })],
    [op({ type: "setText", todoId: "lt1", payload: { text: "hacked" } })],
  );
  expect(result[0].text).toBe("Tent");
});
