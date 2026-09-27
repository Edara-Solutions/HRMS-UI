import { expect, test } from "@playwright/test";
import { companySessionFixture, platformSessionFixture } from "../../src/test/audience-fixtures";

test("keeps no-work SELF recovery, explicit branding and scoped collapse usable", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const company = companySessionFixture();
  const platform = platformSessionFixture({ roleNames: ["Support"] });
  await page.addInitScript(
    ({ company, platform, arabic }) => {
      for (const [audience, session] of [
        ["company", company],
        ["platform", platform],
      ] as const)
        localStorage.setItem(
          `hrms-${audience}-session:v1`,
          JSON.stringify({
            version: 1,
            state: { audience, generation: `${audience}-test`, eventKind: "replacement", session },
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
    { company, platform, arabic },
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/company/me") return route.fulfill({ json: company.user });
    if (path === "/api/v1/company/notifications/unread-count")
      return route.fulfill({ json: { unreadCount: 0 } });
    if (path === "/api/v1/company/notifications")
      return route.fulfill({ json: { items: [], nextCursor: null, hasMore: false } });
    if (path === "/api/v1/platform/me") return route.fulfill({ json: platform.user });
    throw new Error(`Unexpected S2 operation ${path}`);
  });
  await page.goto("/platform/dashboard");
  await expect(
    page.getByRole("heading", {
      name: arabic ? "لم تُعيّن لك صلاحيات العمل بعد" : "Your work access has not been assigned",
    }),
  ).toBeVisible();
  await expect(page.getByText("Edara Platform", { exact: true })).toBeVisible();
  await expect(
    page.getByText(arabic ? "وحدة العمليات" : "Operations Console", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(arabic ? "مستخدم المنصة · Support" : "Platform User · Support", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: arabic ? "طي الشريط الجانبي" : "Collapse sidebar" })
    .click();
  await expect(
    page.getByRole("button", {
      name: arabic ? "توسيع الشريط الجانبي Edara Platform" : "Expand Edara Platform sidebar",
    }),
  ).toBeVisible();
  await page.goto("/company/dashboard");
  await expect(
    page.getByRole("button", { name: arabic ? "طي الشريط الجانبي" : "Collapse sidebar" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: arabic ? "جلساتي" : "My sessions", exact: true }).last(),
  ).toHaveAttribute("href", "/company/me/sessions");
  const scopes = await page.evaluate(
    () => JSON.parse(localStorage.getItem("hrms-preferences:v2") ?? "{}").state.scopes,
  );
  expect(scopes[`platform:${platform.user.publicId}`].sidebarCollapsed).toBe(true);
  expect(scopes[`company:${company.user.publicId}`]).toBeUndefined();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", {
      name: arabic ? "توسيع الشريط الجانبي Edara" : "Expand Edara sidebar",
    }),
  ).toBeVisible();
});

test("conceals old, unknown and unsupported routes with a bilingual safe recovery", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  await page.setViewportSize(arabic ? { width: 390, height: 844 } : { width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(
    (locale) =>
      localStorage.setItem(
        "hrms-preferences:v2",
        JSON.stringify({
          version: 2,
          state: { locale, theme: locale === "ar" ? "dark" : "light", scopes: {} },
        }),
      ),
    arabic ? "ar" : "en",
  );
  const requests: string[] = [];
  await page.route("**/api/v1/**", (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  for (const pathname of [
    "/admin/dashboard",
    "/platform/companies/internal-secret",
    "/company/account/profile",
    "/company/billing",
    "/unknown-secret",
  ]) {
    await page.goto(pathname);
    await expect(
      page.getByRole("heading", { name: arabic ? "يبدو أنك ضللت الطريق" : "You missed your way" }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("internal-secret");
    await expect(page.locator("body")).not.toContainText("unknown-secret");
    await expect(page.locator("html")).toHaveAttribute("dir", arabic ? "rtl" : "ltr");
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    const recovery = page.getByRole("link", {
      name: arabic ? "العودة إلى الرئيسية" : "Back to home",
    });
    await recovery.focus();
    await expect(recovery).toBeFocused();
    await expect(recovery).toHaveAttribute("href", "/");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  expect(requests).toEqual([]);
});
