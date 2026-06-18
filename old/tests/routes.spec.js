import { expect, test } from "@playwright/test";

test("cutscene maker renders the scene-board layout", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Cutscene Maker/ }).click();

  await expect(page).toHaveURL(/\/cutscene-maker$/);

  // Scene board: cast / stage / director commands / timeline.
  await expect(page.getByRole("heading", { name: "Scene Cast" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Director Commands" })).toBeVisible();
  await expect(page.getByText("Scene Timeline", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "▶ Test Scene" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export Event" })).toBeVisible();

  // The script preview reflects the compiled scene.
  await expect(page.locator("textarea[readonly]").last()).toContainText("end");

  // Adding a director command pushes a block onto the timeline.
  const blocksBefore = await page.locator(".director-block").count();
  await page.getByRole("button", { name: "Emote", exact: true }).click();
  await expect(page.locator(".director-block")).toHaveCount(blocksBefore + 1);

  await expect(page.getByRole("button", { name: "Back to Launcher" })).toBeVisible();
});

test("animation & portrait studio renders its bespoke layout and tabs", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Animation & Portrait Maker/ }).click();

  await expect(page).toHaveURL(/\/animation-portrait-maker$/);

  // Studio layout: references rail, tools rail, canvas tabs, log.
  await expect(page.getByRole("heading", { name: "Character References" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "PixelLab Tools" })).toBeVisible();
  await expect(page.getByText("Studio Log", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Base Portrait", exact: true })).toBeVisible();

  // Godly Hand tab hosts the animation builder; New animation adds a slot.
  await page.getByRole("button", { name: "Godly Hand", exact: true }).click();
  await page.getByRole("button", { name: "New animation", exact: true }).click();
  await expect(page.getByText(/Animation_2/).first()).toBeVisible();

  await expect(page.getByRole("button", { name: "Back to Launcher" })).toBeVisible();
});
