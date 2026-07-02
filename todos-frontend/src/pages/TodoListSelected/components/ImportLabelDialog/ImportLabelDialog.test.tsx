import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ImportLabelDialog } from "./ImportLabelDialog";
import * as todoApi from "../../../../api/todoApi";

vi.mock("../../../../api/todoApi");

const mocked = vi.mocked(todoApi);

function renderDialog() {
  const onImported = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ImportLabelDialog
        isVisible={true}
        listName="Trip"
        onClose={() => {}}
        onImported={onImported}
      />
    </QueryClientProvider>,
  );
  return { onImported };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocked.fetchLabels.mockResolvedValue([
    { labelId: "a", name: "Camping", itemCount: 2 },
    { labelId: "b", name: "Groceries", itemCount: 3 },
    { labelId: "empty", name: "Empty", itemCount: 0 },
  ]);
});

it("only offers labels that have items", async () => {
  renderDialog();

  expect(await screen.findByText("Camping")).toBeInTheDocument();
  expect(screen.getByText("Groceries")).toBeInTheDocument();
  expect(screen.queryByText("Empty")).not.toBeInTheDocument();
});

it("imports the selected label and reports how many items were added", async () => {
  mocked.importLabelToList.mockResolvedValue([
    { todoId: "t1", text: "Tent", checked: false, order: 1, labelItemId: "li1" },
  ]);
  const { onImported } = renderDialog();

  const campingRow = await screen.findByText("Camping");
  const importButton = screen.getByRole("button", { name: "Import" });
  expect(importButton).toBeDisabled(); // nothing selected yet

  await userEvent.click(campingRow);
  await userEvent.click(importButton);

  await waitFor(() =>
    expect(mocked.importLabelToList).toHaveBeenCalledWith("Trip", "a"),
  );
  expect(await screen.findByText("Added 1 item to list")).toBeInTheDocument();
  expect(onImported).toHaveBeenCalled();
});

it("tells the user when everything was already imported", async () => {
  mocked.importLabelToList.mockResolvedValue([]);
  renderDialog();

  await userEvent.click(await screen.findByText("Camping"));
  await userEvent.click(screen.getByRole("button", { name: "Import" }));

  expect(await screen.findByText("All items already in list")).toBeInTheDocument();
});

// Regression test: labels import sequentially inside one mutation, so a later
// failure can leave earlier labels' items created server-side. The list must
// refresh even then (handled via onSettled).
it("refreshes the list when an import partially fails", async () => {
  mocked.importLabelToList.mockImplementation(async (_listName, labelId) => {
    if (labelId === "a") {
      return [
        { todoId: "t1", text: "Tent", checked: false, order: 1, labelItemId: "li1" },
      ];
    }
    throw new Error("network down");
  });
  const { onImported } = renderDialog();

  await userEvent.click(await screen.findByText("Camping"));
  await userEvent.click(screen.getByText("Groceries"));
  await userEvent.click(screen.getByRole("button", { name: "Import" }));
  await waitFor(() => expect(mocked.importLabelToList).toHaveBeenCalledTimes(2));

  // Camping's items exist on the server now - the open list must reflect that.
  await waitFor(() => expect(onImported).toHaveBeenCalled());
});
