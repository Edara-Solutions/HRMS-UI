import { expect, type Page, type Route } from "@playwright/test";
import { companySessionFixture, platformSessionFixture } from "../../src/test/audience-fixtures";
import { notificationItem, notificationPage } from "../../src/test/notification-fixtures";
import { problemBody } from "../../src/test/operation-fakes";
import {
  announcementBody,
  deliveriesBody,
  deliveryBody,
  platformCommunicationsIds as ids,
  migrateResultBody,
  platformCommunicationsPermissions,
  platformEmailTypesBody,
  platformPreviewBody,
  platformVariantsBody,
  removalReadinessBody,
  sendingBody,
  testSendResultBody,
} from "../../src/test/platform-communications-fixtures";
import { companyListBody } from "../../src/test/platform-company-fixtures";
import { platformRolesBody } from "../../src/test/platform-people-fixtures";
export const permissions = Object.values(platformCommunicationsPermissions)
  .flat()
  .concat(["companies:read", "platform-roles:read"]);
export function auditPage() {
  const base = {
    eventType: "audit.trail.platform_read",
    eventVersion: 1,
    occurredAt: "2026-09-26T09:00:00.000Z",
    scope: "PLATFORM",
    companyPublicId: null,
    outcome: "SUCCESS",
    traceId: null,
    origin: { ip: null, userAgent: null, country: null, city: null },
    targets: [],
    details: { companyPublicId: null, scope: null },
    recordingBinding: "STANDALONE",
    recordedAt: "2026-09-26T09:00:00.000Z",
  };
  return {
    items: [
      {
        ...base,
        actor: { kind: "PLATFORM_USER", publicId: ids.platformActorId, name: "Nadia Platform" },
      },
      { ...base, actor: { kind: "USER", publicId: ids.platformActorId, name: "Nadia Company" } },
    ],
    nextCursor: null,
    hasMore: false,
  };
}
export async function communicationsBrowser(
  page: Page,
  arabic: boolean,
  {
    overrides = {},
    crossed = false,
    grants = permissions,
    platform = true,
  }: {
    overrides?: Record<string, (route: Route) => Promise<void>>;
    crossed?: boolean;
    grants?: string[];
    platform?: boolean;
  } = {},
) {
  const session = platformSessionFixture({ permissions: grants });
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
  const calls: { key: string; token: string | null; body: unknown; query: string }[] = [];
  const escapes: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.hostname === "evil.test") escapes.push(url.href);
  });
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const key = `${req.method()} ${url.pathname}`;
    calls.push({
      key,
      token: req.headers().authorization ?? null,
      body: req.postData() ? JSON.parse(req.postData() ?? "") : undefined,
      query: url.search,
    });
    if (overrides[key]) return overrides[key](route);
    const replies: Record<string, unknown> = {
      "GET /api/v1/platform/me": session.user,
      "GET /api/v1/platform/companies": companyListBody(),
      "GET /api/v1/platform/roles": platformRolesBody(),
      "GET /api/v1/platform/email-types": platformEmailTypesBody(),
      [`GET /api/v1/platform/email-types/${ids.emailTypeKey}`]: platformEmailTypesBody().items[0],
      [`GET /api/v1/platform/email-types/${ids.emailTypeKey}/preview`]: platformPreviewBody(
        url.searchParams.get("locale") ?? "en",
      ),
      [`GET /api/v1/platform/email-types/${ids.emailTypeKey}/variants`]: platformVariantsBody(),
      [`GET /api/v1/platform/email-template-variants/${ids.legacyVariantKey}/removal-readiness`]:
        removalReadinessBody(),
      [`POST /api/v1/platform/email-template-variants/${ids.legacyVariantKey}/migrate`]:
        migrateResultBody(),
      "POST /api/v1/platform/emails/test-send": testSendResultBody(),
      "GET /api/v1/platform/emails/deliveries": deliveriesBody(),
      [`GET /api/v1/platform/emails/deliveries/COMPANY/${ids.companyDeliveryId}`]: deliveryBody(),
      [`POST /api/v1/platform/emails/deliveries/COMPANY/${ids.companyDeliveryId}/retry`]:
        deliveryBody({ status: "QUEUED" }),
      "GET /api/v1/platform/emails/sending": sendingBody(),
      "POST /api/v1/platform/emails/sending/EDARA/pause": {
        context: "EDARA",
        paused: true,
        reason: "Incident",
        updatedBy: 7,
        updatedAt: null,
      },
      "POST /api/v1/platform/emails/sending/EDARA/resume": {
        context: "EDARA",
        paused: false,
        reason: null,
        updatedBy: 7,
        updatedAt: null,
      },
      "GET /api/v1/platform/announcements": {
        items: [
          announcementBody({
            status: "PARTIAL",
            dispatchFinishedAt: null,
            pendingUnits: 2,
            failedUnits: 1,
            skippedUnits: 1,
          }),
        ],
      },
      "POST /api/v1/platform/announcements": {
        publicId: ids.announcementId,
        status: "DISPATCHING",
        scheduledFor: null,
      },
      "GET /api/v1/platform/notification-settings": {
        items: [
          { typeKey: "platform.lead-created", typeVersion: 1, importance: "high", override: null },
          {
            typeKey: "platform.future-canary",
            typeVersion: 99,
            importance: "normal",
            override: null,
          },
        ],
      },
      "GET /api/v1/platform/audit-trail": auditPage(),
      "GET /api/v1/platform/audit-trail/actors": [
        { publicId: ids.platformActorId, name: "Nadia Platform" },
      ],
      "GET /api/v1/platform/notifications/unread-count": { unreadCount: 1 },
      "GET /api/v1/platform/notifications": notificationPage([
        notificationItem(1, new Date().toISOString(), {
          typeKey: "platform.lead-created",
          importance: "high",
          params: {},
        }),
      ]),
      "POST /api/v1/platform/notifications/seen": { seenCount: 1 },
    };
    if (
      key.startsWith("PUT /api/v1/platform/notification-settings/") ||
      key === "POST /api/v1/platform/notifications/read"
    )
      return route.fulfill({ status: 204 });
    if (Object.hasOwn(replies, key))
      return route.fulfill({
        status:
          key === "POST /api/v1/platform/emails/test-send"
            ? 202
            : key === "POST /api/v1/platform/announcements"
              ? 201
              : 200,
        json: replies[key],
      });
    return route.fulfill({ status: 404, json: problemBody(404) });
  });
  return { calls, escapes, company };
}
export async function assertCommunicationsLayout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const overflow = await page.locator("main").evaluate((main) => {
    const rect = main.getBoundingClientRect();
    return {
      width: main.clientWidth,
      scroll: main.scrollWidth,
      offenders: [...main.querySelectorAll("*")]
        .filter((el) => {
          const child = el.getBoundingClientRect();
          return child.right > rect.right + 1 || child.left < rect.left - 1;
        })
        .map((el) => ({
          tag: el.tagName,
          class: el.className,
          text: el.textContent?.slice(0, 50),
          width: el.getBoundingClientRect().width,
        }))
        .slice(0, 8),
    };
  });
  expect(overflow, JSON.stringify(overflow)).toMatchObject({ scroll: expect.any(Number) });
  expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.width);
}
