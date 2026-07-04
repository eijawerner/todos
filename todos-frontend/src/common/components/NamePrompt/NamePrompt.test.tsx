import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi, beforeEach } from "vitest";
import { NamePrompt } from "./NamePrompt";
import { getIdentity } from "../../identity";

beforeEach(() => {
  localStorage.clear();
});

it("saves the typed name and signals done", async () => {
  const onDone = vi.fn();
  render(<NamePrompt onDone={onDone} />);

  await userEvent.type(screen.getByLabelText("Your name"), "Eija");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(getIdentity().deviceName).toBe("Eija");
  expect(onDone).toHaveBeenCalled();
});

it("disables Save until a name is entered", async () => {
  render(<NamePrompt onDone={() => {}} />);

  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

  await userEvent.type(screen.getByLabelText("Your name"), "Eija");
  expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
});

it("assigns an auto-name and signals done when skipped", async () => {
  const onDone = vi.fn();
  render(<NamePrompt onDone={onDone} />);

  await userEvent.click(screen.getByRole("button", { name: "Skip" }));

  expect(getIdentity().deviceName).toMatch(/^device-/);
  expect(onDone).toHaveBeenCalled();
});
