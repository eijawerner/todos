import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LabelManagementDialog } from "./LabelManagementDialog";
import * as todoApi from "../../../../api/todoApi";

vi.mock("../../../../api/todoApi");

const mocked = vi.mocked(todoApi);

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  render(
    <QueryClientProvider client={queryClient}>
      <LabelManagementDialog isVisible={true} onClose={() => {}} />
    </QueryClientProvider>,
  );
  return { invalidateSpy };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocked.fetchLabels.mockResolvedValue([
    { labelId: "l1", name: "Packing", itemCount: 2 },
  ]);
  mocked.deleteLabel.mockResolvedValue(undefined);
});

it("lists labels with their item counts", async () => {
  renderDialog();

  expect(await screen.findByText("Packing")).toBeInTheDocument();
  expect(screen.getByText("2 items")).toBeInTheDocument();
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

it("drills into a label and adds an item", async () => {
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
  mocked.fetchLabelItems.mockResolvedValue([]);
  renderDialog();

  await userEvent.click(await screen.findByText("Packing"));
  await screen.findByText(/no items yet/i);

  await userEvent.click(screen.getByText("All labels"));

  expect(await screen.findByText("2 items")).toBeInTheDocument();
});

// BUG: deleting a label cascades to its LabelTodos on the server, but only
// the ["labels"] query is invalidated. An open todo list keeps showing rows
// that no longer exist ("ghost rows") until a manual sync.
it("invalidates todos queries after deleting a label so open lists drop its todos", async () => {
  const { invalidateSpy } = renderDialog();

  const row = (await screen.findByText("Packing")).closest("div")!;
  await userEvent.click(within(row).getByRole("button"));
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

  const row = (await screen.findByText("Packing")).closest("div")!;
  await userEvent.click(within(row).getByRole("button"));
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
