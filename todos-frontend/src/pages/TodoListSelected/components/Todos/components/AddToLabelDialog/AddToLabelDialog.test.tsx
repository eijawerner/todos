import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AddToLabelDialog } from "./AddToLabelDialog";
import * as todoApi from "../../../../../../api/todoApi";

vi.mock("../../../../../../api/todoApi");
const mocked = vi.mocked(todoApi);

function renderDialog(onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <AddToLabelDialog todoId="t1" todoText="Tent" listName="Trip" onClose={onClose} />
    </QueryClientProvider>,
  );
  return { onClose };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocked.fetchLabels.mockResolvedValue([
    { labelId: "l1", name: "Packing", itemCount: 2 },
    { labelId: "l2", name: "Groceries", itemCount: 0 },
  ]);
  mocked.addTodoToLabel.mockResolvedValue({
    todoId: "t1",
    text: "Tent",
    checked: false,
    order: 1,
    labelItemId: "li1",
  });
});

it("shows which todo is being added to a label", async () => {
  renderDialog();
  expect(
    await screen.findByText('"Tent" will become an item in the label you choose.'),
  ).toBeInTheDocument();
});

it("lists existing labels and adds the todo into the chosen one", async () => {
  const { onClose } = renderDialog();

  await userEvent.click(await screen.findByRole("button", { name: "Packing" }));

  await waitFor(() => expect(mocked.addTodoToLabel).toHaveBeenCalledWith("t1", "l1"));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
});

it("shows a hint when there are no labels yet", async () => {
  mocked.fetchLabels.mockResolvedValue([]);
  renderDialog();

  expect(await screen.findByText(/No labels yet/)).toBeInTheDocument();
});
