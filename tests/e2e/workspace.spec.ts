import { expect, test } from "@playwright/test";

test("workspace navigation works on the exported site and survives refresh", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Good work deserves");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.getByRole("navigation", { name: "Workspace" }).getByRole("link", { name: "Activity" }).click();
  await expect(page).toHaveURL(/\/activity\/$/);
  await expect(page.getByRole("heading", { name: "Your activity." })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your activity." })).toBeVisible();
  await page.getByRole("link", { name: "Back to overview" }).click();
  await expect(page.getByRole("navigation").getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
});
