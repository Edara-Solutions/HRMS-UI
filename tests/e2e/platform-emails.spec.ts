import { expect, test } from "@playwright/test";
import ar from "../../public/locales/ar/platform-emails.json" with { type: "json" };
import en from "../../public/locales/en/platform-emails.json" with { type: "json" };
import { problemBody } from "../../src/test/operation-fakes";
import {
  platformCommunicationsIds as ids,
  platformPreviewBody,
} from "../../src/test/platform-communications-fixtures";
import {
  assertCommunicationsLayout,
  communicationsBrowser,
} from "./platform-communications-fixtures";

for (const crossed of [false, true])
  test(`catalogue isolation and presentation ${crossed}`, async ({ page }, info) => {
    const arabic = info.project.name === "chromium-rtl";
    const copy = arabic ? ar : en;
    const { calls, escapes } = await communicationsBrowser(page, arabic, { crossed });
    await page.goto("/platform/emails");
    await expect(page.getByRole("heading", { name: copy.title, exact: true })).toBeVisible();
    await expect(page.getByText("Payslip ready")).toHaveCount(0);
    const frame = page.frameLocator("iframe[sandbox='']");
    await expect(frame.getByText("Hello Sample")).toBeVisible();
    await frame.getByText("Open", { exact: true }).click({ force: true });
    expect(await page.evaluate(() => "previewScriptCanary" in window)).toBe(false);
    expect(escapes).toEqual([]);
    await page.getByRole("button", { name: copy["locale.ar"], exact: true }).first().click();
    await expect(page.getByText("دعوة إلى الفريق", { exact: true })).toBeVisible();
    await assertCommunicationsLayout(page);
    await page.evaluate(() => (document.documentElement.style.fontSize = "200%"));
    await assertCommunicationsLayout(page);
    await page.screenshot({ path: info.outputPath(`catalogue-${crossed}.png`), fullPage: true });
    expect(
      calls.every(
        (call) => call.key.includes("/platform/") && call.token === "Bearer access-canary",
      ),
    ).toBe(true);
  });
test("variant migration confirms an approved replacement", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const { calls } = await communicationsBrowser(page, arabic);
  await page.goto("/platform/emails");
  await page.getByLabel(copy["variantMigration.selectLegacy"]).selectOption("invitation.legacy");
  await page.getByLabel(copy.replacement).selectOption("invitation.warm");
  await page.getByLabel(copy.reason).fill("Retire legacy revision");
  await page.getByRole("button", { name: copy["variantMigration.migrate"], exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("invitation.legacy → invitation.warm");
  await dialog.getByRole("button", { name: copy["variantMigration.migrate"], exact: true }).click();
  await expect(page.getByText(copy["result.success"], { exact: true })).toBeVisible();
  expect(calls.find((call) => call.key.endsWith("/migrate"))?.body).toEqual({
    toRevisionKey: "invitation.warm",
    reason: "Retire legacy revision",
  });
});
for (const status of [400, 403, 409, 429, 500])
  test(`test-send ${status} is bounded and not replayed`, async ({ page }, info) => {
    const arabic = info.project.name === "chromium-rtl";
    const copy = arabic ? ar : en;
    const { calls, company } = await communicationsBrowser(page, arabic, {
      overrides: {
        "POST /api/v1/platform/emails/test-send": (route) =>
          route.fulfill({ status, json: problemBody(status) }),
      },
    });
    await page.goto("/platform/emails");
    await page.getByLabel(copy["testSend.recipient"]).fill("sample@example.com");
    await page.getByRole("button", { name: copy["testSend.send"], exact: true }).click();
    await expect(
      page.getByRole("button", { name: copy["testSend.send"], exact: true }),
    ).toBeDisabled();
    expect(
      calls.filter((call) => call.key === "POST /api/v1/platform/emails/test-send"),
    ).toHaveLength(1);
    await expect(page.getByLabel(copy["testSend.recipient"])).toHaveValue("sample@example.com");
    expect(await page.locator("body").innerText()).not.toContain("internal-detail-canary");
    expect(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("hrms-company-session:v1") ?? "{}").state.session.user
            .publicId,
      ),
    ).toBe(company.user.publicId);
  });
test("foreign preview is withheld", async ({ page }, info) => {
  const { calls } = await communicationsBrowser(page, info.project.name === "chromium-rtl", {
    overrides: {
      [`GET /api/v1/platform/email-types/${ids.emailTypeKey}/preview`]: (route) =>
        route.fulfill({
          json: { ...platformPreviewBody(), context: "COMPANY", subject: "foreign-preview-canary" },
        }),
    },
  });
  await page.goto("/platform/emails");
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByText("foreign-preview-canary")).toHaveCount(0);
  await expect(
    page.getByText((info.project.name === "chromium-rtl" ? ar : en)["state.contractUnavailable"]),
  ).toBeVisible();
  expect(calls.some((call) => call.key.includes("/preview"))).toBe(true);
});
test("Company identity cannot enter Platform catalogue", async ({ page }, info) => {
  const { calls } = await communicationsBrowser(page, info.project.name === "chromium-rtl", {
    platform: false,
  });
  await page.goto("/platform/emails");
  await expect(page).toHaveURL(/\/platform\/login/);
  expect(calls.filter((call) => call.key.includes("/email-types"))).toHaveLength(0);
});
