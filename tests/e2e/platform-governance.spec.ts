import { expect, test } from "@playwright/test";
import arAnn from "../../public/locales/ar/platform-announcements.json" with { type: "json" };
import arDelivery from "../../public/locales/ar/platform-email-deliveries.json" with {
  type: "json",
};
import arSending from "../../public/locales/ar/platform-email-sending.json" with { type: "json" };
import enAnn from "../../public/locales/en/platform-announcements.json" with { type: "json" };
import enDelivery from "../../public/locales/en/platform-email-deliveries.json" with {
  type: "json",
};
import enSending from "../../public/locales/en/platform-email-sending.json" with { type: "json" };
import {
  deliveryBody,
  platformCommunicationsIds as ids,
} from "../../src/test/platform-communications-fixtures";
import {
  assertCommunicationsLayout,
  communicationsBrowser,
} from "./platform-communications-fixtures";

for (const route of [
  "announcements",
  "email-sending",
  "email-deliveries",
  "audit",
  "audit/catalog",
])
  for (const crossed of [false, true])
    test(`${route} presentation ${crossed}`, async ({ page }, info) => {
      const { calls } = await communicationsBrowser(page, info.project.name === "chromium-rtl", {
        crossed,
      });
      await page.goto(`/platform/${route}`);
      await expect(page.locator("main h1")).toBeVisible();
      if (route === "audit") {
        await expect(page.getByText("Nadia Platform")).toBeVisible();
        await expect(page.getByText("Nadia Company")).toBeVisible();
      }
      await assertCommunicationsLayout(page);
      await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
      await assertCommunicationsLayout(page);
      await page.screenshot({
        path: info.outputPath(`${route}-${crossed}.png`),
        fullPage: route !== "audit/catalog",
      });
      expect(
        calls.every(
          (call) => call.key.includes("/platform/") && call.token === "Bearer access-canary",
        ),
      ).toBe(true);
    });
test("announcement pins bilingual content and scope before publish", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? arAnn : enAnn;
  const { calls } = await communicationsBrowser(page, arabic);
  await page.goto("/platform/announcements");
  await expect(page.getByText(copy["status.PARTIAL"], { exact: true })).toBeVisible();
  await expect(page.getByText(copy.dispatchFinishedAt, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: copy.compose }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('[name="enTitle"]').fill("Maintenance");
  await dialog.locator('[name="enBody"]').fill("Planned maintenance");
  await dialog.locator('[name="arTitle"]').fill("صيانة");
  await dialog.locator('[name="arBody"]').fill("صيانة مجدولة");
  await dialog.getByRole("checkbox").first().check();
  await dialog.getByRole("button", { name: copy.review }).click();
  const confirm = page.getByRole("dialog").last();
  await expect(confirm).toContainText("Maintenance");
  await expect(confirm).toContainText("صيانة");
  await confirm.getByRole("button", { name: copy.publish }).click();
  await expect
    .poll(() => calls.filter((call) => call.key === "POST /api/v1/platform/announcements").length)
    .toBe(1);
  expect(
    calls.find((call) => call.key === "POST /api/v1/platform/announcements")?.body,
  ).toMatchObject({
    message: {
      en: { title: "Maintenance", body: "Planned maintenance" },
      ar: { title: "صيانة", body: "صيانة مجدولة" },
    },
    rules: [{ scope: "company", selector: { kind: "blast" } }],
  });
});
test("sending pause names the context and submits one command", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? arSending : enSending;
  const { calls } = await communicationsBrowser(page, arabic);
  await page.goto("/platform/email-sending");
  await page.getByRole("button", { name: copy.pause, exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(copy["context.EDARA"]);
  await expect(dialog.getByRole("button", { name: copy.confirm, exact: true })).toBeDisabled();
  await dialog.getByLabel(copy.reason).fill("Investigating incident");
  await dialog.getByRole("button", { name: copy.confirm, exact: true }).click();
  await expect(page.getByText(copy["result.success"], { exact: true })).toBeVisible();
  expect(
    calls.filter((call) => call.key === "POST /api/v1/platform/emails/sending/EDARA/pause"),
  ).toHaveLength(1);
});
test("delivery detail minimizes disclosure and rechecks state", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? arDelivery : enDelivery;
  let reads = 0;
  const { calls } = await communicationsBrowser(page, arabic, {
    overrides: {
      [`GET /api/v1/platform/emails/deliveries/COMPANY/${ids.companyDeliveryId}`]: (route) =>
        route.fulfill({
          json: deliveryBody({
            status: ++reads > 1 ? "SENT" : "FAILED",
            lastFailureKind: "failure-canary",
            businessReference: "business-canary",
          }),
        }),
    },
  });
  await page.goto(
    `/platform/email-deliveries?deliveryId=${ids.companyDeliveryId}&deliveryContext=COMPANY`,
  );
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("s***@company.test")).toBeVisible();
  await expect(dialog).not.toContainText("provider-message-canary");
  await expect(dialog).not.toContainText("failure-canary");
  await expect(dialog).not.toContainText("business-canary");
  await dialog.getByRole("button", { name: copy["actions.retry"], exact: true }).click();
  const confirm = page.getByRole("dialog").last();
  await confirm.getByLabel(copy["actions.reasonLabel"]).fill("Retry after repair");
  await confirm.getByRole("button", { name: copy["actions.retry"], exact: true }).click();
  await expect(page.getByText(copy["result.stale"], { exact: true })).toBeVisible();
  expect(calls.filter((call) => call.key.endsWith("/retry"))).toHaveLength(0);
});
