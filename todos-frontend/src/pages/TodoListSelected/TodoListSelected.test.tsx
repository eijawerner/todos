import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TodoListSelected } from "./TodoListSelected";
import * as todoApi from "../../api/todoApi";

vi.mock("../../api/todoApi");

const mocked = vi.mocked(todoApi);

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <TodoListSelected />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  mocked.fetchTodoLists.mockResolvedValue([{ name: "Zoo" }, { name: "Alpha" }]);
  mocked.fetchTodos.mockResolvedValue([]);
});

it("auto-selects the alphabetically first list and loads its todos", async () => {
  renderPage();

  await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("Alpha"));
  await waitFor(() => expect(mocked.fetchTodos).toHaveBeenCalledWith("Alpha"));
});

it("loads the todos of a list selected in the dropdown", async () => {
  renderPage();

  await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("Alpha"));
  await userEvent.selectOptions(screen.getByRole("combobox"), "Zoo");

  await waitFor(() => expect(mocked.fetchTodos).toHaveBeenCalledWith("Zoo"));
});

it("creates a new list and selects it", async () => {
  mocked.createTodoList.mockResolvedValue({ name: "Party" });
  renderPage();

  await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("Alpha"));
  // The refetch after creation should include the new list
  mocked.fetchTodoLists.mockResolvedValue([
    { name: "Zoo" },
    { name: "Alpha" },
    { name: "Party" },
  ]);

  await userEvent.click(screen.getByRole("button", { name: "New list" }));
  await userEvent.type(screen.getByLabelText("List name"), "Party");
  await userEvent.click(screen.getByRole("button", { name: "Add list" }));

  await waitFor(() => expect(mocked.createTodoList).toHaveBeenCalledWith("Party"));
  await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("Party"));
});

it("warns about duplicate names in the create form and blocks submit", async () => {
  renderPage();

  await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("Alpha"));
  await userEvent.click(screen.getByRole("button", { name: "New list" }));
  await userEvent.type(screen.getByLabelText("List name"), "alpha");

  expect(
    screen.getByText("A list with this name already exists"),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Add list" })).toBeDisabled();
  expect(mocked.createTodoList).not.toHaveBeenCalled();
});

it("shows the server error when creating a list fails", async () => {
  const conflict = Object.assign(new Error("Request failed with status code 409"), {
    isAxiosError: true,
    response: { status: 409, data: { error: "boom" } },
  });
  mocked.createTodoList.mockRejectedValue(conflict);
  renderPage();

  await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("Alpha"));
  await userEvent.click(screen.getByRole("button", { name: "New list" }));
  await userEvent.type(screen.getByLabelText("List name"), "Party");
  await userEvent.click(screen.getByRole("button", { name: "Add list" }));

  expect(
    await screen.findByText("Failed to create list: boom"),
  ).toBeInTheDocument();
});

it("deletes the selected list after confirmation", async () => {
  mocked.deleteTodoList.mockResolvedValue(undefined);
  renderPage();

  await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("Alpha"));
  await userEvent.click(screen.getByRole("button", { name: "delete" }));

  expect(
    screen.getByText("Are you sure you want to delete list Alpha?"),
  ).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Delete list" }));

  await waitFor(() => expect(mocked.deleteTodoList).toHaveBeenCalledWith("Alpha"));
});
