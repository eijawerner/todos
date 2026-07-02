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

// BUG (pre-existing, not from the labels work): handleDeleteTodo queues an
// offline delete with setChanges([...]) instead of appending, wiping any
// adds/edits queued earlier in the offline session.
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
