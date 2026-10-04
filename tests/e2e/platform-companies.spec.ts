import { expect, type Page, type Route, test } from "@playwright/test";
import ar from "../../public/locales/ar/platform-companies.json" with { type: "json" };
import arDashboard from "../../public/locales/ar/platform-dashboard.json" with { type: "json" };
import en from "../../public/locales/en/platform-companies.json" with { type: "json" };
import enDashboard from "../../public/locales/en/platform-dashboard.json" with { type: "json" };
import { companySessionFixture, platformSessionFixture } from "../../src/test/audience-fixtures";
import { problemBody } from "../../src/test/operation-fakes";
import {
  companyActivationBody,
  companyBody,
  companyCommercialBody,
  companyCursorBody,
  companyIds,
  companyListBody,
  companyPermissions,
  companyPolicyBody,
  companySubscriptionBody,
} from "../../src/test/platform-company-fixtures";

interface Request {
  key: string;
  authorization: string | null;
  body: unknown;
}
async function open(
  page: Page,
  arabic: boolean,
  crossed = false,
  overrides: Record<string, (route: Route) => Promise<void>> = {},
  permissions = companyPermissions,
) {
  const session = platformSessionFixture({ permissions });
  const company = companySessionFixture();
  const narrow = arabic !== crossed;
  await page.setViewportSize(narrow ? { width: 390, height: 844 } : { width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(
    ({ session, company, arabic, narrow }) => {
      for (const [audience, identity] of [
        ["platform", session],
        ["company", company],
      ] as const)
        localStorage.setItem(
          `hrms-${audience}-session:v1`,
          JSON.stringify({
            version: 1,
            state: {
              audience,
              generation: `${audience}-generation`,
              eventKind: "replacement",
              session: identity,
            },
          }),
        );
      if (!localStorage.getItem("hrms-preferences:v2"))
        localStorage.setItem(
          "hrms-preferences:v2",
          JSON.stringify({
            version: 2,
            state: { locale: arabic ? "ar" : "en", theme: narrow ? "dark" : "light", scopes: {} },
          }),
        );
    },
    { session, company, arabic, narrow },
  );
  const requests: Request[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const key = `${request.method()} ${path}`;
    requests.push({
      key,
      authorization: request.headers().authorization ?? null,
      body: request.postData() ? JSON.parse(request.postData() ?? "") : undefined,
    });
    if (overrides[key]) return overrides[key](route);
    if (path === "/api/v1/platform/me") return route.fulfill({ json: session.user });
    if (path === "/api/v1/platform/companies")
      return route.fulfill({
        status: request.method() === "POST" ? 201 : 200,
        json: request.method() === "POST" ? companyBody() : companyListBody(),
      });
    if (path === "/api/v1/platform/companies/cursor")
      return route.fulfill({ json: companyCursorBody() });
    const root = `/api/v1/platform/companies/${companyIds.company}`;
    if (path === root)
      return request.method() === "DELETE"
        ? route.fulfill({ status: 204 })
        : route.fulfill({ json: companyBody({ lifecycleStatus: "ONBOARDING" }) });
    if (path === `${root}/access-policy`)
      return route.fulfill({
        json: request.method() === "PATCH" ? companyPolicyBody().policy : companyPolicyBody(),
      });
    if (path === `${root}/activation` || path === `${root}/activation/evaluate`)
      return route.fulfill({ json: companyActivationBody() });
    if (path === `${root}/commercial-config`)
      return route.fulfill({ json: companyCommercialBody() });
    if (path === `${root}/subscription` || path === `${root}/subscription/trial`)
      return route.fulfill({ json: companySubscriptionBody() });
    if (
      ["freeze", "unfreeze", "suspend", "unsuspend", "restore"].some(
        (command) => path === `${root}/${command}`,
      )
    )
      return route.fulfill({ status: 204 });
    if (path === "/api/v1/platform/company-subscriptions/expire-trials")
      return route.fulfill({ json: { expiredCount: 3 } });
    return route.fulfill({ status: 404, json: problemBody(404) });
  });
  return { requests, company };
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}
test("Platform overview separates sample history from permission-gated live routes", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? arDashboard : enDashboard;
  const { requests } = await open(page, arabic, false, {}, [...companyPermissions, "plans:read"]);
  await page.goto("/platform/dashboard");
  const demo = page.getByRole("region", { name: copy.sampleTitle });
  await expect(demo).toContainText("Swift Systems");
  await expect(page.getByRole("main").getByRole("link", { name: copy.plans })).toHaveAttribute(
    "href",
    "/platform/plans",
  );
  expect(requests.some((request) => request.key.includes("/api/v1/company/"))).toBe(false);
  await noOverflow(page);
});
for (const crossed of [false, true])
  test(`Company workspace separates states and confirmed activation ${crossed ? "crossed themes" : "default themes"}`, async ({
    page,
  }, info) => {
    const arabic = info.project.name === "chromium-rtl";
    const copy = arabic ? ar : en;
    const { requests, company } = await open(page, arabic, crossed);
    await page.goto(`/platform/companies/${companyIds.company}`);
    await expect(page.getByRole("heading", { name: "Acme Company" })).toBeVisible();
    await expect(page.getByText(copy["registry.isActive"], { exact: true })).toBeVisible();
    for (const key of [
      "policy.title",
      "activation.title",
      "commercial.title",
      "subscription.title",
    ])
      await expect(page.getByText(copy[key], { exact: true })).toBeVisible();
    const evaluateKey = `POST /api/v1/platform/companies/${companyIds.company}/activation/evaluate`;
    expect(requests.filter((request) => request.key === evaluateKey)).toHaveLength(0);
    const trigger = page.getByRole("button", { name: copy["action.evaluate"], exact: true });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: copy["action.evaluate"], exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(copy.done);
    expect(requests.filter((request) => request.key === evaluateKey)).toHaveLength(1);
    expect(requests.every((request) => request.authorization === "Bearer access-canary")).toBe(
      true,
    );
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("hrms-company-session:v1") ?? "{}").state.session,
      ),
    ).toEqual(company);
    await expect(page.locator("body")).not.toContainText("canary");
    await noOverflow(page);
    await page.getByRole("heading", { name: "Acme Company" }).scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `test-results/s7-${arabic ? "ar" : "en"}-${crossed ? "crossed" : "default"}.png`,
      fullPage: true,
    });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await noOverflow(page);
  });
test("registry create and known-ID restoration use dedicated safe contracts", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const { requests } = await open(page, arabic);
  await page.goto("/platform/companies");
  await expect(page.getByRole("link", { name: "Acme Company" })).toBeVisible();
  await page.getByRole("button", { name: copy.create, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(copy["field.name"]).fill("New Company");
  await dialog.getByLabel(copy["field.phoneNumber"]).fill("01012345678");
  await dialog.getByLabel(copy["field.country"]).fill("Egypt");
  await dialog.getByRole("button", { name: copy.create, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/platform/companies/${companyIds.company}`));
  expect(
    requests.find((request) => request.key === "POST /api/v1/platform/companies")?.body,
  ).toEqual({
    name: "New Company",
    logo: null,
    website: null,
    phoneNumber: "01012345678",
    country: "Egypt",
    addressLine: null,
  });
  await page.goto("/platform/companies");
  await page.getByLabel(copy["restore.publicId"]).fill(companyIds.company);
  await page.getByRole("button", { name: copy["action.restore"], exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: copy["action.restore"], exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/platform/companies/${companyIds.company}`));
  expect(requests.filter((request) => request.key.endsWith("/restore"))).toHaveLength(1);
});
test("subscription samples filter independently of live Company actions", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const { requests } = await open(page, arabic);
  await page.goto("/platform/subscriptions");
  const demo = page.getByRole("region", { name: copy["subscriptionDemo.title"] });
  await expect(demo).toContainText(copy["subscriptionDemo.badge"]);
  await expect(demo).toContainText("Nexus Technologies");
  await expect(page.getByRole("link", { name: copy["subscriptions.view"] })).toHaveAttribute(
    "href",
    `/platform/companies/${companyIds.company}`,
  );
  await demo
    .getByRole("group", { name: copy["subscriptionDemo.statusFilter"] })
    .getByRole("button", { name: copy["subscriptionDemo.status.TRIAL"] })
    .click();
  await expect(demo).not.toContainText("Nexus Technologies");
  await expect(demo).toContainText("CloudNine Solutions");
  expect(
    requests.filter((request) => request.key === "GET /api/v1/platform/companies/cursor"),
  ).toHaveLength(1);
  await noOverflow(page);
});
test("failed global expiry remains indeterminate and reconciles without retry", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const key = "POST /api/v1/platform/company-subscriptions/expire-trials";
  const { requests } = await open(page, arabic, false, {
    [key]: (route) => route.fulfill({ status: 500, json: problemBody(500) }),
  });
  await page.goto("/platform/subscriptions");
  await page.getByRole("button", { name: copy["expiry.action"], exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("button", { name: copy["expiry.action"], exact: true }),
  ).toBeDisabled();
  await dialog.getByRole("textbox").fill("EXPIRE");
  await dialog.getByRole("button", { name: copy["expiry.action"], exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(copy["expiry.indeterminate"]);
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: copy["expiry.action"], exact: true }),
  ).toBeDisabled();
  expect(requests.filter((request) => request.key === key)).toHaveLength(1);
  expect(
    requests.filter((request) => request.key === "GET /api/v1/platform/companies/cursor").length,
  ).toBeGreaterThan(1);
  await expect(page.locator("body")).not.toContainText("internal-detail-canary");
  await noOverflow(page);
});
test("foreign Company contracts disable actions and conceal data", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  await open(page, arabic, false, {
    [`GET /api/v1/platform/companies/${companyIds.company}/activation`]: (route) =>
      route.fulfill({ json: { ...companyActivationBody(), companyPublicId: companyIds.other } }),
  });
  await page.goto(`/platform/companies/${companyIds.company}`);
  await expect(page.getByText(copy.contract, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: copy["action.evaluate"], exact: true }),
  ).toHaveCount(0);
});
test("permission loss refreshes actor and removes affected controls", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  let refused = false;
  const { requests } = await open(page, arabic, false, {
    [`POST /api/v1/platform/companies/${companyIds.company}/freeze`]: async (route) => {
      refused = true;
      await route.fulfill({ status: 403, json: problemBody(403) });
    },
    "GET /api/v1/platform/me": (route) =>
      route.fulfill({
        json: platformSessionFixture({
          permissions: refused ? ["companies:read"] : companyPermissions,
        }).user,
      }),
  });
  await page.goto(`/platform/companies/${companyIds.company}`);
  await page.getByRole("button", { name: copy["action.freeze"], exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: copy["action.freeze"], exact: true })
    .click();
  await expect(page.getByRole("button", { name: copy["action.freeze"], exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole("alert")).toBeVisible();
  expect(requests.filter((request) => request.key.endsWith("/freeze"))).toHaveLength(1);
});
