import { expect, test } from "@playwright/test";

const cataloguePlan = {
  publicId: "11111111-1111-4111-8111-111111111111",
  name: "خطة Growth",
  description: "Authored وصف for growing teams",
  duration: 30,
  features: ["ATTENDANCE", "FUTURE_FEATURE"],
  effectivePrice: null,
};

const resolvedPrice = {
  billingInterval: "monthly",
  intervalCount: 1,
  countryCode: "EG",
  regionCode: null,
  money: {
    currencyCode: "USD",
    currencyExponent: 2,
    amountMinor: 4900,
    amountMajor: "49.00",
    formattedAmount: "USD 49.00",
  },
};

const forcedPasswordSession = {
  state: {
    status: "must_change_password",
    session: {
      accessToken: "must-never-leave-browser",
      refreshToken: "must-never-refresh",
      sessionId: "session-1",
      expiresIn: 900,
      user: {
        publicId: "user-1",
        employeeCode: "EMP-1",
        firstName: "Public",
        lastName: "Viewer",
        email: "viewer@example.com",
        status: "ACTIVE",
        companyCode: "ACME",
        mustChangePassword: true,
        permissions: [],
        isOwner: false,
      },
    },
  },
  version: 0,
};

test("keeps the catalogue public, bilingual, theme-aware, and explicit about market pricing", async ({
  page,
}, testInfo) => {
  const publicRequests: Array<{ authorization: string | undefined; url: URL }> = [];
  const unexpectedRequests: string[] = [];
  await page.addInitScript((session) => {
    localStorage.setItem("hrms-auth", JSON.stringify(session));
  }, forcedPasswordSession);
  const isNarrow = testInfo.project.name === "chromium-rtl";
  await page.setViewportSize(isNarrow ? { width: 360, height: 800 } : { width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname !== "/api/v1/public/plans" || request.method() !== "GET") {
      unexpectedRequests.push(`${request.method()} ${url.pathname}`);
      await route.abort();
      return;
    }
    publicRequests.push({
      authorization: request.headers().authorization,
      url,
    });
    const effectivePrice = url.searchParams.get("currencyCode") ? resolvedPrice : null;
    await route.fulfill({ json: { data: [{ ...cataloguePlan, effectivePrice }] } });
  });

  await page.goto("/plans");
  await expect(page).toHaveURL(/\/plans\/?$/);
  await expect(
    page.getByRole("heading", { name: "Clear plans that grow with your team" }),
  ).toBeVisible();
  await expect(page.getByText("No price published for this context")).toBeVisible();
  await expect(page.getByText("FUTURE_FEATURE")).toBeVisible();
  expect(publicRequests[0]?.authorization).toBeUndefined();
  if (!isNarrow) {
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await expect(
      page.getByRole("heading", { name: "Clear plans that grow with your team" }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }

  await page.getByLabel("Currency").fill("USD");
  await page.getByLabel("Country code (optional)").fill("EG");
  await page.getByRole("combobox", { name: "Billing interval" }).click();
  await page.getByRole("option", { name: "Monthly" }).click();
  await page.getByRole("button", { name: "Show prices" }).click();
  await expect(page.getByText("USD 49.00")).toBeVisible();
  await expect(page.getByText("USD · monthly · 1")).toBeVisible();
  await expect.poll(() => publicRequests.length).toBe(2);
  expect(publicRequests[1]?.url.searchParams.get("currencyCode")).toBe("USD");
  expect(publicRequests[1]?.url.searchParams.get("billingInterval")).toBe("monthly");
  expect(publicRequests[1]?.url.searchParams.get("countryCode")).toBe("EG");
  expect(publicRequests[1]?.authorization).toBeUndefined();

  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: /Switch language/ }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "خطط واضحة تنمو مع فريقك" })).toBeVisible();

  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
  expect(unexpectedRequests).toEqual([]);
});

test("distinguishes a contract outage from an empty published catalogue", async ({ page }) => {
  let responseKind: "empty" | "malformed" = "malformed";
  const unexpectedRequests: string[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname !== "/api/v1/public/plans" || request.method() !== "GET") {
      unexpectedRequests.push(`${request.method()} ${url.pathname}`);
      await route.abort();
      return;
    }
    await route.fulfill({ json: responseKind === "empty" ? { data: [] } : { data: "invalid" } });
  });

  await page.goto("/plans");
  await expect(
    page.getByText("The plan catalogue is temporarily unavailable. Please try again later."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);

  responseKind = "empty";
  await page.reload();
  await expect(page.getByText("No plans have been published yet.")).toBeVisible();
  expect(unexpectedRequests).toEqual([]);
});
