import { expect, test } from "@playwright/test";

test("schedule maker renders the day-planner layout from the launcher", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Pick your workbench" })).toBeVisible();
  await page.getByRole("button", { name: /Schedule Maker|Schedules/ }).click();

  await expect(page).toHaveURL(/\/schedule-maker$/);
  await expect(page.getByRole("heading", { name: "Day Planner" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Step Inspector" })).toBeVisible();
  await expect(page.getByText("Route Map", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Test Day" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Back to Launcher" })).toBeVisible();

  // Day key flows into the schedule entry export.
  await page.getByLabel("Day", { exact: true }).fill("spring_15");
  await expect(page.locator("textarea[readonly]").last()).toContainText("spring_15");
});

test("schedule steps can be added, edited, and reflected in the export", async ({ page }) => {
  await page.goto("/schedule-maker");

  const notes = page.locator(".planner-note");
  const initialCount = await notes.count();

  await page.getByRole("button", { name: "+ Add step" }).click();
  await expect(notes).toHaveCount(initialCount + 1);

  await page.getByLabel("Time", { exact: true }).first().fill("1300");
  await page.getByLabel("Location", { exact: true }).first().fill("Town");
  await page.getByLabel("X", { exact: true }).first().fill("15");
  await page.getByLabel("Y", { exact: true }).first().fill("20");

  await expect(page.locator("textarea[readonly]").filter({ hasText: "1300 Town 15 20" }).first()).toBeVisible();
});

test("schedule day simulator transport runs without crashing", async ({ page }) => {
  await page.goto("/schedule-maker");

  await page.getByRole("button", { name: "Test Day" }).click();
  await expect(page.getByText("Path status", { exact: true })).toBeVisible();

  const transport = page.locator(".planner__transport");
  for (const label of ["Step Forward", "Play", "Step Back", "Pause", "Restart", "Stop"]) {
    await transport.getByRole("button", { name: label, exact: true }).click();
  }

  await expect(page.getByRole("button", { name: "Test Day" })).toBeVisible();
});
