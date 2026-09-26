import { expect, type Page, test } from "@playwright/test";
import ar from "../../public/locales/ar/auth.json" with { type: "json" };
import en from "../../public/locales/en/auth.json" with { type: "json" };
import { companySessionFixture, platformSessionFixture } from "../../src/test/audience-fixtures";

const company = companySessionFixture(
  {},
  { accessToken: "company-access", refreshToken: "company-refresh" },
);
const platform = platformSessionFixture(
  {},
  { accessToken: "platform-access", refreshToken: "platform-refresh" },
);
const profile = {
  employeeCode: "EMP-1",
  phone: null,
  level: null,
  hireDate: null,
  locale: "en",
  timezone: "UTC",
  photoUrl: null,
};
const platformProfile = {
  jobTitle: null,
  team: null,
  locale: "en",
  timezone: "UTC",
  photoUrl: null,
};

function envelope(audience: "company" | "platform", session: typeof company | typeof platform) {
  return {
    version: 1,
    state: { audience, generation: `${audience}-generation`, eventKind: "replacement", session },
  };
}

async function configure(page: Page, arabic: boolean) {
  await page.setViewportSize(arabic ? { width: 390, height: 844 } : { width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(
    (locale) => {
      localStorage.setItem(
        "hrms-prefs",
        JSON.stringify({
          version: 0,
          state: { locale, theme: locale === "ar" ? "dark" : "light" },
        }),
      );
    },
    arabic ? "ar" : "en",
  );
}

async function seed(page: Page, forced = false) {
  await page.addInitScript(
    ({ companyEnvelope, platformEnvelope }) => {
      localStorage.setItem("hrms-company-session:v1", JSON.stringify(companyEnvelope));
      localStorage.setItem("hrms-platform-session:v1", JSON.stringify(platformEnvelope));
    },
    {
      companyEnvelope: envelope("company", {
        ...company,
        mustChangePassword: forced,
        user: { ...company.user, mustChangePassword: forced },
      }),
      platformEnvelope: envelope("platform", platform),
    },
  );
}

async function readSlot(page: Page, audience: "company" | "platform") {
  return page.evaluate(
    (selected) =>
      JSON.parse(localStorage.getItem(`hrms-${selected}-session:v1`) ?? "null")?.state.session,
    audience,
  );
}

test("signs into both audiences independently and signs out only the selected slot", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const labels = arabic ? ar : en;
  await configure(page, arabic);
  const requests: string[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    requests.push(`${request.method()} ${path}`);
    const own = path.includes("/company/") ? company : platform;
    if (path.endsWith("/auth/login")) {
      expect(request.headers().authorization).toBeUndefined();
      const { user, ...tokens } = own;
      await route.fulfill({ json: tokens });
    } else if (path.endsWith("/me")) {
      expect(request.headers().authorization).toBe(`Bearer ${own.accessToken}`);
      await route.fulfill({ json: own.user });
    } else if (path.endsWith("/me/profile")) {
      expect(request.headers().authorization).toBe(`Bearer ${own.accessToken}`);
      await route.fulfill({ json: own === company ? profile : platformProfile });
    } else if (path.endsWith("/auth/logout")) {
      expect(request.headers().authorization).toBe("Bearer company-access");
      await route.fulfill({ status: 204 });
    } else {
      throw new Error(`Unexpected migrated request: ${request.method()} ${path}`);
    }
  });
  await page.goto("/company/login?returnTo=/company/me/profile%3Ftoken%3Dsecret-canary");
  await page.getByLabel(labels["journey.companyCode"], { exact: true }).fill("EDARA");
  await page.getByLabel(labels["journey.employeeCode"], { exact: true }).fill("EMP-1");
  await page.getByLabel(labels["journey.password"], { exact: true }).fill("password");
  await page.getByRole("button", { name: labels["journey.loginAction"], exact: true }).click();
  await expect(page).toHaveURL(/\/company\/me\/profile$/);
  await expect(page.getByRole("heading", { name: labels["account.profileTitle"] })).toBeVisible();
  await page.goto("/platform/login?returnTo=/platform/me/profile");
  await page.getByLabel(labels["journey.email"], { exact: true }).fill("nadia@example.test");
  await page.getByLabel(labels["journey.password"], { exact: true }).fill("password");
  await page.getByRole("button", { name: labels["journey.loginAction"], exact: true }).click();
  await expect(page).toHaveURL(/\/platform\/me\/profile$/);
  await expect(page.getByRole("heading", { name: labels["account.profileTitle"] })).toBeVisible();
  expect(await readSlot(page, "company")).toEqual(company);
  expect(await readSlot(page, "platform")).toEqual(platform);
  await page.goto("/company/me/security");
  await page.getByRole("button", { name: labels["account.signOutHere"], exact: true }).click();
  await expect(page).toHaveURL(/\/company\/login/);
  expect(await readSlot(page, "company")).toBeNull();
  expect(await readSlot(page, "platform")).toEqual(platform);
  expect(requests.filter((path) => path.endsWith("/auth/logout"))).toEqual([
    "POST /api/v1/company/auth/logout",
  ]);
  expect(await page.locator("body").innerText()).not.toContain("secret-canary");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", arabic ? "rtl" : "ltr");
  await expect(page.locator("html")).toHaveAttribute("data-theme", arabic ? "dark" : "light");
});

test("quarantines persisted identity offline, hides cached authority, and permits explicit retry", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const labels = arabic ? ar : en;
  await configure(page, arabic);
  await seed(page);
  let offline = true;
  await page.route("**/api/v1/company/**", async (route) => {
    if (offline) return route.abort();
    const path = new URL(route.request().url()).pathname;
    await route.fulfill({ json: path.endsWith("/me/profile") ? profile : company.user });
  });
  await page.goto("/company/me/profile");
  await expect(page.getByRole("heading", { name: labels["journey.unavailable"] })).toBeVisible();
  expect(await page.locator("body").innerText()).not.toContain(company.user.firstName);
  expect(await readSlot(page, "company")).toEqual(company);
  expect(await readSlot(page, "platform")).toEqual(platform);
  offline = false;
  await page.getByRole("button", { name: labels["journey.retry"], exact: true }).click();
  await expect(page.getByRole("heading", { name: labels["account.profileTitle"] })).toBeVisible();
});

test("forced password completion and offline cleanup do not block the other portal", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const labels = arabic ? ar : en;
  await configure(page, arabic);
  await seed(page, true);
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/logout")) return route.abort();
    if (path === "/api/v1/company/me")
      return route.fulfill({ json: { ...company.user, mustChangePassword: true } });
    if (path === "/api/v1/platform/me") return route.fulfill({ json: platform.user });
    if (path === "/api/v1/platform/me/profile") return route.fulfill({ json: platformProfile });
    throw new Error(`Unexpected request: ${path}`);
  });
  await page.goto("/platform/me/profile");
  await expect(page.getByRole("heading", { name: labels["account.profileTitle"] })).toBeVisible();
  await page.goto("/company/me/profile");
  await expect(page).toHaveURL(/\/company\/change-password/);
  await expect(
    page.getByRole("heading", { name: labels["journey.changePasswordTitle"] }),
  ).toBeVisible();
  await expect(page.getByLabel(labels["account.currentPassword"], { exact: true })).toBeVisible();
  await page
    .getByRole("button", {
      name: labels["journey.signOutAudience"].replace("{{audience}}", labels["journey.company"]),
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/company\/login/);
  await expect(page.getByText(labels["journey.localOnlySignOut"], { exact: true })).toBeVisible();
  expect(await readSlot(page, "platform")).toEqual(platform);
});

test("Company recovery completes anonymously without replacing Platform credentials", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const labels = arabic ? ar : en;
  await configure(page, arabic);
  await page.addInitScript(
    (value) => localStorage.setItem("hrms-platform-session:v1", JSON.stringify(value)),
    envelope("platform", platform),
  );
  let calls = 0;
  await page.route("**/api/v1/**", async (route) => {
    expect(new URL(route.request().url()).pathname).toBe(
      "/api/v1/company/auth/password-reset/confirm",
    );
    expect(route.request().headers().authorization).toBeUndefined();
    expect(route.request().postDataJSON()).toEqual({
      companyPublicId: company.user.companyPublicId,
      token: "reset-canary",
      newPassword: "New-password-1!",
    });
    calls += 1;
    await route.fulfill({ status: 204 });
  });
  await page.goto(
    `/company/reset-password?companyPublicId=${company.user.companyPublicId}&token=reset-canary`,
  );
  await page.getByLabel(labels["journey.newPassword"], { exact: true }).fill("New-password-1!");
  await page.getByLabel(labels["journey.confirmPassword"], { exact: true }).fill("New-password-1!");
  await page.getByRole("button", { name: labels["journey.resetAction"], exact: true }).click();
  await expect(page.getByText(labels["journey.resetComplete"], { exact: true })).toBeVisible();
  expect(await readSlot(page, "company")).toBeFalsy();
  expect(await readSlot(page, "platform")).toEqual(platform);
  expect(calls).toBe(1);
  expect(await page.locator("body").innerText()).not.toContain("reset-canary");
});

for (const audience of ["company", "platform"] as const) {
  test(`${audience} invitation validates its own identity before establishing a slot`, async ({
    page,
  }, info) => {
    const arabic = info.project.name === "chromium-rtl";
    const labels = arabic ? ar : en;
    const own = audience === "company" ? company : platform;
    await configure(page, arabic);
    const calls: string[] = [];
    await page.route("**/api/v1/**", async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      calls.push(path);
      if (path === `/api/v1/${audience}/auth/accept-invitation`) {
        expect(request.headers().authorization).toBeUndefined();
        expect(request.postDataJSON()).toEqual({
          token: "invitation-canary",
          newPassword: "New-password-1!",
          clientType: "web",
          ...(audience === "company" ? { companyPublicId: company.user.companyPublicId } : {}),
        });
        const { user, ...tokens } = own;
        return route.fulfill({ json: tokens });
      }
      if (path === `/api/v1/${audience}/me`) {
        expect(await readSlot(page, audience)).toBeFalsy();
        expect(request.headers().authorization).toBe(`Bearer ${own.accessToken}`);
        return route.fulfill({ json: own.user });
      }
      if (path === `/api/v1/${audience}/me/profile`)
        return route.fulfill({ json: audience === "company" ? profile : platformProfile });
      throw new Error(`Unexpected invitation request: ${path}`);
    });
    await page.goto(
      `/${audience}/accept-invitation?token=invitation-canary&returnTo=/${audience}/me/profile${audience === "company" ? `&companyPublicId=${company.user.companyPublicId}` : ""}`,
    );
    await page.getByLabel(labels["journey.newPassword"], { exact: true }).fill("New-password-1!");
    await page
      .getByLabel(labels["journey.confirmPassword"], { exact: true })
      .fill("New-password-1!");
    await page
      .getByRole("button", { name: labels["journey.invitationAction"], exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/${audience}/me/profile$`));
    await expect(page.getByRole("heading", { name: labels["account.profileTitle"] })).toBeVisible();
    await expect.poll(() => readSlot(page, audience)).toEqual(own);
    expect(calls.slice(0, 2)).toEqual([
      `/api/v1/${audience}/auth/accept-invitation`,
      `/api/v1/${audience}/me`,
    ]);
    expect(await readSlot(page, audience === "company" ? "platform" : "company")).toBeFalsy();
    expect(await page.locator("body").innerText()).not.toContain("invitation-canary");
  });
}

test("same-audience tabs converge on logout-all without clearing Platform", async ({
  page,
  context,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const labels = arabic ? ar : en;
  await configure(page, arabic);
  await seed(page);
  let logoutCalls = 0;
  await context.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/company/me") return route.fulfill({ json: company.user });
    if (path === "/api/v1/company/auth/logout-all") {
      logoutCalls += 1;
      return route.fulfill({ status: 204 });
    }
    throw new Error(`Unexpected cross-tab request: ${path}`);
  });
  await page.goto("/company/me/security");
  await expect(page.getByRole("heading", { name: labels["account.securityTitle"] })).toBeVisible();
  const second = await context.newPage();
  await configure(second, arabic);
  await second.goto("/company/me/security");
  await expect(
    second.getByRole("heading", { name: labels["account.securityTitle"] }),
  ).toBeVisible();
  await page.getByRole("button", { name: labels["account.signOutAll"], exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: labels["account.confirm"], exact: true })
    .click();
  await expect(page).toHaveURL(/\/company\/login/);
  await expect(second.getByRole("heading", { name: labels["account.sessionEnded"] })).toBeVisible();
  expect(await readSlot(second, "company")).toBeNull();
  expect(await readSlot(second, "platform")).toEqual(platform);
  expect(logoutCalls).toBe(1);
  await second.close();
});

test("quarantine retains safe email context but discards passwords before manual retry", async ({
  page,
}, info) => {
  const arabic = info.project.name === "chromium-rtl";
  const labels = arabic ? ar : en;
  await configure(page, arabic);
  await seed(page);
  let offline = false;
  let calls = 0;
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/v1/company/me")
      return offline ? route.abort() : route.fulfill({ json: company.user });
    if (path === "/api/v1/company/me/email") {
      calls += 1;
      offline = true;
      return route.abort();
    }
    throw new Error(`Unexpected email request: ${path}`);
  });
  await page.goto("/company/me/security");
  await page.getByLabel(labels["account.newEmail"], { exact: true }).fill("new@example.test");
  await page
    .getByLabel(labels["account.currentPassword"], { exact: true })
    .first()
    .fill("password-canary");
  await page
    .getByRole("button", { name: labels["account.reviewEmailChange"], exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: labels["account.confirm"], exact: true })
    .click();
  await expect(page.getByRole("heading", { name: labels["journey.unavailable"] })).toBeVisible();
  expect(await page.locator("body").innerText()).not.toContain(company.user.firstName);
  offline = false;
  await page.getByRole("button", { name: labels["journey.retry"], exact: true }).click();
  await expect(page.getByLabel(labels["account.newEmail"], { exact: true })).toHaveValue(
    "new@example.test",
  );
  await expect(
    page.getByLabel(labels["account.currentPassword"], { exact: true }).first(),
  ).toHaveValue("");
  expect(calls).toBe(1);
  expect(await readSlot(page, "platform")).toEqual(platform);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain("password-canary");
});
