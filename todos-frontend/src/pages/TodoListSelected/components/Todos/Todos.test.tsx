import React from "react";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Todos } from "./Todos";
import * as todoApi from "../../../../api/todoApi";

vi.mock("../../../../api/todoApi");

const mocked = vi.mocked(todoApi);

const regularTodo = { todoId: "t1", text: "Milk", checked: false, order: 1 };
const labelTodo = {
  todoId: "lt1",
  text: "Tent",
  checked: false,
  order: 2,
  labelItemId: "li1",
};

function renderTodos() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <Todos listName="Trip" />
    </QueryClientProvider>,
  );
}

// The row menu button is the last button in a row (drag handle, note, menu).
async function deleteViaRowMenu(row: HTMLElement) {
  const buttons = within(row).getAllByRole("button");
  await userEvent.click(buttons[buttons.length - 1]);
  await userEvent.click(await screen.findByText("Delete"));
}

// The checkbox also carries value={todo.text}, so ByDisplayValue is ambiguous -
// find the row text input by value instead.
async function findTextInput(value: string) {
  return await waitFor(() => {
    const input = screen
      .getAllByRole("textbox")
      .find((el) => (el as HTMLInputElement).value === value);
    if (!input) throw new Error(`no text input with value ${value}`);
    return input;
  });
}

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", { value, configurable: true });
  fireEvent(window, new Event(value ? "online" : "offline"));
}

beforeEach(() => {
  vi.resetAllMocks();
  setOnline(true);
  mocked.deleteTodo.mockResolvedValue(undefined);
  mocked.createTodo.mockResolvedValue({ ...regularTodo });
});

it("renders label-todos read-only and regular todos as editable inputs", async () => {
  mocked.fetchTodos.mockResolvedValue([regularTodo, labelTodo]);

  renderTodos();

  await screen.findByText("Tent");
  const textInputs = screen.getAllByRole("textbox");
  expect(textInputs).toHaveLength(1); // only Milk is editable
  expect(textInputs[0]).toHaveValue("Milk");
});

// Restoring a label-todo must keep its link to the source label item.
// A plain restore (no labelItemId) would create a regular Todo: the row
// becomes editable, stops following label item edits, and re-importing
// the label duplicates the item.
it("restores a deleted label-todo with its label link intact when undoing", async () => {
  mocked.fetchTodos.mockResolvedValue([labelTodo]);

  renderTodos();

  await screen.findByText("Tent");
  await deleteViaRowMenu(screen.getByRole("listitem"));
  await waitFor(() => expect(mocked.deleteTodo).toHaveBeenCalled());
  expect(mocked.deleteTodo.mock.calls[0][0]).toBe("lt1");

  await userEvent.click(screen.getByRole("button", { name: "Undo" }));

  await waitFor(() => expect(mocked.createTodo).toHaveBeenCalled());
  const [, restoredTodo] = mocked.createTodo.mock.calls[0];
  expect(restoredTodo.labelItemId).toBe("li1");
});

it("persists the new order of every todo when one is checked", async () => {
  const bread = { todoId: "t2", text: "Bread", checked: false, order: 2 };
  mocked.fetchTodos.mockResolvedValue([regularTodo, bread]);
  mocked.updateTodo.mockResolvedValue({ ...regularTodo, checked: true });

  renderTodos();

  await findTextInput("Milk");
  await userEvent.click(screen.getAllByRole("checkbox")[0]);

  await waitFor(() => expect(mocked.updateTodo).toHaveBeenCalledTimes(2));
  const updated = mocked.updateTodo.mock.calls.map((call) => call[0]);
  // Checked todos move to the front and all orders are re-indexed
  expect(updated.find((t) => t.todoId === "t1")).toMatchObject({ checked: true, order: 0 });
  expect(updated.find((t) => t.todoId === "t2")).toMatchObject({ checked: false, order: 1 });
});

it("shows an error and reverts the checkbox when persisting fails", async () => {
  mocked.fetchTodos.mockResolvedValue([regularTodo]);
  mocked.updateTodo.mockRejectedValue(new Error("network down"));

  renderTodos();

  await findTextInput("Milk");
  await userEvent.click(screen.getByRole("checkbox"));

  expect(await screen.findByText("Failed to update task")).toBeInTheDocument();
  expect(screen.getByRole("checkbox")).not.toBeChecked();
});

it("creates the todo immediately when adding a task online", async () => {
  mocked.fetchTodos.mockResolvedValue([regularTodo]);

  renderTodos();

  await findTextInput("Milk");
  await userEvent.click(screen.getByRole("button", { name: "New task" }));

  await waitFor(() => expect(mocked.createTodo).toHaveBeenCalled());
  const [listName, newTodo] = mocked.createTodo.mock.calls[0];
  expect(listName).toBe("Trip");
  expect(newTodo).toMatchObject({ text: "", checked: false, order: 2 });
});

it("restores a regular todo unchanged when undoing its deletion", async () => {
  mocked.fetchTodos.mockResolvedValue([regularTodo]);

  renderTodos();

  await findTextInput("Milk");
  const milkRow = (await findTextInput("Milk")).closest("li")!;
  await deleteViaRowMenu(milkRow as HTMLElement);
  await waitFor(() => expect(mocked.deleteTodo).toHaveBeenCalled());

  await userEvent.click(screen.getByRole("button", { name: "Undo" }));

  await waitFor(() => expect(mocked.createTodo).toHaveBeenCalled());
  const [, restoredTodo] = mocked.createTodo.mock.calls[0];
  expect(restoredTodo).toMatchObject({ todoId: "t1", text: "Milk" });
  expect(restoredTodo.labelItemId).toBeUndefined();
});

it("opens the note dialog from the pencil button", async () => {
  mocked.fetchTodos.mockResolvedValue([regularTodo]);
  mocked.fetchTodoNote.mockResolvedValue({ text: "2% fat", links: [] });

  renderTodos();

  await findTextInput("Milk");
  // Row buttons: [drag handle, note, menu]
  const buttons = within(screen.getByRole("listitem")).getAllByRole("button");
  await userEvent.click(buttons[buttons.length - 2]);

  expect(await screen.findByText("Notes")).toBeInTheDocument();
  expect(screen.getByDisplayValue("2% fat")).toBeInTheDocument();
});

it("deletes a row when swiped left", async () => {
  mocked.fetchTodos.mockResolvedValue([regularTodo]);

  renderTodos();

  await findTextInput("Milk");
  const swipeable = screen
    .getByRole("listitem")
    .querySelector('[style*="translateX"]')!;
  fireEvent.touchStart(swipeable, { touches: [{ clientX: 300, clientY: 10 }] });
  fireEvent.touchMove(swipeable, { touches: [{ clientX: 100, clientY: 10 }] });
  fireEvent.touchEnd(swipeable);

  await waitFor(() => expect(mocked.deleteTodo).toHaveBeenCalled());
  expect(mocked.deleteTodo.mock.calls[0][0]).toBe("t1");
});

// Regression test: an offline delete used to replace the whole pending-changes
// queue instead of appending, wiping any adds/edits queued earlier.
it("replays ALL queued offline changes when back online, not just the delete", async () => {
  mocked.fetchTodos.mockResolvedValue([regularTodo]);

  renderTodos();

  await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue("Milk"));
  setOnline(false);

  // Queue an "add" while offline...
  await userEvent.click(screen.getByRole("button", { name: "New task" }));
  expect(mocked.createTodo).not.toHaveBeenCalled();

  // ...then queue a "delete" of the Milk todo while still offline.
  const milkRow = screen
    .getAllByRole("textbox")
    .find((input) => (input as HTMLInputElement).value === "Milk")!
    .closest("li")!;
  await deleteViaRowMenu(milkRow as HTMLElement);
  expect(mocked.deleteTodo).not.toHaveBeenCalled();

  setOnline(true);

  await waitFor(() => expect(mocked.deleteTodo).toHaveBeenCalled());
  expect(mocked.deleteTodo.mock.calls[0][0]).toBe("t1");
  // The queued add must also be replayed.
  await waitFor(() => expect(mocked.createTodo).toHaveBeenCalled());
});
