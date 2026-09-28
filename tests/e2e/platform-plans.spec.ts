import { expect, type Page, type Route, test } from "@playwright/test";
import ar from "../../public/locales/ar/platform-plans.json" with { type: "json" };
import en from "../../public/locales/en/platform-plans.json" with { type: "json" };
import { companySessionFixture, platformSessionFixture } from "../../src/test/audience-fixtures";
import { problemBody } from "../../src/test/operation-fakes";
import {
  effectiveBody,
  planBody,
  planDetailBody,
  planId,
  planPermissions,
  priceBody,
  priceId,
} from "../../src/test/platform-plan-fixtures";

async function open(
  page: Page,
  arabic: boolean,
  overrides: Record<string, (route: Route) => Promise<void>> = {},
  permissions = planPermissions,
  crossed = false,
  platform = true,
) {
  const session = platformSessionFixture({ permissions });
  const company = companySessionFixture();
  const narrow = arabic !== crossed;
  await page.setViewportSize(narrow ? { width: 390, height: 844 } : { width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(
    ({ session, company, arabic, narrow, platform }) => {
      for (const [audience, identity] of [
        ["platform", session],
        ["company", company],
      ] as const) {
        if (audience === "platform" && !platform) continue;
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
      }
      localStorage.setItem(
        "hrms-preferences:v2",
        JSON.stringify({
          version: 2,
          state: { locale: arabic ? "ar" : "en", theme: narrow ? "dark" : "light", scopes: {} },
        }),
      );
    },
    { session, company, arabic, narrow, platform },
  );
  const calls: {
    path: string;
    method: string;
    authorization: string | null;
    query: string;
    body: unknown;
  }[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    calls.push({
      path,
      method,
      authorization: request.headers().authorization ?? null,
      query: url.search,
      body: request.postData() ? JSON.parse(request.postData() ?? "") : undefined,
    });
    if (overrides[`${method} ${path}`]) return overrides[`${method} ${path}`](route);
    if (path === "/api/v1/platform/me") return route.fulfill({ json: session.user });
    if (path === "/api/v1/platform/plans")
      return route.fulfill({
        status: method === "POST" ? 201 : 200,
        json: method === "POST" ? planBody() : { data: [planDetailBody()] },
      });
    if (path === `/api/v1/platform/plans/${planId}`)
      return route.fulfill({
        json:
          method === "DELETE"
            ? { message: "private-message-canary" }
            : method === "PATCH"
              ? planBody()
              : planDetailBody(),
      });
    if (path === `/api/v1/platform/plans/${planId}/prices`)
      return route.fulfill({
        status: method === "POST" ? 201 : 200,
        json: method === "POST" ? priceBody() : { data: [priceBody()] },
      });
    if (path === `/api/v1/platform/plan-prices/${priceId}`)
      return route.fulfill({
        json: method === "DELETE" ? { message: "private-message-canary" } : priceBody(),
      });
    if (path === `/api/v1/platform/plans/${planId}/effective-price`)
      return route.fulfill({
        json: effectiveBody({ intervalCount: Number(url.searchParams.get("intervalCount") ?? 1) }),
      });
    if (path === "/api/v1/public/plans")
      return route.fulfill({
        json: {
          data: [
            {
              publicId: planId,
              name: "Growth خطة",
              description: "Authored description وصف",
              duration: 30,
              features: ["OVERVIEW"],
              effectivePrice: null,
            },
          ],
        },
      });
    return route.fulfill({ status: 404, json: problemBody(404) });
  });
  return { calls, company };
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(
    await page.locator("main").evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
}
for (const crossed of [false, true])
  test(`catalogue presentation and focus${crossed ? " crossed" : ""}`, async ({ page }, info) => {
    const arabic = info.project.name === "chromium-rtl";
    const copy = arabic ? ar : en;
    const { calls } = await open(page, arabic, {}, planPermissions, crossed);
    await page.goto("/platform/plans");
    await page.getByRole("link", { name: "Growth خطة" }).click();
    await expect(page.getByRole("heading", { name: "Growth خطة" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", arabic ? "rtl" : "ltr");
    await expect(page.getByText("Authored description وصف", { exact: true })).toHaveAttribute(
      "dir",
      "auto",
    );
    await noOverflow(page);
    await page.screenshot({
      path: info.outputPath(`plans-standard-${arabic ? "ar" : "en"}-${crossed}.png`),
    });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await noOverflow(page);
    await page.getByRole("button", { name: copy.editPlan, exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("dialog").getByLabel(copy.name, { exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.getByRole("button", { name: copy.editPlan, exact: true })).toBeFocused();
    await page.locator("main").evaluate((element) => {
      element.scrollTop = 0;
    });
    await page.screenshot({
      path: info.outputPath(`plans-${arabic ? "ar" : "en"}-${crossed}.png`),
      fullPage: true,
    });
    expect(
      calls.every(
        (call) =>
          call.path.startsWith("/api/v1/platform/") &&
          call.authorization === "Bearer access-canary",
      ),
    ).toBe(true);
    expect(await page.locator("body").innerText()).not.toContain("canary");
  });
test("delivers all catalogue commands and explicit price inspection", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const { calls, company } = await open(page, arabic);
  await page.goto("/platform/plans");
  await page.getByLabel(copy.status, { exact: true }).selectOption("false");
  await page.getByRole("button", { name: copy.filter, exact: true }).click();
  await expect(page).toHaveURL(/isActive=false/);
  await page.getByRole("button", { name: copy.createPlan, exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel(copy.name, { exact: true }).fill("New plan");
  await dialog.getByLabel(copy.features, { exact: true }).fill("ATTENDANCE, ANALYTICS");
  await dialog.getByRole("button", { name: copy.save, exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("link", { name: "Growth خطة" }).click();
  await page.getByRole("button", { name: copy.editPlan, exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(copy.description, { exact: true }).fill("Updated");
  await dialog.getByRole("button", { name: copy.save, exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: copy.createPrice, exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(copy.currency, { exact: true }).fill("JPY");
  await dialog.getByLabel(copy.amountMinor, { exact: true }).fill("123");
  await dialog.getByRole("button", { name: copy.save, exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: copy.editPrice, exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel(copy.amountMinor, { exact: true }).fill("7600");
  await dialog.getByRole("button", { name: copy.save, exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByLabel(copy.currency, { exact: true }).fill("USD");
  await page.getByLabel(copy.country, { exact: true }).fill("EG");
  await page.getByLabel(copy.count, { exact: true }).fill("2");
  await page.getByRole("button", { name: copy.inspect, exact: true }).click();
  await expect(page.getByText(copy["source.default_row"], { exact: false })).toBeVisible();
  const effective = calls.find((call) => call.path.endsWith("/effective-price"));
  expect(effective?.query).toContain("currencyCode=USD");
  expect(effective?.query).toContain("billingInterval=monthly");
  expect(effective?.query).toContain("intervalCount=2");
  await page.getByRole("button", { name: copy.deletePrice, exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: copy.delete, exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: copy.deletePlan, exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: copy.delete, exact: true }).click();
  await expect(page).toHaveURL(/\/platform\/plans\/?$/);
  expect(calls.filter((call) => call.method !== "GET")).toHaveLength(6);
  expect(
    calls.find((call) => call.method === "PATCH" && call.path.endsWith(`/plans/${planId}`))?.body,
  ).toEqual({ description: "Updated" });
  expect(
    calls.find((call) => call.method === "POST" && call.path.endsWith("/prices"))?.body,
  ).toMatchObject({ currencyCode: "JPY", amountMinor: 123 });
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("hrms-company-session:v1") ?? "null"),
  );
  expect(stored.state.session).toEqual(company);
});
for (const status of [400, 403, 409, 429, 500])
  test(`price deletion ${status} reconciles without retry`, async ({ page }, info) => {
    const arabic = info.project.name === "chromium-rtl";
    const copy = arabic ? ar : en;
    const { calls } = await open(page, arabic, {
      [`DELETE /api/v1/platform/plan-prices/${priceId}`]: (route) =>
        route.fulfill({ status, json: problemBody(status) }),
    });
    await page.goto(`/platform/plans/${planId}`);
    await page.getByRole("button", { name: copy.deletePrice, exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: copy.delete, exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("button", { name: copy.deletePrice, exact: true })).toBeDisabled();
    expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(1);
    expect(await page.locator("body").innerText()).not.toContain("canary");
  });
test("hides mutations without their exact permissions", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  await open(page, arabic, {}, ["plans:read", "plan-prices:read"]);
  await page.goto(`/platform/plans/${planId}`);
  await expect(page.getByRole("heading", { name: "Growth خطة" })).toBeVisible();
  for (const name of [
    copy.editPlan,
    copy.deletePlan,
    copy.createPrice,
    copy.editPrice,
    copy.deletePrice,
  ])
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);
});
test("rejects foreign and malformed responses without disclosure", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  await open(page, arabic, {
    [`GET /api/v1/platform/plans/${planId}`]: (route) =>
      route.fulfill({ json: planDetailBody({ publicId: priceId }) }),
  });
  await page.goto(`/platform/plans/${planId}`);
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Growth خطة" })).toHaveCount(0);
});
test("keeps loading, empty and offline states bounded", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  let release: () => void = () => {};
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  await open(page, arabic, {
    "GET /api/v1/platform/plans": async (route) => {
      await wait;
      await route.fulfill({ json: { data: [] } });
    },
  });
  await page.goto("/platform/plans");
  await expect(page.locator("output")).toBeVisible();
  release();
  await expect(page.getByText(copy.empty, { exact: true })).toBeVisible();
  await page.route("**/api/v1/platform/plans", (route) => route.abort());
  await page.reload();
  await expect(page.getByRole("alert")).toBeVisible();
  expect(await page.locator("body").innerText()).not.toContain("canary");
});
test("public catalogue uses no credentials with both live identities", async ({ page }, info) => {
  const { calls } = await open(page, info.project.name === "chromium-rtl");
  await page.goto("/plans");
  await expect(page.getByRole("heading", { name: "Growth خطة" })).toBeVisible();
  expect(calls).toHaveLength(1);
  expect(calls[0].path).toBe("/api/v1/public/plans");
  expect(calls[0].authorization).toBeNull();
  await page.evaluate(() => {
    localStorage.removeItem("hrms-platform-session:v1");
    localStorage.removeItem("hrms-company-session:v1");
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Growth خطة" })).toBeVisible();
  expect(
    calls.every((call) => call.path === "/api/v1/public/plans" && call.authorization === null),
  ).toBe(true);
});
test("Company identity alone cannot send Platform catalogue operations", async ({ page }, info) => {
  const { calls } = await open(
    page,
    info.project.name === "chromium-rtl",
    {},
    planPermissions,
    false,
    false,
  );
  await page.goto("/platform/plans");
  await expect(page).toHaveURL(/\/platform\/login/);
  expect(calls).toHaveLength(0);
});
