import { expect, type Page, type Route, test } from "@playwright/test";
import ar from "../../public/locales/ar/people.json" with { type: "json" };
import en from "../../public/locales/en/people.json" with { type: "json" };
import { companySessionFixture } from "../../src/test/audience-fixtures";
import {
  assignmentBody,
  catalogueBody,
  peopleCanaries,
  peopleIds,
  personBody,
  roleDetailBody,
  rolesBody,
  rosterBody,
  sessionsBody,
} from "../../src/test/company-people-fixtures";
import { problemBody } from "../../src/test/operation-fakes";

const everyPermission = [
  "users:read",
  "users:create",
  "users:update",
  "users:delete",
  "users:reset-password",
  "sessions:read",
  "sessions:revoke",
  "roles:read",
  "roles:create",
  "roles:update",
  "roles:delete",
  "roles:assign",
  "company-access-policies:read",
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
  overrides?: Record<string, (route: Route) => Promise<void>>;
}

async function open(
  page: Page,
  { arabic, permissions = everyPermission, mode = "NORMAL", overrides = {} }: Scenario,
) {
  const session = companySessionFixture({ publicId: peopleIds.actor, permissions });
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
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const key = `${request.method()} ${path}`;
    requests.push({
      key,
      authorization: request.headers().authorization ?? null,
      body: request.postData() ? JSON.parse(request.postData() ?? "") : undefined,
    });
    const override = overrides[key];
    if (override) return override(route);
    if (key === "GET /api/v1/company/me") return route.fulfill({ json: session.user });
    if (key === "GET /api/v1/company/access-policy")
      return route.fulfill({ json: { mode, reason: null, effectiveUntil: null } });
    if (key === "GET /api/v1/company/users")
      return route.fulfill({
        json: rosterBody([peopleIds.actor, peopleIds.colleague, peopleIds.owner]),
      });
    const personMatch = path.match(
      /^\/api\/v1\/company\/users\/([0-9a-f-]{36})(\/role|\/sessions)?$/,
    );
    if (request.method() === "GET" && personMatch) {
      const id = personMatch[1] ?? "";
      if (personMatch[2] === "/role")
        return route.fulfill({
          json: assignmentBody(
            id,
            id === peopleIds.owner ? peopleIds.ownerRole : peopleIds.employeeRole,
          ),
        });
      if (personMatch[2] === "/sessions") return route.fulfill({ json: sessionsBody() });
      return route.fulfill({ json: personBody(id) });
    }
    if (key === "GET /api/v1/company/roles") return route.fulfill({ json: rolesBody() });
    if (key === `GET /api/v1/company/roles/${peopleIds.managerRole}`)
      return route.fulfill({
        json: roleDetailBody(peopleIds.managerRole, [peopleIds.permissionRead]),
      });
    if (key === "GET /api/v1/company/permissions") return route.fulfill({ json: catalogueBody() });
    if (key === `DELETE /api/v1/company/users/${peopleIds.colleague}`)
      return route.fulfill({ status: 204 });
    throw new Error(`Unexpected S4 operation ${key}`);
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
  for (const canary of peopleCanaries) await expect(page.locator("body")).not.toContainText(canary);
}

test("reads the Company roster and opens a person through its public ID", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const requests = await open(page, { arabic });
  await page.goto("/company/people?q=omar");
  await expect(page.getByRole("heading", { level: 1, name: copy["roster.title"] })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", arabic ? "rtl" : "ltr");
  await expect(page.getByRole("searchbox")).toHaveValue("omar");
  await expectCalmLayout(page);
  await page.getByRole("link", { name: "Omar Nabil" }).click();
  await expect(page).toHaveURL(`/company/people/${peopleIds.colleague}`);
  await expect(page.getByRole("heading", { level: 1, name: "Omar Nabil" })).toBeVisible();
  await expectCalmLayout(page);
  const companyCalls = requests.filter((request) => request.key !== "GET /api/v1/company/me");
  expect(companyCalls.every((request) => request.authorization === "Bearer access-canary")).toBe(
    true,
  );
  expect(requests.some((request) => /\/companies\/|\/platform\//.test(request.key))).toBe(false);
});

test("deletes a person only after the typed code, with keyboard focus kept in the dialog", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  const requests = await open(page, { arabic });
  await page.goto(`/company/people/${peopleIds.colleague}`);
  const trigger = page.getByRole("button", { name: copy["account.delete.action"] });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: copy["account.delete.action"] });
  await expect(confirm).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("textbox").fill("EMP-7");
  await confirm.click();
  await expect(page).toHaveURL("/company/people");
  expect(requests.filter((request) => request.key.startsWith("DELETE"))).toHaveLength(1);
});

test("protects the Owner and the actor's own record", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  await open(page, { arabic });
  await page.goto(`/company/people/${peopleIds.owner}`);
  await expect(page.getByRole("button", { name: copy["account.delete.action"] })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: copy["access.revokeConfirm.action"] }),
  ).toBeDisabled();
  await page.goto(`/company/people/${peopleIds.actor}`);
  await expect(page.getByRole("button", { name: copy["account.reset.action"] })).toBeDisabled();
});

test("keeps people readable but not editable in a read-only workspace", async ({ page }, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const copy = arabic ? ar : en;
  await open(page, { arabic, mode: "READ_ONLY" });
  await page.goto("/company/people");
  await expect(page.getByRole("button", { name: copy["create.open"] })).toBeDisabled();
  await page.goto(`/company/roles/${peopleIds.managerRole}`);
  await expect(page.getByRole("button", { name: copy["role.delete"] })).toBeDisabled();
  await expect(page.getByRole("checkbox").first()).toBeDisabled();
  await expectCalmLayout(page);
});

test("conceals malformed and foreign people, and refuses unpermitted areas", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const foreign = "11111111-2222-4333-8444-555555555555";
  const requests = await open(page, {
    arabic,
    permissions: ["users:read"],
    overrides: {
      [`GET /api/v1/company/users/${foreign}`]: (route) =>
        route.fulfill({ status: 404, json: problemBody(404) }),
    },
  });
  await page.goto("/company/people/internal-secret");
  await expect(
    page.getByRole("heading", { name: arabic ? "يبدو أنك ضللت الطريق" : "You missed your way" }),
  ).toBeVisible();
  await page.goto(`/company/people/${foreign}`);
  await expect(
    page.getByRole("heading", { name: arabic ? "يبدو أنك ضللت الطريق" : "You missed your way" }),
  ).toBeVisible();
  await page.goto("/company/roles");
  await expect(
    page.getByRole("heading", {
      name: arabic ? "هذه المساحة غير متاحة لك" : "This area is not available to you",
    }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("internal-secret");
  expect(requests.some((request) => request.key === "GET /api/v1/company/roles")).toBe(false);
});
