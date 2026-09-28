import { expect, test } from "@playwright/test";
import arFeed from "../../public/locales/ar/notification.json" with { type: "json" };
import ar from "../../public/locales/ar/platform-notifications.json" with { type: "json" };
import enFeed from "../../public/locales/en/notification.json" with { type: "json" };
import en from "../../public/locales/en/platform-notifications.json" with { type: "json" };
import {
  assertCommunicationsLayout,
  communicationsBrowser,
} from "./platform-communications-fixtures";

for (const crossed of [false, true])
  test(`Platform routing, unknown version, and presentation ${crossed}`, async ({ page }, info) => {
    const arabic = info.project.name === "chromium-rtl";
    const copy = arabic ? ar : en;
    const { calls } = await communicationsBrowser(page, arabic, { crossed });
    await page.goto("/platform/notifications");
    await expect(
      page.getByRole("heading", { name: copy["routing.title"], exact: true, level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(copy["routing.unknownType"], { exact: true })).toBeVisible();
    await expect(page.getByText("platform.future-canary")).toHaveCount(0);
    await assertCommunicationsLayout(page);
    await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
    await assertCommunicationsLayout(page);
    await page.screenshot({ path: info.outputPath(`routing-${crossed}.png`), fullPage: true });
    expect(
      calls.every(
        (call) => call.key.includes("/platform/") && call.token === "Bearer access-canary",
      ),
    ).toBe(true);
  });
test("notification routing confirms exact Platform selector", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  await communicationsBrowser(page, arabic);
  await page.goto("/platform/notifications");
  await page
    .getByRole("button", {
      name: copy["routing.changeLabel"].replace(
        "{{type}}",
        (arabic ? arFeed : enFeed)["notifications.platform.lead-created.title"],
      ),
    })
    .click();
  await page.getByLabel(copy["routing.audience"]).click();
  await page.getByRole("option", { name: copy["routing.choice.role"], exact: true }).click();
  await page.getByLabel(copy["routing.reference.role"]).click();
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: copy["routing.review"] }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("Platform bell uses audience-local feed and read lifecycle", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? arFeed : enFeed;
  const { calls } = await communicationsBrowser(page, arabic);
  await page.goto("/platform/notifications");
  const bell = page.getByRole("button", { name: new RegExp(copy["panel.title"]) });
  await bell.click();
  await expect(
    page.getByText(copy["notifications.platform.lead-created.title"], { exact: true }).last(),
  ).toBeVisible();
  await page.getByRole("button", { name: copy["panel.markAllRead"] }).click();
  await expect
    .poll(
      () => calls.filter((call) => call.key === "POST /api/v1/platform/notifications/read").length,
    )
    .toBe(1);
  expect(calls.some((call) => call.key === "POST /api/v1/platform/notifications/seen")).toBe(true);
  expect(calls.every((call) => call.key.includes("/platform/"))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(bell).toBeFocused();
});
