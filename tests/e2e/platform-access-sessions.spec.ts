import { type BrowserContext, expect, type Page, type Route, test } from "@playwright/test";
import arOrganization from "../../public/locales/ar/organization.json" with { type: "json" };
import arPeople from "../../public/locales/ar/people.json" with { type: "json" };
import ar from "../../public/locales/ar/platform-access-session.json" with { type: "json" };
import enOrganization from "../../public/locales/en/organization.json" with { type: "json" };
import enPeople from "../../public/locales/en/people.json" with { type: "json" };
import en from "../../public/locales/en/platform-access-session.json" with { type: "json" };
import { companySessionFixture, platformSessionFixture } from "../../src/test/audience-fixtures";
import {
  accessPolicyBody,
  activationBody,
  profileBody,
  registryBody,
  setupBody,
  setupStep,
  subscriptionBody,
} from "../../src/test/company-organization-fixtures";
import { peopleIds, rosterBody } from "../../src/test/company-people-fixtures";
import {
  diagnosticCatalogueBody,
  diagnosticPreviewBody,
  diagnosticReceiptBody,
  diagnosticsPermissions,
} from "../../src/test/email-diagnostics-fixtures";
import { problemBody } from "../../src/test/operation-fakes";
import {
  accessRequestBody,
  accessRequestIds,
  accessSessionBody,
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

interface Recorded {
  key: string;
  authorization: string | null;
  body: unknown;
}

type Scope = "READ" | "CHANGE";
type Actor = "operator" | "approver";

const delegatedToken = "delegated-token";
const requestNote = "Reproduce the failed payroll export. Ticket SUP-1234.";
const endNote = "The customer withdrew the request.";
const bannerTitle = { en: "Edara support access", ar: "وصول دعم إدارة" };
const bannerLeave = { en: "Leave", ar: "مغادرة" };

const readGrant = [
  "users:read",
  "roles:read",
  "companies:read",
  "company-profiles:read",
  "company-setup:read",
  "company-subscriptions:read",
  "company-activation:read",
  "company-access-policies:read",
  "companies:email-readiness:read",
];
const delegateGrants: Record<Scope, string[]> = {
  READ: readGrant,
  CHANGE: [...readGrant, "users:update", "company-profiles:update", "company-setup:update"],
};

const actors = {
  operator: platformSessionFixture(
    {
      publicId: ids.operator,
      firstName: "Sara",
      lastName: "Haddad",
      permissions: [...companyPermissions, ...everyDelegatedPermission],
    },
    { accessToken: "operator-token" },
  ),
  approver: platformSessionFixture(
    {
      publicId: ids.approver,
      firstName: "Omar",
      lastName: "Nasser",
      permissions: [...companyPermissions, "delegation:approve"],
    },
    { accessToken: "approver-token" },
  ),
};

class AccessWorld {
  request: ReturnType<typeof accessRequestBody> | null = null;
  session: ReturnType<typeof accessSessionBody> | null = null;
  sessionLifetimeMs = 60 * 60_000;
  profileRefusal: string | null = null;
  readonly calls: Recorded[] = [];

  sent(key: string) {
    return this.calls.filter((call) => call.key === key);
  }

  requestView() {
    if (!this.request) return null;
    const session = this.session;
    return {
      ...this.request,
      session: session && {
        publicId: session.publicId,
        status: session.status,
        expiresAt: session.expiresAt,
        endNote: session.endNote,
        fromThisSignIn: true,
      },
    };
  }

  delegateLive() {
    return (
      this.session?.status === "OPEN" && Date.parse(String(this.session.expiresAt)) > Date.now()
    );
  }

  delegateUser() {
    const session = this.session;
    if (!session) throw new Error("No session to describe");
    const scope: Scope = session.scope === "CHANGE" ? "CHANGE" : "READ";
    return companySessionFixture({
      publicId: ids.operator,
      firstName: "Sara",
      lastName: "Haddad",
      companyPublicId: ids.company,
      employeeCode: "",
      permissions: delegateGrants[scope],
      delegation: {
        accessSessionPublicId: ids.session,
        companyName: "Acme Company",
        reason: "INCIDENT_RESPONSE",
        scope,
        expiresAt: String(session.expiresAt),
      },
    }).user;
  }

  openFrom(scope: Scope) {
    this.request = accessRequestBody({
      state: "USED",
      decider: { publicId: accessRequestIds.approver, name: "Omar Nasser" },
      decidedAt: new Date().toISOString(),
      grantedScope: "CHANGE",
      grantedMinutes: 120,
      windowEndsAt: new Date(Date.now() + 3_600_000).toISOString(),
    });
    this.session = accessSessionBody({
      reason: "INCIDENT_RESPONSE",
      scope,
      expiresAt: new Date(Date.now() + this.sessionLifetimeMs).toISOString(),
    });
  }
}

async function platformRoute(world: AccessWorld, actor: Actor, route: Route, path: string) {
  const request = route.request();
  const key = `${request.method()} ${path}`;
  const identity = actors[actor];
  const body: Record<string, unknown> = request.postData()
    ? JSON.parse(request.postData() ?? "{}")
    : {};
  if (path === "/api/v1/platform/me") return route.fulfill({ json: identity.user });
  if (path.endsWith("/notifications/unread-count"))
    return route.fulfill({ json: { unreadCount: 0 } });
  if (path.endsWith("/notifications"))
    return route.fulfill({ json: { items: [], nextCursor: null, hasMore: false } });
  const companyRoot = `/api/v1/platform/companies/${ids.company}`;
  if (path === companyRoot) return route.fulfill({ json: companyBody() });
  if (path === `${companyRoot}/access-policy`) return route.fulfill({ json: companyPolicyBody() });
  if (path === `${companyRoot}/activation`) return route.fulfill({ json: companyActivationBody() });
  if (path === `${companyRoot}/commercial-config`)
    return route.fulfill({ json: companyCommercialBody() });
  if (path === `${companyRoot}/subscription`)
    return route.fulfill({ json: companySubscriptionBody() });

  const requests = "/api/v1/platform/access-requests";
  const sessions = "/api/v1/platform/access-sessions";
  const view = world.requestView();
  if (key === `GET ${requests}/mine`)
    return route.fulfill({
      json: { items: view && view.requester.publicId === ids.operator ? [view] : [] },
    });
  if (key === `GET ${requests}`) {
    const pending = view?.state === "PENDING";
    const wantsReview = new URL(request.url()).searchParams.get("view") === "review";
    return route.fulfill({ json: { items: view && pending === wantsReview ? [view] : [] } });
  }
  if (key === `POST ${requests}`) {
    world.request = accessRequestBody({
      reason: body.reason,
      scope: body.scope,
      requestedMinutes: body.requestedMinutes,
      note: body.note,
    });
    return route.fulfill({ status: 201, json: world.requestView() });
  }
  if (key === `POST ${requests}/${accessRequestIds.request}/approve`) {
    world.request = accessRequestBody({
      ...world.request,
      state: "APPROVED",
      decider: { publicId: ids.approver, name: "Omar Nasser" },
      decidedAt: new Date().toISOString(),
      grantedScope: body.scope,
      grantedMinutes: body.minutes,
      windowEndsAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    return route.fulfill({ json: world.requestView() });
  }
  if (key === `POST ${sessions}`) {
    world.session = accessSessionBody({
      reason: world.request?.reason,
      scope: world.request?.grantedScope,
      expiresAt: new Date(Date.now() + world.sessionLifetimeMs).toISOString(),
    });
    world.request = accessRequestBody({ ...world.request, state: "USED" });
    return route.fulfill({ status: 201, json: world.session });
  }
  if (key === `GET ${sessions}/live`)
    return route.fulfill({ json: { items: world.delegateLive() ? [world.session] : [] } });
  const root = `${sessions}/${ids.session}`;
  if (key === `GET ${root}`)
    return world.session
      ? route.fulfill({ json: world.session })
      : route.fulfill({ status: 404, json: problemBody(404) });
  if (key === `POST ${root}/enter`) {
    if (!world.delegateLive())
      return route.fulfill({
        status: 403,
        json: problemBody(403, { code: "ACCESS_SESSION_INACTIVE" }),
      });
    return route.fulfill({
      json: { accessToken: delegatedToken, expiresIn: 3600, companyPublicId: ids.company },
    });
  }
  if (key === `POST ${root}/close`) {
    world.session = accessSessionBody({
      ...world.session,
      status: "CLOSED",
      closedAt: new Date().toISOString(),
    });
    return route.fulfill({ json: world.session });
  }
  if (key === `POST ${root}/end`) {
    world.session = accessSessionBody({
      ...world.session,
      status: "ENDED",
      closedAt: new Date().toISOString(),
      endedBy: { publicId: ids.approver, name: "Omar Nasser" },
      endNote: body.note,
    });
    return route.fulfill({ json: world.session });
  }
  if (path === `${root}/audit-trail`)
    return route.fulfill({ json: { items: [], nextCursor: null, hasMore: false } });
  if (path === `${root}/email-diagnostics/types`) return route.fulfill({ json: { items: [] } });
  return route.fulfill({ status: 404, json: problemBody(404) });
}

async function companyRoute(world: AccessWorld, route: Route, path: string) {
  const request = route.request();
  if (request.headers().authorization !== `Bearer ${delegatedToken}` || !world.delegateLive())
    return route.fulfill({ status: 401, json: problemBody(401) });
  switch (`${request.method()} ${path}`) {
    case "GET /api/v1/company/me":
      return route.fulfill({ json: world.delegateUser() });
    case "GET /api/v1/company/registry":
      return route.fulfill({ json: registryBody() });
    case "GET /api/v1/company/activation":
      return route.fulfill({ json: activationBody() });
    case "GET /api/v1/company/subscription":
      return route.fulfill({ json: subscriptionBody() });
    case "GET /api/v1/company/access-policy":
      return route.fulfill({ json: accessPolicyBody("NORMAL") });
    case "GET /api/v1/company/email-readiness":
      return route.fulfill({ json: { ready: true } });
    case "GET /api/v1/company/profile":
      return route.fulfill({ json: profileBody() });
    case "GET /api/v1/company/setup":
      return route.fulfill({
        json: setupBody([setupStep("SET_COMPANY_PROFILE", "IN_PROGRESS")]),
      });
    case "GET /api/v1/company/overview":
      return route.fulfill({ json: {} });
    case "GET /api/v1/company/users":
      return route.fulfill({ json: rosterBody([peopleIds.colleague, peopleIds.owner]) });
    case "PATCH /api/v1/company/profile":
      if (world.profileRefusal)
        return route.fulfill({
          status: 403,
          json: problemBody(403, { detail: world.profileRefusal }),
        });
      return route.fulfill({ json: profileBody({ phone: "+20 100 000 0000" }) });
    default:
      return route.fulfill({ status: 404, json: problemBody(404) });
  }
}

async function signIn(
  context: BrowserContext,
  world: AccessWorld,
  actor: Actor,
  arabic: boolean,
  companyMember = false,
) {
  const member = companyMember ? companySessionFixture({ companyPublicId: ids.company }) : null;
  await context.addInitScript(
    ({ session, member, arabic }) => {
      if (window.location.origin === "null") return;
      if (localStorage.getItem("hrms-preferences:v2")) return;
      function seed(audience: string, identity: unknown) {
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
      seed("platform", session);
      if (member) seed("company", member);
      localStorage.setItem(
        "hrms-preferences:v2",
        JSON.stringify({
          version: 2,
          state: { locale: arabic ? "ar" : "en", theme: arabic ? "dark" : "light", scopes: {} },
        }),
      );
    },
    { session: actors[actor], member, arabic },
  );
  await context.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    world.calls.push({
      key: `${request.method()} ${path}`,
      authorization: request.headers().authorization ?? null,
      body: request.postData() ? JSON.parse(request.postData() ?? "") : undefined,
    });
    return path.startsWith("/api/v1/company/")
      ? companyRoute(world, route, path)
      : platformRoute(world, actor, route, path);
  });
}

async function prepare(page: Page, arabic: boolean) {
  await page.setViewportSize(arabic ? { width: 390, height: 844 } : { width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
}

async function choose(page: Page, label: string, option: string) {
  await page.getByRole("dialog").getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

function hours(copy: typeof en | typeof ar, count: number) {
  return copy["access.length.hours_other"].replace("{{count}}", String(count));
}

async function enterPortal(page: Page, copy: typeof en | typeof ar, arabic: boolean) {
  const opened = page.context().waitForEvent("page");
  await page.getByRole("button", { name: copy["portal.open"], exact: true }).click();
  const portal = await opened;
  await prepare(portal, arabic);
  await expect(portal).toHaveURL(/\/company(\/dashboard)?$/);
  await expect(
    portal.getByRole("region", { name: bannerTitle[arabic ? "ar" : "en"] }),
  ).toBeVisible();
  return portal;
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
}

test("an operator requests, a different approver narrows, and the session enters the Company portal read only until closed", async ({
  page,
  browser,
}, info) => {
  test.slow();
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const organization = arabic ? arOrganization : enOrganization;
  const locale = arabic ? "ar" : "en";
  const world = new AccessWorld();
  await signIn(page.context(), world, "operator", arabic);
  await prepare(page, arabic);

  await page.goto(`/platform/companies/${ids.company}`);
  await page.getByRole("button", { name: copy["access.card.request"], exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeFocused();
  await expect(dialog.getByRole("button", { name: copy["access.request.confirm"] })).toBeDisabled();
  await choose(page, copy["access.field.reason"], copy["reason.INCIDENT_RESPONSE"]);
  await choose(page, copy["access.field.scope"], copy["access.scope.CHANGE"]);
  await choose(page, copy["access.field.length"], hours(copy, 2));
  await dialog.getByRole("textbox", { name: copy["access.note.requestLabel"] }).fill(requestNote);
  await dialog.getByRole("button", { name: copy["access.request.confirm"] }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText(copy["access.display.PENDING"])).toBeVisible();
  expect(world.sent("POST /api/v1/platform/access-requests").map((call) => call.body)).toEqual([
    {
      companyPublicId: ids.company,
      reason: "INCIDENT_RESPONSE",
      scope: "CHANGE",
      requestedMinutes: 120,
      note: requestNote,
    },
  ]);
  await noOverflow(page);

  const approverContext = await browser.newContext({ locale: arabic ? "ar" : "en-US" });
  await signIn(approverContext, world, "approver", arabic);
  const approver = await approverContext.newPage();
  await prepare(approver, arabic);
  await approver.goto("/platform/access-requests?tab=review");
  await approver.getByRole("button", { name: copy["access.approve.confirm"], exact: true }).click();
  const decision = approver.getByRole("dialog");
  await choose(approver, copy["access.field.scope"], copy["access.scope.READ"]);
  await choose(approver, copy["access.field.length"], hours(copy, 1));
  await decision.getByRole("button", { name: copy["access.approve.confirm"], exact: true }).click();
  await expect(decision).toHaveCount(0);
  await expect(approver.getByText(copy["access.empty.review"])).toBeVisible();
  const approveKey = `POST /api/v1/platform/access-requests/${accessRequestIds.request}/approve`;
  expect(world.sent(approveKey).map((call) => call.body)).toEqual([{ scope: "READ", minutes: 60 }]);
  expect(world.sent(approveKey)[0]?.authorization).toBe("Bearer approver-token");
  await noOverflow(approver);
  await approverContext.close();

  await page.reload();
  await expect(page.getByText(copy["access.narrowedByApprover"])).toBeVisible();
  await page.getByRole("button", { name: copy["access.card.open"], exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/platform/access-sessions/${ids.session}`));
  expect(world.sent("POST /api/v1/platform/access-sessions")[0]?.body).toEqual({
    requestPublicId: accessRequestIds.request,
  });
  await expect(page.getByText(copy["rail.readOnly"])).toBeVisible();
  await noOverflow(page);
  for (const area of ["area.audit", "area.diagnostics"] as const) {
    const tab = page.getByRole("tab", { name: copy[area] });
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    await noOverflow(page);
  }

  const portal = await enterPortal(page, copy, arabic);
  await expect(
    portal.getByRole("region", { name: bannerTitle[locale] }).getByText(copy["access.scope.READ"], {
      exact: false,
    }),
  ).toBeVisible();
  await portal.goto("/company/profile");
  await expect(
    portal.getByRole("heading", { level: 1, name: organization["profile.pageTitle"] }),
  ).toBeVisible();
  await expect(
    portal.locator("dt", { hasText: organization["profile.field.phone"] }),
  ).toBeVisible();
  await expect(portal.getByRole("button", { name: organization["profile.save"] })).toHaveCount(0);
  await expect(portal.getByRole("textbox")).toHaveCount(0);
  await noOverflow(portal);
  const companyCalls = world.calls.filter((call) => call.key.includes("/api/v1/company/"));
  expect(companyCalls.length).toBeGreaterThan(0);
  expect(companyCalls.every((call) => call.authorization === `Bearer ${delegatedToken}`)).toBe(
    true,
  );
  expect(companyCalls.some((call) => !call.key.startsWith("GET "))).toBe(false);

  await page.getByRole("button", { name: copy["close.action"], exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: copy["close.confirm"], exact: true })
    .click();
  await expect(page.getByText(copy["ended.inactive.title"])).toBeVisible();
  await expect(page.getByRole("button", { name: copy["portal.open"] })).toHaveCount(0);
  expect(world.sent(`POST /api/v1/platform/access-sessions/${ids.session}/close`)).toHaveLength(1);
  await expect(portal.getByRole("region", { name: bannerTitle[locale] })).toHaveCount(0);
  await expect(portal.locator("dt", { hasText: organization["profile.field.phone"] })).toHaveCount(
    0,
  );
  await expect(portal).toHaveURL(new RegExp(`/platform/access-sessions/${ids.session}`), {
    timeout: 20_000,
  });
  await expect(portal.getByText(copy["ended.inactive.title"])).toBeVisible({
    timeout: 20_000,
  });
  expect(world.calls.every((call) => call.authorization !== null)).toBe(true);
  await expect(page.locator("body")).not.toContainText("canary");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await noOverflow(page);
});

test("a Read and change session saves in the portal, keeps withheld actions out, and shows a server refusal without retrying", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const organization = arabic ? arOrganization : enOrganization;
  const people = arabic ? arPeople : enPeople;
  const world = new AccessWorld();
  world.openFrom("CHANGE");
  await signIn(page.context(), world, "operator", arabic);
  await prepare(page, arabic);
  await page.goto(`/platform/access-sessions/${ids.session}`);
  const portal = await enterPortal(page, copy, arabic);

  await portal.goto("/company/people");
  await expect(portal.getByRole("table")).toBeVisible();
  await expect(portal.getByRole("button", { name: people["create.open"] })).toHaveCount(0);

  await portal.goto("/company/profile");
  const phone = portal.getByLabel(organization["profile.field.phone"]);
  await phone.fill("+20 100 000 0000");
  await portal.getByRole("button", { name: organization["profile.save"] }).click();
  await expect(portal.getByText(organization["profile.savedIncomplete"])).toBeVisible();
  const patchKey = "PATCH /api/v1/company/profile";
  expect(world.sent(patchKey)).toEqual([
    {
      key: patchKey,
      authorization: `Bearer ${delegatedToken}`,
      body: { phone: "+20 100 000 0000" },
    },
  ]);

  world.profileRefusal = "ACCESS_SESSION_WITHHELD";
  await phone.fill("+20 100 000 0001");
  await portal.getByRole("button", { name: organization["profile.save"] }).click();
  await expect(portal.getByText(organization["profile.refused"])).toBeVisible();
  await expect(phone).toHaveValue("+20 100 000 0001");
  expect(world.sent(patchKey)).toHaveLength(2);
  await noOverflow(portal);
  await expect(portal.locator("body")).not.toContainText("ACCESS_SESSION_WITHHELD");
});

test("an approver cannot decide their own request", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const world = new AccessWorld();
  world.request = accessRequestBody({
    requester: { publicId: ids.approver, name: "Omar Nasser" },
  });
  await signIn(page.context(), world, "approver", arabic);
  await prepare(page, arabic);
  await page.goto("/platform/access-requests?tab=review");
  await expect(page.getByText(copy["access.review.own"])).toBeVisible();
  await expect(page.getByRole("button", { name: copy["access.approve.confirm"] })).toHaveCount(0);
  await expect(page.getByRole("button", { name: copy["access.reject.confirm"] })).toHaveCount(0);
  await noOverflow(page);
});

test("an approver ending a live session removes portal access on the next action", async ({
  page,
  browser,
}, info) => {
  test.slow();
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const world = new AccessWorld();
  world.openFrom("CHANGE");
  await signIn(page.context(), world, "operator", arabic);
  await prepare(page, arabic);
  await page.goto(`/platform/access-sessions/${ids.session}`);
  const portal = await enterPortal(page, copy, arabic);

  const approverContext = await browser.newContext({ locale: arabic ? "ar" : "en-US" });
  await signIn(approverContext, world, "approver", arabic);
  const approver = await approverContext.newPage();
  await prepare(approver, arabic);
  await approver.goto("/platform/access-requests?tab=live");
  await approver.getByRole("button", { name: copy["access.end.confirm"], exact: true }).click();
  const dialog = approver.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: copy["access.end.confirm"], exact: true });
  await expect(confirm).toBeDisabled();
  await dialog.getByRole("textbox", { name: copy["access.note.endLabel"] }).fill(endNote);
  await confirm.click();
  await expect(approver.getByText(copy["access.empty.live"])).toBeVisible();
  expect(world.sent(`POST /api/v1/platform/access-sessions/${ids.session}/end`)[0]?.body).toEqual({
    note: endNote,
  });
  await approverContext.close();

  await portal.goto("/company/profile");
  await expect(portal).toHaveURL(new RegExp(`/platform/access-sessions/${ids.session}`));
  await expect(portal.getByText(copy["ended.inactive.title"])).toBeVisible({
    timeout: 20_000,
  });
  await expect(portal.getByText(copy["status.ENDED"])).toBeVisible();
  await expect(portal.getByText(endNote)).toBeVisible();
  await noOverflow(portal);
});

test("expiry ends portal access and returns the operator to the ended session", async ({
  page,
}, info) => {
  test.slow();
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const world = new AccessWorld();
  world.sessionLifetimeMs = 20_000;
  world.openFrom("READ");
  await signIn(page.context(), world, "operator", arabic);
  await prepare(page, arabic);
  await page.goto(`/platform/access-sessions/${ids.session}`);
  const portal = await enterPortal(page, copy, arabic);
  await expect(portal).toHaveURL(new RegExp(`/platform/access-sessions/${ids.session}`), {
    timeout: 30_000,
  });
  await expect(portal.getByText(copy["ended.inactive.title"])).toBeVisible({
    timeout: 20_000,
  });
  await expect(portal.getByText(copy["status.EXPIRED"]).first()).toBeVisible();
  await expect(page.getByText(copy["ended.inactive.title"])).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: copy["portal.open"] })).toHaveCount(0);
  await noOverflow(portal);
});

test("the leave control returns to the session without closing it", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const world = new AccessWorld();
  world.openFrom("READ");
  await signIn(page.context(), world, "operator", arabic);
  await prepare(page, arabic);
  await page.goto(`/platform/access-sessions/${ids.session}`);
  const portal = await enterPortal(page, copy, arabic);
  await portal
    .getByRole("region", { name: bannerTitle[arabic ? "ar" : "en"] })
    .getByRole("button", { name: bannerLeave[arabic ? "ar" : "en"], exact: true })
    .click();
  await expect(portal).toHaveURL(new RegExp(`/platform/access-sessions/${ids.session}`));
  await expect(portal.getByRole("button", { name: copy["portal.open"] })).toBeVisible();
  expect(world.sent(`POST /api/v1/platform/access-sessions/${ids.session}/close`)).toHaveLength(0);
});

test("entry is refused while a Company member is signed in to this browser", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const world = new AccessWorld();
  world.openFrom("READ");
  await signIn(page.context(), world, "operator", arabic, true);
  await prepare(page, arabic);
  await page.goto(`/platform/access-sessions/${ids.session}`);
  await page.getByRole("button", { name: copy["portal.open"], exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: copy["portal.failed"] })).toBeVisible();
  await expect.poll(() => page.context().pages().length).toBe(1);
  const stored = await page.evaluate(() => localStorage.getItem("hrms-company-session:v1"));
  expect(stored).toContain("sara@example.test");
  expect(stored).not.toContain(delegatedToken);
});

async function openDiagnostics(
  page: Page,
  arabic: boolean,
  overrides: Record<string, (route: Route) => Promise<void>> = {},
  diagnosticMode?:
    | "normal"
    | "unknown"
    | "limited"
    | "inactive"
    | "permission"
    | "notReady"
    | "conflict"
    | "unprocessable"
    | "contract",
) {
  const session = platformSessionFixture({
    permissions: [
      ...companyPermissions,
      ...everyDelegatedPermission,
      ...(diagnosticMode ? diagnosticsPermissions : []),
    ],
  });
  await page.setViewportSize(arabic ? { width: 390, height: 844 } : { width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(
    ({ session, company, arabic }) => {
      for (const [audience, identity] of [
        ["platform", session],
        ["company", company],
      ] as const) {
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
      if (!localStorage.getItem("hrms-preferences:v2"))
        localStorage.setItem(
          "hrms-preferences:v2",
          JSON.stringify({
            version: 2,
            state: { locale: arabic ? "ar" : "en", theme: arabic ? "dark" : "light", scopes: {} },
          }),
        );
    },
    { session, company: companySessionFixture(), arabic },
  );
  let diagnosticAttempts = 0;
  const requests: Recorded[] = [];
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
    const root = `/api/v1/platform/access-sessions/${ids.session}`;
    const diagnosticRoot = `${root}/email-diagnostics`;
    if (path === `${diagnosticRoot}/types`)
      return route.fulfill({ json: diagnosticCatalogueBody() });
    if (path.endsWith("/preview") && path.startsWith(diagnosticRoot))
      return route.fulfill({
        json: diagnosticPreviewBody(new URL(request.url()).searchParams.get("locale") ?? "en"),
      });
    if (path === `${diagnosticRoot}/test-sends`) {
      diagnosticAttempts += 1;
      const body = JSON.parse(request.postData() ?? "{}");
      if (diagnosticMode === "unknown" && diagnosticAttempts === 1)
        return route.fulfill({ status: 500, json: problemBody(500) });
      if (diagnosticMode === "limited")
        return route.fulfill({
          status: 429,
          json: problemBody(429, { code: "DIAGNOSTIC_RATE_LIMITED", retryAfterSeconds: 2 }),
        });
      if (diagnosticMode === "inactive" || diagnosticMode === "permission")
        return route.fulfill({
          status: 403,
          json: problemBody(403, {
            code: diagnosticMode === "inactive" ? "ACCESS_SESSION_INACTIVE" : "PERMISSION_DENIED",
          }),
        });
      if (diagnosticMode === "notReady" || diagnosticMode === "conflict")
        return route.fulfill({
          status: 409,
          json: problemBody(409, {
            code:
              diagnosticMode === "notReady"
                ? "EMAIL_DIAGNOSTIC_NOT_READY"
                : "DIAGNOSTIC_REQUEST_CONFLICT",
          }),
        });
      if (diagnosticMode === "unprocessable")
        return route.fulfill({ status: 422, json: problemBody(422) });
      return route.fulfill({
        status: 202,
        json: diagnosticReceiptBody(body.requestId, {
          emailTypeKey: body.emailTypeKey,
          locale: body.locale,
          ...(diagnosticMode === "contract" ? { recipient: "recipient-canary" } : {}),
        }),
      });
    }
    if (path.startsWith(`${diagnosticRoot}/test-sends/`)) {
      if (diagnosticMode === "unknown" && diagnosticAttempts === 1)
        return route.fulfill({ status: 404, json: problemBody(404) });
      const command = requests.findLast(
        (item) => item.key === `POST ${diagnosticRoot}/test-sends`,
      )?.body;
      const locale =
        typeof command === "object" && command !== null && "locale" in command
          ? command.locale
          : "en";
      return route.fulfill({
        json: diagnosticReceiptBody(path.split("/").at(-1) ?? "", { locale, status: "SENT" }),
      });
    }
    if (path === root) return route.fulfill({ json: accessSessionBody() });
    if (path === `${root}/audit-trail`)
      return route.fulfill({ json: { items: [], nextCursor: null, hasMore: false } });
    return route.fulfill({ status: 404, json: problemBody(404) });
  });
  return { requests };
}

test("conceals a foreign session and rejects a malformed identifier", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const { requests } = await openDiagnostics(page, arabic, {
    [`GET /api/v1/platform/access-sessions/${ids.session}`]: (route) =>
      route.fulfill({ status: 404, json: problemBody(404) }),
  });
  await page.goto(`/platform/access-sessions/${ids.session}`);
  await expect(page.getByText("404")).toBeVisible();
  await page.goto("/platform/access-sessions/not-a-session");
  await expect(page.getByText("404")).toBeVisible();
  expect(requests.some((request) => request.key.includes("not-a-session"))).toBe(false);
  expect(requests.some((request) => request.key.endsWith("/enter"))).toBe(false);
  await expect(page.locator("body")).not.toContainText("canary");
});

for (const theme of ["light", "dark"] as const) {
  test(`Company diagnostic journey is isolated and accessible in ${theme}`, async ({
    page,
  }, info) => {
    const arabic = info.project.name === "chromium-rtl";
    const copy = arabic ? ar : en;
    const { requests } = await openDiagnostics(page, arabic, {}, "normal");
    await page.addInitScript((theme) => {
      const stored = JSON.parse(localStorage.getItem("hrms-preferences:v2") ?? "{}");
      stored.state.theme = theme;
      localStorage.setItem("hrms-preferences:v2", JSON.stringify(stored));
    }, theme);
    const escapes: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("diagnostic-canary.invalid")) escapes.push(request.url());
    });
    await page.goto(`/platform/access-sessions/${ids.session}?area=diagnostics`);
    await expect(page.locator("html")).toHaveAttribute("dir", arabic ? "rtl" : "ltr");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const frame = page.frameLocator(`iframe[title="${copy["diagnostics.frame"]}"]`);
    await expect(frame.getByRole("heading", { name: "Company sample" })).toBeVisible();
    await frame.getByText("Inert invitation link").click();
    expect(await page.evaluate(() => "__diagnosticEscape" in window)).toBe(false);
    expect(escapes).toEqual([]);
    await expect(page).toHaveURL(
      new RegExp(`/platform/access-sessions/${ids.session}\\?area=diagnostics$`),
    );
    await expect(frame.locator("script, iframe, form, a[href], img[src^='https:']")).toHaveCount(0);
    await expect(page.locator(`iframe[title="${copy["diagnostics.frame"]}"]`)).toHaveAttribute(
      "sandbox",
      "",
    );
    const trigger = page.getByRole("button", { name: copy["diagnostics.send"], exact: true });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(
      dialog.getByRole("button", { name: copy["diagnostics.confirm"], exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(
      requests.filter(
        (item) => item.key.includes("POST") && item.key.includes("email-diagnostics"),
      ),
    ).toHaveLength(0);
    await trigger.click();
    await dialog.getByRole("button", { name: copy["diagnostics.confirm"], exact: true }).click();
    await expect(page.getByText(copy["diagnostics.status.QUEUED"], { exact: true })).toBeVisible();
    await page.getByRole("button", { name: copy["diagnostics.check"], exact: true }).click();
    await expect(page.getByText(copy["diagnostics.status.SENT"], { exact: true })).toBeVisible();
    const sends = requests.filter(
      (item) => item.key.startsWith("POST") && item.key.includes("email-diagnostics"),
    );
    expect(sends).toHaveLength(1);
    expect(sends[0].body).toEqual({
      requestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      emailTypeKey: "employee-invitation",
      locale: arabic ? "ar" : "en",
    });
    expect(
      requests
        .filter((item) => item.key.includes("email-diagnostics"))
        .every((item) => item.authorization === "Bearer access-canary"),
    ).toBe(true);
    expect(requests.some((item) => item.key.includes("/company/"))).toBe(false);
    await noOverflow(page);
    await page.evaluate(() => {
      for (const element of document.querySelectorAll("*")) element.scrollTop = 0;
    });
    await expect(
      page.getByRole("heading", { name: copy["diagnostics.title"], exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/diagnostics-${arabic ? "ar" : "en"}-${theme}.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: arabic ? 1280 : 390, height: 900 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await noOverflow(page);
    await page.evaluate(() => {
      for (const element of document.querySelectorAll("*")) element.scrollTop = 0;
    });
    await page.screenshot({
      path: `test-results/diagnostics-zoom-${arabic ? "ar" : "en"}-${theme}.png`,
      fullPage: true,
    });
    await expect(page.locator("body")).not.toContainText("canary");
  });
}

test("Company diagnostic unknown acceptance retains the command across support tabs and confirmed replay", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const { requests } = await openDiagnostics(page, arabic, {}, "unknown");
  await page.goto(`/platform/access-sessions/${ids.session}?area=diagnostics`);
  await page.getByRole("button", { name: copy["diagnostics.send"], exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: copy["diagnostics.confirm"], exact: true })
    .click();
  await expect(page.getByText(copy["diagnostics.outcome.unknown"], { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: copy["diagnostics.send"], exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: copy["diagnostics.replay"], exact: true }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: copy["area.audit"], exact: true }).click();
  await page.getByRole("tab", { name: copy["area.diagnostics"], exact: true }).click();
  await expect(page.getByText(copy["diagnostics.outcome.unknown"], { exact: true })).toBeVisible();
  await page.getByRole("button", { name: copy["diagnostics.check"], exact: true }).click();
  await expect(page.getByText(copy["diagnostics.outcome.notFound"], { exact: true })).toBeVisible();
  await page.getByRole("button", { name: copy["diagnostics.replay"], exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: copy["diagnostics.confirm"], exact: true })
    .click();
  await expect(page.getByText(copy["diagnostics.status.QUEUED"], { exact: true })).toBeVisible();
  const sends = requests.filter(
    (item) => item.key.startsWith("POST") && item.key.includes("email-diagnostics"),
  );
  expect(sends).toHaveLength(2);
  expect(sends[0].body).toEqual(sends[1].body);
});

for (const fault of [
  "inactive",
  "permission",
  "notReady",
  "conflict",
  "unprocessable",
  "contract",
  "limited",
] as const) {
  test(`Company diagnostic ${fault} is safe and never auto-retries`, async ({ page }, info) => {
    const arabic = info.project.name === "chromium-rtl";
    const copy = arabic ? ar : en;
    const { requests } = await openDiagnostics(page, arabic, {}, fault);
    await page.goto(`/platform/access-sessions/${ids.session}?area=diagnostics`);
    await page.getByRole("button", { name: copy["diagnostics.send"], exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: copy["diagnostics.confirm"], exact: true })
      .click();
    if (fault === "inactive" || fault === "permission") {
      await expect(
        page.getByText(
          copy[fault === "inactive" ? "ended.inactive.title" : "ended.ineligible.title"],
          { exact: true },
        ),
      ).toBeVisible();
      await expect(page.locator("iframe")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: copy["diagnostics.send"], exact: true }),
      ).toHaveCount(0);
    } else if (fault === "limited") {
      await expect(
        page.getByText(copy["diagnostics.outcome.limited"].replace("{{seconds}}", "2"), {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: copy["diagnostics.replay"], exact: true }),
      ).toBeVisible({ timeout: 6000 });
    } else {
      await expect(
        page.getByText(copy[`diagnostics.outcome.${fault}`], { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: copy["diagnostics.send"], exact: true }),
      ).toHaveCount(0);
    }
    expect(
      requests.filter(
        (item) => item.key.startsWith("POST") && item.key.includes("email-diagnostics"),
      ),
    ).toHaveLength(1);
    await expect(page.locator("body")).not.toContainText("canary");
    await noOverflow(page);
  });
}
