import { expect, test } from "@playwright/test";

test("conceals disabled Platform before authentication without requests", async ({
  page,
}, info) => {
  test.skip(
    process.env.VITE_ENABLE_PLATFORM_PORTAL !== "false",
    "Run with a deliberately disabled Platform build",
  );
  const arabic = info.project.name === "chromium-rtl";
  await page.addInitScript(
    (locale) =>
      localStorage.setItem(
        "hrms-preferences:v2",
        JSON.stringify({ version: 2, state: { locale, theme: "light", scopes: {} } }),
      ),
    arabic ? "ar" : "en",
  );
  const calls: string[] = [];
  await page.route("**/api/v1/**", (route) => {
    calls.push(route.request().url());
    return route.abort();
  });
  for (const path of ["/platform/login", "/platform/me/profile", "/platform/dashboard"]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: arabic ? "يبدو أنك ضللت الطريق" : "You missed your way" }),
    ).toBeVisible();
  }
  expect(calls).toEqual([]);
});
