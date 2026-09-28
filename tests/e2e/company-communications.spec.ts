import { expect, type Page, type Route, test } from "@playwright/test";
import arAudit from "../../public/locales/ar/audit.json" with { type: "json" };
import ar from "../../public/locales/ar/communications.json" with { type: "json" };
import arNotification from "../../public/locales/ar/notification.json" with { type: "json" };
import enAudit from "../../public/locales/en/audit.json" with { type: "json" };
import en from "../../public/locales/en/communications.json" with { type: "json" };
import enNotification from "../../public/locales/en/notification.json" with { type: "json" };
import { companySessionFixture } from "../../src/test/audience-fixtures";
import {
  communicationsCanaries,
  effectiveBody,
  emailSettingsBody,
  emailTypesBody,
  previewBody,
  routingBody,
  sendingDomainBody,
  variantsBody,
} from "../../src/test/company-communications-fixtures";
import { catalogueBody, rolesBody } from "../../src/test/company-people-fixtures";
import { notificationItem, notificationPage } from "../../src/test/notification-fixtures";
import { problemBody } from "../../src/test/operation-fakes";

const everyPermission = [
  "companies:email-settings:read",
  "companies:email-settings:update",
  "companies:email-readiness:read",
  "sending-domains:read",
  "sending-domains:manage",
  "email-types:read",
  "email-template-variants:read",
  "email-templates:preview",
  "email-template-assignments:read",
  "email-template-assignments:create",
  "email-template-assignments:delete",
  "emails:test-send",
  "notification-settings",
  "roles:read",
  "audit-events:read",
  "company-access-policies:read",
];

interface Recorded {
  key: string;
  authorization: string | null;
  query: string;
  body: unknown;
}

async function open(
  page: Page,
  {
    arabic,
    overrides = {},
  }: { arabic: boolean; overrides?: Record<string, (route: Route) => Promise<void>> },
) {
  const session = companySessionFixture({ permissions: everyPermission });
  await page.setViewportSize(arabic ? { width: 390, height: 844 } : { width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(
    ({ session, arabic }) => {
      localStorage.setItem(
        "hrms-company-session:v1",
        JSON.stringify({
          version: 1,
          state: {
            audience: "company",
            generation: "company-generation",
            eventKind: "replacement",
            session,
          },
        }),
      );
      if (!localStorage.getItem("hrms-preferences:v2"))
        localStorage.setItem(
          "hrms-preferences:v2",
          JSON.stringify({
            version: 2,
            state: { locale: arabic ? "ar" : "en", theme: arabic ? "dark" : "light", scopes: {} },
          }),
        );
    },
    { session, arabic },
  );
  const requests: Recorded[] = [];
  const escapes: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname) && url.protocol.startsWith("http"))
      escapes.push(url.href);
  });
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const key = `${request.method()} ${url.pathname}`;
    requests.push({
      key,
      authorization: request.headers().authorization ?? null,
      query: url.search,
      body: request.postData() ? JSON.parse(request.postData() ?? "") : undefined,
    });
    const override = overrides[key];
    if (override) return override(route);
    switch (key) {
      case "GET /api/v1/company/me":
        return route.fulfill({ json: session.user });
      case "GET /api/v1/company/access-policy":
        return route.fulfill({ json: { mode: "NORMAL", reason: null, effectiveUntil: null } });
      case "GET /api/v1/company/notifications/unread-count":
        return route.fulfill({ json: { unreadCount: 2 } });
      case "GET /api/v1/company/notifications":
        return route.fulfill({
          json: notificationPage([
            notificationItem(1, new Date().toISOString(), {
              typeKey: "company.subscription-changed",
              importance: "high",
              params: { planName: "Growth", status: "active" },
            }),
            notificationItem(2, new Date().toISOString(), { typeKey: "company.future-type" }),
          ]),
        });
      case "POST /api/v1/company/notifications/seen":
        return route.fulfill({ json: { seenCount: 2 } });
      case "GET /api/v1/company/notification-settings":
        return route.fulfill({ json: routingBody() });
      case "GET /api/v1/company/roles":
        return route.fulfill({ json: rolesBody() });
      case "GET /api/v1/company/permissions":
        return route.fulfill({ json: catalogueBody() });
      case "GET /api/v1/company/email-settings":
        return route.fulfill({ json: emailSettingsBody() });
      case "GET /api/v1/company/email-readiness":
        return route.fulfill({ json: { ready: false, reason: "NOT_VERIFIED" } });
      case "GET /api/v1/company/sending-domain":
        return route.fulfill({ json: sendingDomainBody("FAILED") });
      case "GET /api/v1/company/sending-domain/readiness":
        return route.fulfill({ json: { ready: false, reason: "NOT_VERIFIED" } });
      case "GET /api/v1/company/email-types":
        return route.fulfill({ json: emailTypesBody() });
      case "GET /api/v1/company/email-types/company.payslip-ready":
        return route.fulfill({ json: emailTypesBody().items[0] });
      case "GET /api/v1/company/email-template-assignments":
        return route.fulfill({ json: { items: [] } });
      case "GET /api/v1/company/email-types/company.payslip-ready/variants":
        return route.fulfill({ json: variantsBody() });
      case "GET /api/v1/company/email-template-assignments/company.payslip-ready/effective":
        return route.fulfill({ json: effectiveBody() });
      case "GET /api/v1/company/email-types/company.payslip-ready/preview":
        return route.fulfill({
          json: previewBody(url.searchParams.get("locale") === "ar" ? "ar" : "en"),
        });
      case "GET /api/v1/company/audit-trail":
        return route.fulfill({
          json: {
            items: [
              {
                eventType: "company.profile.material_updated",
                eventVersion: 1,
                occurredAt: "2026-08-13T10:00:00.000Z",
                outcome: "SUCCESS",
                traceId: null,
                targets: [{ targetType: "company-profile", publicId: "profile-1" }],
                details: { changes: [] },
              },
              {
                eventType: "audit.event.unavailable",
                eventVersion: 1,
                occurredAt: "2026-08-13T10:01:00.000Z",
                reason: "UNSUPPORTED_OR_DAMAGED",
              },
            ],
            nextCursor: null,
            hasMore: false,
          },
        });
      default:
        throw new Error(`Unexpected S5 operation ${key}`);
    }
  });
  return { requests, escapes };
}

async function expectCalmLayout(page: Page) {
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  for (const canary of communicationsCanaries)
    await expect(page.locator("body")).not.toContainText(canary);
}

test("takes the badge from the unread count and shows unknown types neutrally", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const notification = arabic ? arNotification : enNotification;
  const { requests } = await open(page, { arabic, overrides: {} });
  await page.goto("/company/email");
  const bell = page.getByRole("button", { name: new RegExp(notification["panel.title"]) });
  await expect(page.getByText("2", { exact: true })).toBeVisible();
  await bell.click();
  await expect(
    page.getByText(notification["notifications.company.subscription-changed.title"]),
  ).toBeVisible();
  await expect(page.getByText(notification["notifications.unknown.title"])).toBeVisible();
  await expect(page.locator("body")).not.toContainText("company.future-type");
  await page.keyboard.press("Escape");
  await expect(bell).toBeFocused();
  const seen = requests.find((request) => request.key.endsWith("/seen"));
  expect(seen?.body).toMatchObject({ publicIds: expect.any(Array) });
});

test("shows a failed domain verification without backend failure text", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  await open(page, { arabic });
  await page.goto("/company/email");
  await expect(page.getByRole("heading", { level: 1, name: copy["email.title"] })).toBeVisible();
  await expect(page.getByText(copy["domain.state.verification-failed"])).toBeVisible();
  await expect(page.getByRole("cell", { name: copy["domain.check.FAILED"] })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", arabic ? "rtl" : "ltr");
  await expectCalmLayout(page);
});

test("previews a Company template in an inert frame that loads nothing remote", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const { escapes } = await open(page, { arabic });
  await page.goto("/company/email/templates");
  await expect(
    page.getByRole("heading", { level: 1, name: copy["templates.title"] }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Invitation secret email");
  const frame = page.frameLocator("iframe[sandbox='']");
  await expect(frame.getByText("Hello Sample")).toBeVisible();
  await frame.getByText("Open").click({ force: true });
  await page.waitForTimeout(300);
  expect(escapes).toEqual([]);
  expect(await page.evaluate(() => "previewScriptCanary" in window)).toBe(false);
  await expectCalmLayout(page);
});

test("a Company-wide refusal on email type detail hides template controls and keeps SELF recovery", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const { requests } = await open(page, {
    arabic,
    overrides: {
      "GET /api/v1/company/email-types/company.payslip-ready": (route) =>
        route.fulfill({
          status: 403,
          json: problemBody(403, { code: "COMPANY_ACCESS_DENIED", mode: "BLOCKED" }),
        }),
    },
  });
  await page.goto("/company/email/templates");
  await expect(
    page.getByRole("heading", {
      name: arabic ? "مساحة عمل شركتك غير متاحة" : "Your company workspace is unavailable",
    }),
  ).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  expect(requests.some(({ key }) => key.endsWith("/preview") || key.endsWith("/variants"))).toBe(
    false,
  );
  await expect(page.locator("body")).not.toContainText("internal-detail-canary");
  const recovery = page.locator('a[href="/company/me/profile"]');
  await expect(recovery).toBeVisible();
  await recovery.focus();
  await expect(recovery).toBeFocused();
});

test("routes a notification type by role after confirmation", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const { requests } = await open(page, {
    arabic,
    overrides: {
      "PUT /api/v1/company/notification-settings/company.subscription-changed": (route) =>
        route.fulfill({ status: 204 }),
    },
  });
  await page.goto("/company/notifications");
  const notification = arabic ? arNotification : enNotification;
  const type = notification["notifications.company.subscription-changed.title"];
  await page
    .getByRole("button", { name: copy["routing.changeLabel"].replace("{{type}}", type) })
    .click();
  await page.getByRole("combobox", { name: copy["routing.audience"] }).click();
  await page.getByRole("option", { name: copy["routing.choice.role"] }).click();
  await page.getByRole("combobox", { name: copy["routing.reference.role"] }).click();
  await page.getByRole("option", { name: "Manager" }).click();
  await page.getByRole("button", { name: copy["routing.review"] }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: copy["routing.confirm.action"] })
    .click();
  await expect(page.getByText(copy["routing.saved"].replace("{{type}}", type))).toBeVisible();
  expect(requests.find((request) => request.key.startsWith("PUT"))?.body).toEqual({
    override: { selectorKind: "role", selectorRef: "Manager" },
  });
  await expectCalmLayout(page);
});

test("renders withheld and unavailable audit history without inventing identity", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const audit = arabic ? arAudit : enAudit;
  await open(page, { arabic });
  await page.goto("/company/audit");
  await expect(page.getByText(audit["chrome.identityWithheld"]).first()).toBeVisible();
  await expect(page.getByText(audit["audit.event.unavailable"])).toBeVisible();
  await expect(page.locator("body")).not.toContainText(audit["chrome.actorKind.PLATFORM_USER"]);
  await expectCalmLayout(page);
});
