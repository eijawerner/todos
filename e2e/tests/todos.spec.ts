import { test, expect, Page } from "@playwright/test";

const TEST_LIST_PREFIX = "test-";

function uniqueListName() {
  return `${TEST_LIST_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

let listName: string;

test.describe("Todo CRUD + undo delete", () => {
  test.describe.configure({ mode: "serial" });

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    listName = uniqueListName();
    await page.goto("/");

    // Dismiss the NamePrompt dialog that appears on first load
    const skipButton = page.getByRole("button", { name: "Skip" });
    if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipButton.click();
    }
  });

  test.afterAll(async () => {
    // Clean up: delete the test list
    try {
      // Select the test list
      const select = page.getByRole("combobox", { name: "todolist" });
      await select.selectOption(listName);

      // Click the delete button next to the selector
      await page
        .getByRole("button", { name: "Delete selected list" })
        .click();

      // Confirm deletion in the dialog
      await page.getByRole("button", { name: "Delete list" }).click();

      // Wait for list to be deleted (selector should no longer have our list)
      await expect(select).not.toContainText(listName, { timeout: 5000 });
    } catch {
      // Best-effort cleanup
    }
    await page.close();
  });

  test("create a todo list", async () => {
    await page.getByRole("button", { name: "New list" }).click();

    // Fill in the list name in the dialog
    await page.getByLabel("List name").fill(listName);
    await page.getByRole("button", { name: "Add list" }).click();

    // The new list should now be selected in the dropdown
    const select = page.getByRole("combobox", { name: "todolist" });
    await expect(select).toHaveValue(listName, { timeout: 5000 });
  });

  test("add a todo", async () => {
    await page.getByRole("button", { name: "New task" }).click();

    // A new empty textbox should appear — it's the last one
    const textboxes = page.getByRole("textbox");
    const newInput = textboxes.last();
    await expect(newInput).toBeVisible();
    await newInput.fill("Buy milk");

    await expect(newInput).toHaveValue("Buy milk");
  });

  test("edit a todo", async () => {
    const input = page.getByRole("textbox").last();
    await input.clear();
    await input.fill("Buy oat milk");

    // Wait for debounce (500ms) + a bit of margin
    await page.waitForTimeout(800);

    // Reload and verify the edit persisted
    await page.reload();
    await expect(
      page.getByRole("combobox", { name: "todolist" })
    ).toBeVisible();

    // Select the test list again after reload (app auto-selects first alphabetically)
    await page.getByRole("combobox", { name: "todolist" }).selectOption(listName);

    const editedInput = page.getByRole("textbox").last();
    await expect(editedInput).toHaveValue("Buy oat milk", { timeout: 5000 });
  });

  test("check and uncheck a todo", async () => {
    const checkbox = page.getByRole("checkbox").first();
    await expect(checkbox).not.toBeChecked();

    await checkbox.check();
    await expect(checkbox).toBeChecked();

    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });

  test("delete a todo via menu and undo", async () => {
    // Verify the todo text before deletion
    const input = page.getByRole("textbox").last();
    await expect(input).toHaveValue("Buy oat milk");

    // Open the "..." menu — it's the last button in the todo row area
    // The menu button has no accessible name, so we find it by its position:
    // each todo row has icon buttons, the last one is the ellipsis menu
    const menuButtons = page.locator("button").filter({ has: page.locator("svg") });
    // Click the last svg-containing button that is inside the todo list area
    // More precise: find the row wrapper that contains our input, then click its menu button
    const todoRow = input.locator("..").locator("..");
    const menuButton = todoRow.locator("button").last();
    await menuButton.click();

    // Click Delete from the dropdown menu
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    // Verify the "Task deleted" banner appears with Undo
    await expect(page.getByText("Task deleted")).toBeVisible();
    await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();

    // Click Undo
    await page.getByRole("button", { name: "Undo" }).click();

    // Verify the todo reappears
    const restoredInput = page.getByRole("textbox").last();
    await expect(restoredInput).toHaveValue("Buy oat milk", { timeout: 5000 });
  });

  test("delete a todo via menu and let it expire", async () => {
    // First add another task so we have something to delete
    await page.getByRole("button", { name: "New task" }).click();
    const newInput = page.getByRole("textbox").last();
    await expect(newInput).toBeVisible();
    await newInput.fill("Temporary task");
    // Wait for debounce
    await page.waitForTimeout(800);

    // Count textboxes before
    const countBefore = await page.getByRole("textbox").count();

    // Open menu and delete
    const todoRow = newInput.locator("..").locator("..");
    const menuButton = todoRow.locator("button").last();
    await menuButton.click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    // Verify banner appears
    await expect(page.getByText("Task deleted")).toBeVisible();

    // Wait for the undo timeout to expire (5000ms + margin)
    await expect(page.getByText("Task deleted")).toBeHidden({ timeout: 7000 });

    // Verify the todo is gone
    const countAfter = await page.getByRole("textbox").count();
    expect(countAfter).toBe(countBefore - 1);
  });
});
