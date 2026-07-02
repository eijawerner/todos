import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LabelManagementDialog } from "./LabelManagementDialog";
import * as todoApi from "../../../../api/todoApi";

vi.mock("../../../../api/todoApi");

const mocked = vi.mocked(todoApi);

function renderDialog(listName: string | null = "Trip") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  render(
    <QueryClientProvider client={queryClient}>
      <LabelManagementDialog
        isVisible={true}
        onClose={() => {}}
        listName={listName}
      />
    </QueryClientProvider>,
  );
  return { invalidateSpy };
}

function invalidatedTodosQueries(invalidateSpy: ReturnType<typeof vi.spyOn>) {
  return invalidateSpy.mock.calls.some(
    ([filters]: any[]) =>
      Array.isArray(filters?.queryKey) && filters?.queryKey[0] === "todos",
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  mocked.fetchLabels.mockResolvedValue([
    { labelId: "l1", name: "Packing", itemCount: 2 },
  ]);
  mocked.fetchLabelItems.mockResolvedValue([]);
  mocked.deleteLabel.mockResolvedValue(undefined);
});

it("lists labels with their item counts", async () => {
  renderDialog();

  expect(await screen.findByText("Packing")).toBeInTheDocument();
  expect(screen.getByText("2 items")).toBeInTheDocument();
});

it("imports selected labels into the current list", async () => {
  mocked.importLabelToList.mockResolvedValue([
    { todoId: "t1", text: "Socks", checked: false, order: 1, labelItemId: "li1" },
  ]);
  const { invalidateSpy } = renderDialog();

  const packingCheckbox = await screen.findByRole("checkbox", {
    name: "Select Packing for import",
  });
  const importButton = screen.getByRole("button", { name: "Import" });
  expect(importButton).toBeDisabled(); // nothing selected yet

  await userEvent.click(packingCheckbox);
  expect(importButton).toBeEnabled();
  await userEvent.click(importButton);

  await waitFor(() =>
    expect(mocked.importLabelToList).toHaveBeenCalledWith("Trip", "l1"),
  );
  expect(await screen.findByText("Added 1 item to list")).toBeInTheDocument();
  expect(invalidatedTodosQueries(invalidateSpy)).toBe(true);
});

it("disables the import checkbox for labels without items", async () => {
  mocked.fetchLabels.mockResolvedValue([
    { labelId: "l1", name: "Packing", itemCount: 2 },
    { labelId: "l2", name: "Empty", itemCount: 0 },
  ]);
  renderDialog();

  await screen.findByText("Empty");
  expect(
    screen.getByRole("checkbox", { name: "Select Empty for import" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("checkbox", { name: "Select Packing for import" }),
  ).toBeEnabled();
});

it("hides the import controls when no list is selected", async () => {
  renderDialog(null);

  await screen.findByText("Packing");
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Import" })).not.toBeInTheDocument();
});

// Regression test: labels import sequentially inside one mutation, so a later
// failure can leave earlier labels' items created server-side. The list must
// refresh even then (handled via onSettled).
it("refreshes the todo list even when an import partially fails", async () => {
  mocked.fetchLabels.mockResolvedValue([
    { labelId: "l1", name: "Packing", itemCount: 2 },
    { labelId: "l2", name: "Food", itemCount: 1 },
  ]);
  mocked.importLabelToList.mockImplementation(async (_listName, labelId) => {
    if (labelId === "l1") {
      return [
        { todoId: "t1", text: "Socks", checked: false, order: 1, labelItemId: "li1" },
      ];
    }
    throw new Error("network down");
  });
  const { invalidateSpy } = renderDialog();

  await userEvent.click(
    await screen.findByRole("checkbox", { name: "Select Packing for import" }),
  );
  await userEvent.click(
    screen.getByRole("checkbox", { name: "Select Food for import" }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Import" }));

  await waitFor(() => expect(mocked.importLabelToList).toHaveBeenCalledTimes(2));
  expect(await screen.findByText("Failed to import label items")).toBeInTheDocument();
  expect(invalidatedTodosQueries(invalidateSpy)).toBe(true);
});

it("creates a label and refreshes the label list", async () => {
  mocked.createLabel.mockResolvedValue({ labelId: "l2", name: "Trips", itemCount: 0 });
  const { invalidateSpy } = renderDialog();

  await userEvent.type(
    await screen.findByPlaceholderText("New label name..."),
    "Trips",
  );
  await userEvent.click(screen.getByRole("button", { name: "Create" }));

  await waitFor(() => expect(mocked.createLabel).toHaveBeenCalledWith("Trips"));
  await waitFor(() =>
    expect(
      invalidateSpy.mock.calls.some(([filters]) => filters?.queryKey?.[0] === "labels"),
    ).toBe(true),
  );
});

it("opens a label and adds an item", async () => {
  mocked.fetchLabelItems.mockResolvedValue([{ itemId: "i1", text: "Socks" }]);
  mocked.addLabelItem.mockResolvedValue({ itemId: "i2", text: "Hat" });
  renderDialog();

  await userEvent.click(await screen.findByText("Packing"));

  expect(await screen.findByText("Socks")).toBeInTheDocument();

  await userEvent.type(screen.getByPlaceholderText("New item..."), "Hat");
  await userEvent.click(screen.getByRole("button", { name: "Add" }));

  await waitFor(() => expect(mocked.addLabelItem).toHaveBeenCalledWith("l1", "Hat"));
});

it("edits an item by clicking its text", async () => {
  mocked.fetchLabelItems.mockResolvedValue([{ itemId: "i1", text: "Socks" }]);
  mocked.editLabelItem.mockResolvedValue({ itemId: "i1", text: "Wool socks" });
  renderDialog();

  await userEvent.click(await screen.findByText("Packing"));
  await userEvent.click(await screen.findByText("Socks"));

  const editInput = screen.getByDisplayValue("Socks");
  await userEvent.clear(editInput);
  await userEvent.type(editInput, "Wool socks{Enter}");

  await waitFor(() =>
    expect(mocked.editLabelItem).toHaveBeenCalledWith("l1", "i1", "Wool socks"),
  );
});

it("deletes an item from a label", async () => {
  mocked.fetchLabelItems.mockResolvedValue([{ itemId: "i1", text: "Socks" }]);
  mocked.deleteLabelItem.mockResolvedValue(undefined);
  renderDialog();

  await userEvent.click(await screen.findByText("Packing"));
  const itemRow = (await screen.findByText("Socks")).closest("div")!;
  await userEvent.click(within(itemRow).getByRole("button"));

  await waitFor(() => expect(mocked.deleteLabelItem).toHaveBeenCalledWith("l1", "i1"));
});

it("returns to the label list from the back button", async () => {
  renderDialog();

  await userEvent.click(await screen.findByText("Packing"));
  await screen.findByText(/no items yet/i);

  await userEvent.click(screen.getByText("All labels"));

  expect(await screen.findByText("2 items")).toBeInTheDocument();
});

// BUG: deleting a label cascades to its LabelTodos on the server, but only
// the ["labels"] query is invalidated. An open todo list keeps showing rows
// that no longer exist ("ghost rows") until a manual sync.
it("asks for confirmation before deleting a label and warns about affected lists", async () => {
  renderDialog();

  await screen.findByText("Packing");
  await userEvent.click(screen.getByRole("button", { name: "Delete label Packing" }));

  expect(
    screen.getByText(/removed from every todo list where this label has been imported/i),
  ).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(mocked.deleteLabel).not.toHaveBeenCalled();
  expect(await screen.findByText("2 items")).toBeInTheDocument(); // back on the list
});

it("invalidates todos queries after deleting a label so open lists drop its todos", async () => {
  const { invalidateSpy } = renderDialog();

  await screen.findByText("Packing");
  await userEvent.click(screen.getByRole("button", { name: "Delete label Packing" }));
  await userEvent.click(screen.getByRole("button", { name: "Delete label" }));
  await waitFor(() => expect(mocked.deleteLabel).toHaveBeenCalledWith("l1"));

  const invalidatedTodos = invalidateSpy.mock.calls.some(
    ([filters]) =>
      Array.isArray(filters?.queryKey) && filters?.queryKey[0] === "todos",
  );
  expect(invalidatedTodos).toBe(true);
});

// BUG: only the create-label mutation has error UI. A failed delete is
// completely silent - the label just stays and nothing tells the user why.
it("shows an error message when deleting a label fails", async () => {
  mocked.deleteLabel.mockRejectedValue(new Error("network down"));
  renderDialog();

  await screen.findByText("Packing");
  await userEvent.click(screen.getByRole("button", { name: "Delete label Packing" }));
  await userEvent.click(screen.getByRole("button", { name: "Delete label" }));
  await waitFor(() => expect(mocked.deleteLabel).toHaveBeenCalled());

  expect(await screen.findByText(/fail|error/i)).toBeInTheDocument();
});

// BUG: the backend responds 409 with a specific message for duplicate names
// (and list creation already surfaces its 409 specifically), but here the
// user just sees the generic "Failed to create label".
it("tells the user when the label name is already taken", async () => {
  const conflict = Object.assign(new Error("Request failed with status code 409"), {
    isAxiosError: true,
    response: {
      status: 409,
      data: { error: "A label with this name already exists" },
    },
  });
  mocked.createLabel.mockRejectedValue(conflict);
  renderDialog();

  await userEvent.type(
    await screen.findByPlaceholderText("New label name..."),
    "Packing",
  );
  await userEvent.click(screen.getByRole("button", { name: "Create" }));
  await waitFor(() => expect(mocked.createLabel).toHaveBeenCalled());

  expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
});
