import React from "react";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Todos } from "./Todos";
import * as todoApi from "../../../../api/todoApi";
import * as opsApi from "../../../../api/opsApi";
import { resetOutboxForTests } from "../../../../sync/outbox";
import { Op, OpResult } from "../../../../sync/opTypes";

vi.mock("../../../../api/todoApi");
vi.mock("../../../../api/opsApi");

const mockedTodoApi = vi.mocked(todoApi);
const mockedOpsApi = vi.mocked(opsApi);

const regularTodo = { todoId: "t1", text: "Milk", checked: false, order: 1 };
const labelTodo = {
  todoId: "lt1",
  text: "Tent",
  checked: false,
  order: 2,
  labelItemId: "li1",
};

function renderTodos(listName = "Trip") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Todos listName={listName} />
    </QueryClientProvider>,
  );
}

async function deleteViaRowMenu(row: HTMLElement) {
  const buttons = within(row).getAllByRole("button");
  await userEvent.click(buttons[buttons.length - 1]);
  await userEvent.click(await screen.findByText("Delete"));
}

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

// Every op the client sends across all flushes this test.
const sentOps = (): Op[] => mockedOpsApi.postOps.mock.calls.flatMap((c) => c[0]);

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  resetOutboxForTests();
  setOnline(true);
  // Default: the backend applies every op.
  mockedOpsApi.postOps.mockImplementation(async (ops: Op[]): Promise<OpResult[]> =>
    ops.map((o) => ({ opId: o.opId, status: "applied" })),
  );
});

it("renders label-todos read-only and regular todos as editable inputs", async () => {
  mockedTodoApi.fetchTodos.mockResolvedValue([regularTodo, labelTodo]);

  renderTodos();

  await screen.findByText("Tent");
  const textInputs = screen.getAllByRole("textbox");
  expect(textInputs).toHaveLength(1); // only Milk is editable
  expect(textInputs[0]).toHaveValue("Milk");
});

it("shows a newly added task immediately from the overlay", async () => {
  setOnline(false); // keep the op pending so the overlay drives the row
  mockedTodoApi.fetchTodos.mockResolvedValue([regularTodo]);

  renderTodos();
  await findTextInput("Milk");

  await userEvent.click(screen.getByRole("button", { name: "New task" }));

  await waitFor(() => expect(screen.getAllByRole("textbox")).toHaveLength(2));
});

it("enqueues an addTodo op when adding a task online", async () => {
  mockedTodoApi.fetchTodos.mockResolvedValue([regularTodo]);

  renderTodos();
  await findTextInput("Milk");
  await userEvent.click(screen.getByRole("button", { name: "New task" }));

  await waitFor(() => expect(sentOps().some((o) => o.type === "addTodo")).toBe(true));
});

it("sends setChecked and one move in a single batch when checking a todo", async () => {
  const bread = { todoId: "t2", text: "Bread", checked: false, order: 2 };
  mockedTodoApi.fetchTodos.mockResolvedValue([regularTodo, bread]);

  renderTodos();
  await findTextInput("Milk");
  await userEvent.click(screen.getAllByRole("checkbox")[0]);

  await waitFor(() => expect(mockedOpsApi.postOps).toHaveBeenCalled());
  const batch = mockedOpsApi.postOps.mock.calls[0][0];
  expect(batch.map((o) => o.type)).toEqual(["setChecked", "move"]);
  expect(batch[0].todoId).toBe("t1");
});

it("sends a deleteTodo op when deleting a todo", async () => {
  mockedTodoApi.fetchTodos.mockResolvedValue([regularTodo]);

  renderTodos();
  const milkRow = (await findTextInput("Milk")).closest("li")!;
  await deleteViaRowMenu(milkRow as HTMLElement);

  await waitFor(() =>
    expect(sentOps().some((o) => o.type === "deleteTodo" && o.todoId === "t1")).toBe(true),
  );
});

it("undoing before the delete flushes cancels it — the backend never sees the delete", async () => {
  setOnline(false); // delete stays pending
  mockedTodoApi.fetchTodos.mockResolvedValue([regularTodo]);

  renderTodos();
  const milkRow = (await findTextInput("Milk")).closest("li")!;
  await deleteViaRowMenu(milkRow as HTMLElement);

  // Overlay removed Milk; the undo banner is up.
  await userEvent.click(await screen.findByRole("button", { name: "Undo" }));

  // Milk is back, and going online flushes nothing about the delete.
  await findTextInput("Milk");
  setOnline(true);
  await waitFor(() => expect(mockedOpsApi.postOps).not.toHaveBeenCalledWith(
    expect.arrayContaining([expect.objectContaining({ type: "deleteTodo" })]),
  ));
});

it("restores a deleted label-todo with its label link when undoing after it flushed", async () => {
  mockedTodoApi.fetchTodos.mockResolvedValue([labelTodo]);

  renderTodos();
  await screen.findByText("Tent");
  await deleteViaRowMenu(screen.getByRole("listitem"));

  // Wait until the delete has actually flushed to the backend.
  await waitFor(() => expect(sentOps().some((o) => o.type === "deleteTodo")).toBe(true));

  await userEvent.click(screen.getByRole("button", { name: "Undo" }));

  await waitFor(() => {
    const add = sentOps().find((o) => o.type === "addTodo");
    expect(add).toBeDefined();
    expect((add as { labelItemId?: string }).labelItemId).toBe("li1");
  });
});

it("shows a banner when the backend rejects an op", async () => {
  mockedTodoApi.fetchTodos.mockResolvedValue([regularTodo]);
  mockedOpsApi.postOps.mockImplementation(async (ops: Op[]): Promise<OpResult[]> =>
    ops.map((o) => ({
      opId: o.opId,
      status: o.type === "setChecked" ? "rejected" : "applied",
      error: "bad op",
    })),
  );

  renderTodos();
  await findTextInput("Milk");
  await userEvent.click(screen.getByRole("checkbox"));

  expect(await screen.findByText("Some changes couldn't be saved")).toBeInTheDocument();
});

it("keeps the change (no revert, no banner) on a transient network error", async () => {
  mockedTodoApi.fetchTodos.mockResolvedValue([regularTodo]);
  mockedOpsApi.postOps.mockRejectedValue(new Error("network down"));

  renderTodos();
  await findTextInput("Milk");
  await userEvent.click(screen.getByRole("checkbox"));

  // The overlay keeps the pending setChecked, so the box stays checked...
  await waitFor(() => expect(screen.getByRole("checkbox")).toBeChecked());
  // ...and a transient failure is retried silently, not surfaced.
  expect(screen.queryByText("Some changes couldn't be saved")).not.toBeInTheDocument();
});

it("keeps pending ops across a remount (offline persistence)", async () => {
  setOnline(false);
  mockedTodoApi.fetchTodos.mockResolvedValue([regularTodo]);

  const { unmount } = renderTodos();
  await findTextInput("Milk");
  await userEvent.click(screen.getByRole("button", { name: "New task" }));
  await waitFor(() => expect(screen.getAllByRole("textbox")).toHaveLength(2));

  unmount();
  renderTodos();

  // The queued add is still there after remounting.
  await waitFor(() => expect(screen.getAllByRole("textbox")).toHaveLength(2));
});

it("switching lists renders the newly selected list", async () => {
  mockedTodoApi.fetchTodos.mockImplementation(async (name: string) =>
    name === "Trip"
      ? [regularTodo]
      : [{ todoId: "h1", text: "Water plants", checked: false, order: 1 }],
  );

  const { rerender } = renderTodos("Trip");
  await findTextInput("Milk");

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  rerender(
    <QueryClientProvider client={queryClient}>
      <Todos listName="Home" />
    </QueryClientProvider>,
  );

  await findTextInput("Water plants");
});

it("opens the note dialog from the overlay without a round trip", async () => {
  setOnline(false);
  mockedTodoApi.fetchTodos.mockResolvedValue([
    { ...regularTodo, note: { text: "2% fat", links: [] } },
  ]);

  renderTodos();
  await findTextInput("Milk");
  const buttons = within(screen.getByRole("listitem")).getAllByRole("button");
  await userEvent.click(buttons[buttons.length - 2]); // [drag, note, menu]

  expect(await screen.findByText("Notes")).toBeInTheDocument();
  expect(screen.getByDisplayValue("2% fat")).toBeInTheDocument();
});
