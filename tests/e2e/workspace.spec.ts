import { expect, test } from "@playwright/test";

for (const route of ["/", "/activity/"]) {
  test(`signed-out access at ${route} shows login after navigation and refresh`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
    await expect(page.getByLabel("Work email")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("autocomplete", "current-password");
    await expect(page.getByRole("button", { name: "Log in", exact: true })).toBeEnabled();
    await expect(page.getByRole("navigation", { name: "Workspace" })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
  });
}
