import { expect, test } from "@playwright/test";

test("opens public plans from the root without an authenticated shell", async ({ page }) => {
  await page.route("**/api/v1/public/plans**", (route) => route.fulfill({ json: { data: [] } }));
  await page.goto("/");
  await expect(page).toHaveURL(/\/plans$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("aside")).toHaveCount(0);
});
