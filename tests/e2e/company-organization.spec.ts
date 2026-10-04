import { expect, type Page, type Route, test } from "@playwright/test";
import ar from "../../public/locales/ar/organization.json" with { type: "json" };
import en from "../../public/locales/en/organization.json" with { type: "json" };
import { companySessionFixture } from "../../src/test/audience-fixtures";
import {
  accessPolicyBody,
  activationBody,
  organizationCanaries,
  profileBody,
  registryBody,
  setupBody,
  setupStep,
  stepIds,
  subscriptionBody,
} from "../../src/test/company-organization-fixtures";
import { problemBody } from "../../src/test/operation-fakes";

const everyPermission = [
  "companies:read",
  "company-activation:read",
  "company-subscriptions:read",
  "company-access-policies:read",
  "company-setup:read",
  "company-setup:update",
  "companies:email-readiness:read",
  "company-profiles:read",
  "company-profiles:update",
];

interface Recorded {
  key: string;
  authorization: string | null;
  body: unknown;
}

interface Scenario {
  arabic: boolean;
  permissions?: string[];
  mode?: string;
  reads?: Record<string, (route: Route) => Promise<void>>;
}

async function open(
  page: Page,
  { arabic, permissions = everyPermission, mode = "NORMAL", reads = {} }: Scenario,
) {
  const session = companySessionFixture({ permissions, isOwner: true });
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
  let setupSteps = [
    setupStep("SET_COMPANY_PROFILE", "IN_PROGRESS"),
    setupStep("SET_ROLES", "PENDING"),
  ];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const key = `${request.method()} ${new URL(request.url()).pathname}`;
    requests.push({
      key,
      authorization: request.headers().authorization ?? null,
      body: request.postData() ? JSON.parse(request.postData() ?? "") : undefined,
    });
    const override = reads[key];
    if (override) return override(route);
    switch (key) {
      case "GET /api/v1/company/me":
        return route.fulfill({ json: session.user });
      case "GET /api/v1/company/notifications/unread-count":
        return route.fulfill({ json: { unreadCount: 0 } });
      case "GET /api/v1/company/notifications":
        return route.fulfill({ json: { items: [], nextCursor: null, hasMore: false } });
      case "GET /api/v1/company/registry":
        return route.fulfill({ json: registryBody() });
      case "GET /api/v1/company/activation":
        return route.fulfill({ json: activationBody() });
      case "GET /api/v1/company/subscription":
        return route.fulfill({ json: subscriptionBody() });
      case "GET /api/v1/company/access-policy":
        return route.fulfill({ json: accessPolicyBody(mode) });
      case "GET /api/v1/company/email-readiness":
        return route.fulfill({ json: { ready: true } });
      case "GET /api/v1/company/profile":
        return route.fulfill({ json: profileBody() });
      case "GET /api/v1/company/setup":
        return route.fulfill({ json: setupBody(setupSteps) });
      case `POST /api/v1/company/setup/${stepIds.roles}/start`:
        // Another session already moved the step on: the transition is stale.
        setupSteps = [
          setupSteps[0] ?? setupStep("SET_COMPANY_PROFILE", "IN_PROGRESS"),
          setupStep("SET_ROLES", "IN_PROGRESS"),
        ];
        return route.fulfill({ status: 400, json: problemBody(400) });
      case "PATCH /api/v1/company/profile":
        return route.fulfill({ json: profileBody({ phone: "+20 100 000 0000" }) });
      default:
        throw new Error(`Unexpected S3 operation ${key}`);
    }
  });
  return requests;
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
  for (const canary of organizationCanaries)
    await expect(page.locator("body")).not.toContainText(canary);
}

test("composes the operational dashboard from session-scoped reads", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const requests = await open(page, { arabic });
  await page.goto("/company/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Edara Labs" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", arabic ? "rtl" : "ltr");
  const demo = page.getByRole("region", { name: copy["dashboard.demo.title"] });
  await expect(demo).toContainText(copy["dashboard.demo.badge"]);
  await expect(demo).toContainText(copy["dashboard.demo.events"]);
  await expect(demo).toContainText(copy["dashboard.demo.departmentMix"]);
  await expect(demo).toContainText(copy["dashboard.demo.shortcuts"]);
  await expect(page.getByText(copy["requirement.COMPANY_PROFILE_INCOMPLETE"])).toBeVisible();
  await expect(page.getByText(copy["email.ready"])).toBeVisible();
  await expect(page.getByText("Growth")).toBeVisible();
  await expect(page.getByRole("link", { name: copy["setup.open"] })).toHaveAttribute(
    "href",
    "/company/setup",
  );
  await expectCalmLayout(page);
  const companyReads = requests.filter((request) => request.key !== "GET /api/v1/company/me");
  expect(companyReads.every((request) => request.authorization === "Bearer access-canary")).toBe(
    true,
  );
  expect(requests.some((request) => /\/companies\/|\/platform\//.test(request.key))).toBe(false);
});

test("saves the organization profile separately from the personal profile", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const requests = await open(page, { arabic });
  await page.goto("/company/profile");
  await expect(
    page.getByRole("heading", { level: 1, name: copy["profile.pageTitle"] }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("link", { name: copy["profile.personalLink"] }),
  ).toHaveAttribute("href", "/company/me/profile");
  const phone = page.getByLabel(copy["profile.field.phone"]);
  await phone.fill("+20 100 000 0000");
  await page.getByRole("button", { name: copy["profile.save"] }).click();
  await expect(page.getByText(copy["profile.savedIncomplete"])).toBeVisible();
  expect(requests.filter((request) => request.key === "PATCH /api/v1/company/profile")).toEqual([
    {
      key: "PATCH /api/v1/company/profile",
      authorization: "Bearer access-canary",
      body: { phone: "+20 100 000 0000" },
    },
  ]);
  await expectCalmLayout(page);
});

test("reconciles a stale setup transition and confirms a skip by keyboard", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const requests = await open(page, { arabic });
  await page.goto("/company/setup");
  const roles = copy["step.SET_ROLES"];
  await page
    .getByRole("button", { name: copy["setup.command.start.label"].replace("{{step}}", roles) })
    .click();
  await expect(page.getByText(copy["setup.stale"])).toBeVisible();
  // The refreshed server state now offers completion instead of a second start.
  await expect(
    page.getByRole("button", {
      name: copy["setup.command.complete.label"].replace("{{step}}", roles),
    }),
  ).toBeVisible();
  expect(requests.filter((request) => request.key.endsWith("/start"))).toHaveLength(1);

  const skip = page.getByRole("button", {
    name: copy["setup.command.skip.label"].replace("{{step}}", roles),
  });
  await skip.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toContainText(copy["setup.skipConfirm.required"]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(skip).toBeFocused();
  expect(requests.some((request) => request.key.endsWith("/skip"))).toBe(false);
  await expectCalmLayout(page);
});

for (const mode of ["READ_ONLY", "FROZEN", "MAINTENANCE"] as const)
  test(`keeps reads and disables writes in ${mode} mode`, async ({ page }, info) => {
    const arabic = info.project.name === "chromium-rtl";
    const copy = arabic ? ar : en;
    await open(page, { arabic, mode });
    await page.goto("/company/setup");
    await expect(page.getByRole("heading", { name: copy[`access.${mode}.title`] })).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: copy["setup.command.start.label"].replace("{{step}}", copy["step.SET_ROLES"]),
      }),
    ).toBeDisabled();
    await page.goto("/company/profile");
    await expect(page.getByLabel(copy["profile.field.name"])).toBeDisabled();
    await expect(page.getByRole("button", { name: copy["profile.save"] })).toHaveCount(0);
  });

test("shows the Company blocked state while SELF stays reachable", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const blocked = (route: Route) =>
    route.fulfill({
      status: 403,
      json: problemBody(403, { code: "COMPANY_ACCESS_DENIED", mode: "BLOCKED", reason: null }),
    });
  await open(page, {
    arabic,
    reads: { "GET /api/v1/company/setup": blocked, "GET /api/v1/company/access-policy": blocked },
  });
  await page.goto("/company/setup");
  await expect(
    page.getByRole("heading", {
      name: arabic ? "مساحة عمل شركتك غير متاحة" : "Your company workspace is unavailable",
    }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("internal-detail-canary");
});

test("refuses a known organization route without its read permission", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const requests = await open(page, { arabic, permissions: ["company-profiles:read"] });
  await page.goto("/company/setup");
  await expect(
    page.getByRole("heading", {
      name: arabic ? "هذه المساحة غير متاحة لك" : "This area is not available to you",
    }),
  ).toBeVisible();
  expect(requests.some((request) => request.key === "GET /api/v1/company/setup")).toBe(false);
});
