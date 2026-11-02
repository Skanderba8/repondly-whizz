import { expect, test } from "@playwright/test";
import path from "node:path";

// All provider responses are intercepted. This exercises UI behavior, not hosted calculation/RLS.
test("manager reporting renders charts and applies one range without losing the selected view", async ({ page }, testInfo) => {
  const ownId = "ff000000-0000-4000-8000-000000000001";
  const peerId = "ff000000-0000-4000-8000-000000000002";
  const storeId = "ff000000-0000-4000-8000-000000000010";
  const user = { id: ownId, email: "qa@example.invalid", aud: "authenticated", role: "authenticated", app_metadata: { provider: "email" }, user_metadata: {}, created_at: "2026-01-01T00:00:00Z", identities: [] };
  const tokenPart = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${tokenPart({ alg: "HS256", typ: "JWT" })}.${tokenPart({ sub: ownId, exp: Math.floor(Date.now() / 1000) + 3600, role: "authenticated" })}.synthetic`;
  const summary = { record_count: 4, report_count: 2, points: 246, point_value: 123, commission: 2.5, commission_missing: 1, review_cents: 200, review_count: 1, doordash_cents: 500, doordash_count: 1, extra_bonus: 9.5, total_earnings: 132.5 };
  const requests: { p_owner: string | null; p_start: string; p_end: string; p_bucket?: string }[] = [];
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route(/\/auth\/v1\//, async (route) => {
    const endpoint = new URL(route.request().url()).pathname;
    await route.fulfill({ json: endpoint.endsWith("/token") ? { access_token: token, refresh_token: "synthetic-only", expires_in: 3600, token_type: "bearer", user } : endpoint.endsWith("/logout") ? {} : user });
  });
  await page.route(/\/rest\/v1\//, async (route) => {
    const endpoint = new URL(route.request().url()).pathname;
    const args = route.request().postDataJSON();
    if (endpoint.endsWith("/workspace_members")) return route.fulfill({ json: { role: "manager" } });
    if (endpoint.endsWith("/tracker_context")) return route.fulfill({ json: { people: [{ user_id: ownId, display_name: "QA Manager", report_name: "QA Manager", home_store_id: storeId }, { user_id: peerId, display_name: "QA Employee", report_name: "QA Employee", home_store_id: storeId }], stores: [{ id: storeId, name: "QA Store", timezone: "America/New_York" }], screenshot_max_bytes: 1_000_000 } });
    if (endpoint.endsWith("/tracker_reporting")) {
      requests.push(args);
      return route.fulfill({ json: { summary, series: [{ ...summary, start: args.p_start, end: args.p_end }], categories: [{ key: "rtf", count: 3, revenue: 100, count_missing: 0, revenue_missing: 1 }], members: [{ ...summary, user_id: ownId, display_name: "QA Manager" }, { ...summary, user_id: peerId, display_name: "QA Employee", review_count: 10, points: 100 }], availability: { first_report: "2026-07-01", last_report: "2026-07-02", first_entry: "2026-07-02", last_entry: "2026-07-02", last_import: "2026-07-03T17:00:00Z", last_source_sent: "2026-07-03T17:00:00Z" }, mapped_members: 1, members_with_reports: 1 } });
    }
    if (endpoint.endsWith("/tracker_snapshot")) return route.fulfill({ json: { points: 246, report_count: 2, commission: 2.5, commission_missing: 1, review_cents: 200, review_count: 1, doordash_cents: 500, doordash_count: 1, proof_missing: 0, last_import: "2026-07-03T17:00:00Z", daily: [], history_count: 0, history: [] } });
    return route.abort();
  });
  await page.goto("/");
  await page.getByLabel("Work email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill("synthetic-password");
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome, QA", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /reported points/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /earnings/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Activity by category", exact: true })).toBeVisible();
  const initial = requests.at(-1);
  expect(initial?.p_start.endsWith("-01")).toBe(true);


  await page.getByLabel("Start", { exact: true }).fill("2026-07-01");
  await page.getByLabel("Finish", { exact: true }).fill("2026-11-02");
  expect(requests.at(-1)).toEqual(initial);
  await page.getByRole("button", { name: "Apply range" }).click();
  await expect.poll(() => requests.at(-1)?.p_start).toBe("2026-07-01");
  expect(requests.at(-1)?.p_end).toBe("2026-11-02");
  expect(requests.at(-1)?.p_bucket).toBe("week");
  await page.getByLabel("Finish", { exact: true }).fill("2026-06-30");
  await page.getByRole("button", { name: "Apply range" }).click();
  await expect(page.getByText("Finish must be on or after Start.")).toBeVisible();
  expect(requests.at(-1)?.p_end).toBe("2026-11-02");
  await page.getByLabel("Finish", { exact: true }).fill("2026-11-02");
  await page.getByRole("button", { name: "Apply range" }).click();
  await page.getByLabel("Comparison metric").click();
  await page.getByRole("option", { name: "Google reviews", exact: true }).click();
  await expect(page.getByRole("img", { name: "Highest value in this category" })).toHaveCount(1);
  await page.getByRole("button", { name: "Refresh reports and earnings" }).click();
  await expect(page.getByLabel("Start", { exact: true })).toHaveValue("2026-07-01");
  await expect(page.getByRole("heading", { name: /reported points/i })).toBeVisible();
  await expect(page).toHaveTitle(/Whizz/);
  expect(pageErrors).toEqual([]);
  if (process.env.REPORTING_QA_DIR) await page.screenshot({ path: path.join(process.env.REPORTING_QA_DIR, `reporting-${testInfo.project.name}.png`), fullPage: true });
});

