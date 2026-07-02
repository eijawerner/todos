import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi } from "vitest";
import { TodoRow } from "./TodoRow";
import { Todo } from "../../../../../../common/types/Models";

const regularTodo: Todo = { todoId: "t1", text: "Milk", checked: false, order: 1 };
const labelTodo: Todo = {
  todoId: "lt1",
  text: "Tent",
  checked: false,
  order: 2,
  labelItemId: "li1",
};

function renderRow(todo: Todo = regularTodo) {
  const props = {
    todo,
    deleteTodo: vi.fn(),
    checkTodo: vi.fn(),
    saveTodo: vi.fn(),
    addNewItem: vi.fn(),
    viewNote: vi.fn(),
  };
  render(<TodoRow {...props} />);
  return props;
}

it("toggles the todo when the checkbox is clicked", async () => {
  const { checkTodo } = renderRow();

  await userEvent.click(screen.getByRole("checkbox"));

  expect(checkTodo).toHaveBeenCalledWith(regularTodo, true);
});

it("unchecks a checked todo", async () => {
  const checkedTodo = { ...regularTodo, checked: true };
  const { checkTodo } = renderRow(checkedTodo);

  await userEvent.click(screen.getByRole("checkbox"));

  expect(checkTodo).toHaveBeenCalledWith(checkedTodo, false);
});

it("saves edited text after the debounce delay", async () => {
  const { saveTodo } = renderRow();

  await userEvent.type(screen.getByRole("textbox"), "shake");

  await waitFor(
    () => expect(saveTodo).toHaveBeenCalledWith({ ...regularTodo, text: "Milkshake" }),
    { timeout: 2000 },
  );
  expect(saveTodo).toHaveBeenCalledTimes(1); // debounced, not once per keystroke
});

it("adds a new row on Enter", async () => {
  const { addNewItem } = renderRow();

  await userEvent.type(screen.getByRole("textbox"), "{Enter}");

  expect(addNewItem).toHaveBeenCalled();
});

it("opens the note from the pencil button", async () => {
  const { viewNote } = renderRow();

  // Buttons in a standalone row: [note, menu]
  await userEvent.click(screen.getAllByRole("button")[0]);

  expect(viewNote).toHaveBeenCalledWith("t1");
});

it("deletes via the row menu", async () => {
  const { deleteTodo } = renderRow();

  const buttons = screen.getAllByRole("button");
  await userEvent.click(buttons[buttons.length - 1]);
  await userEvent.click(await screen.findByText("Delete"));

  expect(deleteTodo).toHaveBeenCalledWith("t1");
});

it("renders label-todos as read-only text and never saves them", async () => {
  const { saveTodo } = renderRow(labelTodo);

  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(screen.getByText("Tent")).toBeInTheDocument();
  await new Promise((resolve) => setTimeout(resolve, 600)); // past the debounce
  expect(saveTodo).not.toHaveBeenCalled();
});
