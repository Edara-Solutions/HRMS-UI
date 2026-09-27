import { expect, type Page, type Route, test } from "@playwright/test";
import ar from "../../public/locales/ar/platform-people.json" with { type: "json" };
import en from "../../public/locales/en/platform-people.json" with { type: "json" };
import { platformSessionFixture } from "../../src/test/audience-fixtures";
import { problemBody } from "../../src/test/operation-fakes";
import {
  platformAdministrator,
  platformAssignmentsBody,
  platformCanaries,
  platformIds,
  platformPersonBody,
  platformRolesBody,
  platformRosterBody,
  platformSessionsBody,
  rootAuthority,
} from "../../src/test/platform-people-fixtures";

interface Recorded {
  key: string;
  authorization: string | null;
  body: unknown;
}

interface Scenario {
  arabic: boolean;
  root?: boolean;
  permissions?: readonly string[];
  /** Crosses the default locale pairing: Arabic light desktop, English dark narrow. */
  crossed?: boolean;
  overrides?: Record<string, (route: Route) => Promise<void>>;
}

async function open(
  page: Page,
  {
    arabic,
    root = false,
    permissions = platformAdministrator,
    crossed = false,
    overrides = {},
  }: Scenario,
) {
  const session = platformSessionFixture({
    publicId: platformIds.actor,
    roleNames: root ? ["SUPER_ADMIN"] : ["Support"],
    permissions: [...permissions],
  });
  const narrow = arabic !== crossed;
  const dark = arabic !== crossed;
  await page.setViewportSize(narrow ? { width: 390, height: 844 } : { width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(
    ({ session, arabic, dark }) => {
      localStorage.setItem(
        "hrms-platform-session:v1",
        JSON.stringify({
          version: 1,
          state: {
            audience: "platform",
            generation: "platform-generation",
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
            state: { locale: arabic ? "ar" : "en", theme: dark ? "dark" : "light", scopes: {} },
          }),
        );
    },
    { session, arabic, dark },
  );
  const requests: Recorded[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const key = `${request.method()} ${url.pathname}`;
    requests.push({
      key,
      authorization: request.headers().authorization ?? null,
      body: request.postData() ? JSON.parse(request.postData() ?? "") : undefined,
    });
    const override = overrides[key];
    if (override) return override(route);
    if (key === "GET /api/v1/platform/me") return route.fulfill({ json: session.user });
    if (key === "GET /api/v1/platform/users")
      return route.fulfill({
        json: platformRosterBody([platformIds.actor, platformIds.colleague, platformIds.root]),
      });
    if (key === "GET /api/v1/platform/roles") return route.fulfill({ json: platformRolesBody() });
    if (key === "GET /api/v1/platform/role-assignments") {
      const target = url.searchParams.get("platformUserPublicId") ?? "";
      return route.fulfill({
        json: platformAssignmentsBody(
          target,
          target === platformIds.root
            ? [{ publicId: platformIds.rootAssignment, rolePublicId: platformIds.rootRole }]
            : [
                {
                  publicId: platformIds.colleagueAssignment,
                  rolePublicId: platformIds.supportRole,
                },
              ],
        ),
      });
    }
    const personMatch = url.pathname.match(
      /^\/api\/v1\/platform\/users\/([0-9a-f-]{36})(\/sessions)?$/,
    );
    if (request.method() === "GET" && personMatch) {
      if (personMatch[2]) return route.fulfill({ json: platformSessionsBody() });
      return route.fulfill({ json: platformPersonBody(personMatch[1] ?? "") });
    }
    if (key === `POST /api/v1/platform/users/${platformIds.colleague}/suspend`)
      return route.fulfill({ status: 204 });
    throw new Error(`Unexpected S6 operation ${key}`);
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
  for (const canary of platformCanaries)
    await expect(page.locator("body")).not.toContainText(canary);
}

test("reads the Platform roster and opens a person through its public ID", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const requests = await open(page, { arabic });
  await page.goto("/platform/people");
  await expect(page.getByRole("heading", { level: 1, name: copy["roster.title"] })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", arabic ? "rtl" : "ltr");
  await expectCalmLayout(page);
  await page.getByRole("link", { name: "Omar Nabil" }).click();
  await expect(page).toHaveURL(`/platform/people/${platformIds.colleague}`);
  await expect(page.getByRole("heading", { level: 1, name: "Omar Nabil" })).toBeVisible();
  await expect(page.getByText("Support", { exact: true })).toBeVisible();
  await expectCalmLayout(page);
  const calls = requests.filter((request) => request.key !== "GET /api/v1/platform/me");
  expect(calls.every((request) => request.authorization === "Bearer access-canary")).toBe(true);
  expect(requests.some((request) => /\/company\//.test(request.key))).toBe(false);
});

test("suspends a person after a keyboard confirmation that returns focus", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const requests = await open(page, { arabic });
  await page.goto(`/platform/people/${platformIds.colleague}`);
  const trigger = page.getByRole("button", { name: copy["account.suspend.action"] });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Omar Nabil");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: copy["account.suspend.action"] }).click();
  await expect(
    page.getByText(copy["account.suspend.done"].replace("{{name}}", "Omar Nabil")),
  ).toBeVisible();
  expect(requests.filter((request) => request.key.endsWith("/suspend"))).toHaveLength(1);
});

test("protects root and self targets and keeps authority read-only without root", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  await open(page, { arabic, permissions: [...platformAdministrator, "platform-roles:assign"] });
  await page.goto(`/platform/people/${platformIds.root}`);
  await expect(page.getByRole("button", { name: copy["account.suspend.action"] })).toBeDisabled();
  await expect(page.getByText(copy["restriction.protected-root"]).first()).toBeVisible();
  await expect(page.getByText(copy["restriction.prerequisite"]).first()).toBeVisible();
  await page.goto(`/platform/people/${platformIds.actor}`);
  await expect(page.getByRole("button", { name: copy["account.recovery.action"] })).toBeDisabled();
});

test("lets a root holder change a custom role but never the root role", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  await open(page, {
    arabic,
    root: true,
    permissions: [...platformAdministrator, ...rootAuthority],
  });
  await page.goto("/platform/roles");
  await expect(page.getByRole("heading", { level: 1, name: copy["roles.title"] })).toBeVisible();
  await expect(page.getByRole("button", { name: copy["roles.create.open"] })).toBeEnabled();
  await page.goto(`/platform/roles/${platformIds.supportRole}`);
  await expect(page.getByRole("checkbox").first()).toBeEnabled();
  await expectCalmLayout(page);
  await page.goto(`/platform/roles/${platformIds.rootRole}`);
  await expect(page.getByText(copy["role.rootAccess"])).toBeVisible();
  await expect(page.getByRole("button", { name: copy["role.delete"] })).toBeDisabled();
});

test("conceals malformed and foreign people, and refuses unpermitted areas", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const foreign = "11111111-2222-4333-8444-555555555555";
  await open(page, {
    arabic,
    permissions: ["platform-users:read"],
    overrides: {
      [`GET /api/v1/platform/users/${foreign}`]: (route) =>
        route.fulfill({ status: 404, json: problemBody(404) }),
    },
  });
  const missed = arabic ? "يبدو أنك ضللت الطريق" : "You missed your way";
  await page.goto("/platform/people/internal-secret");
  await expect(page.getByRole("heading", { name: missed })).toBeVisible();
  await page.goto(`/platform/people/${foreign}`);
  await expect(page.getByRole("heading", { name: missed })).toBeVisible();
  await page.goto(`/platform/roles/${foreign}`);
  await expect(
    page.getByRole("heading", {
      name: arabic ? "هذه المساحة غير متاحة لك" : "This area is not available to you",
    }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("internal-secret");
});

test("keeps the roster and person readable with theme and viewport crossed", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  await open(page, { arabic, crossed: true });
  await page.goto("/platform/people");
  await expect(page.getByRole("heading", { level: 1, name: copy["roster.title"] })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", arabic ? "rtl" : "ltr");
  await expectCalmLayout(page);
  await page.goto(`/platform/people/${platformIds.colleague}`);
  await expect(page.getByRole("heading", { level: 1, name: "Omar Nabil" })).toBeVisible();
  await expectCalmLayout(page);
});
