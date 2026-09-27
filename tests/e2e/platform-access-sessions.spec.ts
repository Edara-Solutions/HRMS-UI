import { expect, type Page, type Route, test } from "@playwright/test";
import ar from "../../public/locales/ar/platform-access-session.json" with { type: "json" };
import arCompanies from "../../public/locales/ar/platform-companies.json" with { type: "json" };
import en from "../../public/locales/en/platform-access-session.json" with { type: "json" };
import enCompanies from "../../public/locales/en/platform-companies.json" with { type: "json" };
import { companySessionFixture, platformSessionFixture } from "../../src/test/audience-fixtures";
import { problemBody } from "../../src/test/operation-fakes";
import {
  accessSessionBody,
  delegatedEmailSettingsBody,
  delegatedEmployeeBody,
  delegatedProfileBody,
  delegatedRolesBody,
  delegatedSendingDomainBody,
  delegatedStepBody,
  delegatedUsersBody,
  everyDelegatedPermission,
  accessSessionIds as ids,
} from "../../src/test/platform-access-session-fixtures";
import {
  companyActivationBody,
  companyBody,
  companyCommercialBody,
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
  overrides: Record<string, (route: Route) => Promise<void>> = {},
) {
  const session = platformSessionFixture({
    permissions: [...companyPermissions, ...everyDelegatedPermission],
  });
  const company = companySessionFixture();
  await page.setViewportSize(arabic ? { width: 390, height: 844 } : { width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(
    ({ session, company, arabic }) => {
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
            state: { locale: arabic ? "ar" : "en", theme: arabic ? "dark" : "light", scopes: {} },
          }),
        );
    },
    { session, company, arabic },
  );
  let closed = false;
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
    if (path.endsWith("/notifications/unread-count"))
      return route.fulfill({ json: { unreadCount: 0 } });
    if (path.endsWith("/notifications"))
      return route.fulfill({ json: { items: [], nextCursor: null, hasMore: false } });
    const companyRoot = `/api/v1/platform/companies/${ids.company}`;
    if (path === companyRoot) return route.fulfill({ json: companyBody() });
    if (path === `${companyRoot}/access-policy`)
      return route.fulfill({ json: companyPolicyBody() });
    if (path === `${companyRoot}/activation`)
      return route.fulfill({ json: companyActivationBody() });
    if (path === `${companyRoot}/commercial-config`)
      return route.fulfill({ json: companyCommercialBody() });
    if (path === `${companyRoot}/subscription`)
      return route.fulfill({ json: companySubscriptionBody() });
    const closedBody = () =>
      accessSessionBody({ status: "CLOSED", closedAt: new Date().toISOString() });
    if (key === "POST /api/v1/platform/access-sessions")
      return route.fulfill({ status: 201, json: accessSessionBody() });
    const root = `/api/v1/platform/access-sessions/${ids.session}`;
    if (path === root) return route.fulfill({ json: closed ? closedBody() : accessSessionBody() });
    if (path === `${root}/close`) {
      closed = true;
      return route.fulfill({ json: closedBody() });
    }
    if (closed) return route.fulfill({ status: 403, json: problemBody(403) });
    if (path === `${root}/users`) return route.fulfill({ json: delegatedUsersBody() });
    if (path === `${root}/users/${ids.employee}`)
      return route.fulfill({
        json:
          request.method() === "PATCH"
            ? delegatedEmployeeBody({ phone: "0100" })
            : delegatedEmployeeBody(),
      });
    if (path === `${root}/roles`) return route.fulfill({ json: delegatedRolesBody() });
    if (path === `${root}/profile`) return route.fulfill({ json: delegatedProfileBody() });
    if (path === `${root}/setup`)
      return route.fulfill({ json: { templateVersion: 1, steps: [delegatedStepBody()] } });
    if (path === `${root}/email-settings`)
      return route.fulfill({ json: delegatedEmailSettingsBody() });
    if (path === `${root}/email-readiness`) return route.fulfill({ json: { ready: true } });
    if (path === `${root}/email-template-assignments`)
      return route.fulfill({ json: { items: [] } });
    if (path === `${root}/sending-domain`)
      return route.fulfill({ json: delegatedSendingDomainBody() });
    if (path === `${root}/audit-trail`)
      return route.fulfill({ json: { items: [], nextCursor: null, hasMore: false } });
    return route.fulfill({ status: 404, json: problemBody(404) });
  });
  return { requests };
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}

test("opens a support session, corrects an employee and closes terminally", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const companies = arabic ? arCompanies : enCompanies;
  const { requests } = await open(page, arabic);
  await page.goto(`/platform/companies/${ids.company}`);
  await page.getByRole("button", { name: companies["support.open"], exact: true }).click();
  const entry = page.getByRole("dialog");
  await expect(entry).toBeFocused();
  await entry.getByRole("combobox").click();
  await page.getByRole("option", { name: companies["support.reasons.SUPPORT_REQUEST"] }).click();
  await entry.getByRole("button", { name: companies["support.confirm"], exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/platform/access-sessions/${ids.session}`));
  expect(
    requests.find((request) => request.key === "POST /api/v1/platform/access-sessions")?.body,
  ).toEqual({ companyPublicId: ids.company, reason: "SUPPORT_REQUEST" });

  await expect(page.getByText("Omar Said")).toBeVisible();
  for (const area of ["employees", "roles", "profile", "email", "audit"])
    await expect(page.getByRole("tab", { name: copy[`area.${area}`] })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: `test-results/s11-${arabic ? "ar" : "en"}.png`, fullPage: true });

  await page.getByRole("button", { name: copy["employees.correct"] }).click();
  const correction = page.getByRole("dialog");
  await correction.getByLabel(copy["correction.field.phone"]).fill("0100");
  await correction.getByRole("button", { name: copy["correction.save"], exact: true }).click();
  await expect(correction.getByRole("status")).toContainText(copy["outcome.confirmed"]);
  const patch = requests.filter((request) => request.key.startsWith("PATCH"));
  expect(patch.map((request) => request.body)).toEqual([{ phone: "0100" }]);
  await expect(correction.getByRole("button", { name: copy.cancel, exact: true })).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(correction).toHaveCount(0);

  for (const area of ["roles", "profile", "email", "audit"]) {
    await page.getByRole("tab", { name: copy[`area.${area}`] }).click();
    await expect(page.getByRole("tab", { name: copy[`area.${area}`] })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await noOverflow(page);
  }

  await page.getByRole("button", { name: copy["close.action"], exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: copy["close.confirm"], exact: true })
    .click();
  await expect(page.getByText(copy["ended.inactive.title"])).toBeVisible();
  await expect(page.getByText("Omar Said")).toHaveCount(0);
  expect(requests.filter((request) => request.key.endsWith("/close"))).toHaveLength(1);
  expect(
    requests.every((request) => request.authorization !== null || request.key.includes("/locales")),
  ).toBe(true);
  await expect(page.locator("body")).not.toContainText("canary");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await noOverflow(page);
});

test("conceals a foreign session and rejects a malformed identifier", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const { requests } = await open(page, arabic, {
    [`GET /api/v1/platform/access-sessions/${ids.session}`]: (route) =>
      route.fulfill({ status: 404, json: problemBody(404) }),
  });
  await page.goto(`/platform/access-sessions/${ids.session}`);
  await expect(page.getByText("404")).toBeVisible();
  await page.goto("/platform/access-sessions/not-a-session");
  await expect(page.getByText("404")).toBeVisible();
  expect(requests.some((request) => request.key.includes("not-a-session"))).toBe(false);
  expect(requests.some((request) => request.key.includes("/users"))).toBe(false);
  await expect(page.locator("body")).not.toContainText("canary");
});
