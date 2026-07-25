import { expect, test } from "@playwright/test";

const PLAN = {
  publicId: "11111111-1111-4111-8111-111111111111",
  name: "Growth",
  description: "For growing teams",
  duration: 30,
  features: ["OVERVIEW", "TEAM_MANAGEMENT"],
  limits: { MAX_USERS: 100, MAX_DEPARTMENTS: 20 },
  isPublic: true,
  isActive: true,
  createdAt: "2026-07-25T10:00:00.000Z",
  updatedAt: "2026-07-25T10:00:00.000Z",
  deletedAt: null,
};

const PRICE = {
  publicId: "22222222-2222-4222-8222-222222222222",
  countryCode: null,
  regionCode: null,
  billingInterval: "monthly",
  intervalCount: 1,
  isActive: true,
  money: {
    currencyCode: "USD",
    currencyExponent: 2,
    amountMinor: 7500,
    amountMajor: "75.00",
    formattedAmount: "USD 75.00",
  },
  createdAt: "2026-07-25T10:00:00.000Z",
  updatedAt: "2026-07-25T10:00:00.000Z",
};

const PLAN_WITH_PRICES = { ...PLAN, prices: [PRICE], effectivePrice: null };

const authState = {
  state: {
    status: "authenticated",
    session: {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      sessionId: "session-1",
      expiresIn: 900,
      user: {
        publicId: "admin-1",
        employeeCode: "ADMIN-001",
        firstName: "Nadia",
        lastName: "Hassan",
        email: "nadia@example.com",
        status: "ACTIVE",
        companyCode: "EDARA",
        mustChangePassword: false,
        permissions: [],
        isOwner: false,
        isPlatformAdmin: true,
      },
    },
  },
  version: 0,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((state) => {
    localStorage.setItem("hrms-auth", JSON.stringify(state));
  }, authState);
});

test("manages a live plan and its market price through the API boundary", async ({ page }) => {
  let planPatchBody: Record<string, unknown> | undefined;
  let pricePatchBody: Record<string, unknown> | undefined;
  let priceCreateBody: Record<string, unknown> | undefined;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === "/api/v1/plans" && request.method() === "GET") {
      await route.fulfill({ json: { data: [PLAN_WITH_PRICES] } });
      return;
    }

    if (
      url.pathname === "/api/v1/plans/11111111-1111-4111-8111-111111111111/prices" &&
      request.method() === "GET"
    ) {
      await route.fulfill({ json: { data: [PRICE] } });
      return;
    }

    if (
      url.pathname === "/api/v1/plans/11111111-1111-4111-8111-111111111111" &&
      request.method() === "PATCH"
    ) {
      planPatchBody = request.postDataJSON();
      await route.fulfill({ json: { ...PLAN, ...planPatchBody } });
      return;
    }

    if (
      url.pathname === "/api/v1/plan-prices/22222222-2222-4222-8222-222222222222" &&
      request.method() === "PATCH"
    ) {
      pricePatchBody = request.postDataJSON();
      await route.fulfill({ json: { ...PRICE, ...pricePatchBody } });
      return;
    }

    if (
      url.pathname === "/api/v1/plans/11111111-1111-4111-8111-111111111111/prices" &&
      request.method() === "POST"
    ) {
      priceCreateBody = request.postDataJSON();
      await route.fulfill({
        status: 201,
        json: { ...PRICE, publicId: "33333333-3333-4333-8333-333333333333", ...priceCreateBody },
      });
      return;
    }

    await route.abort();
  });

  await page.goto("/admin/plans");
  await expect(page.getByRole("heading", { name: "Plans", exact: true })).toBeVisible();
  await expect(page.getByText("Growth", { exact: true })).toBeVisible();
  await expect(page.getByText("USD 75.00")).toBeVisible();
  await expect(page.getByText("Fallback", { exact: true })).toBeVisible();
  await expect(page.getByText("Duration: 30 days")).toBeVisible();

  await page.getByRole("button", { name: "Edit plan" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Private" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save changes" }).click();
  await expect.poll(() => planPatchBody).toMatchObject({ isPublic: false });

  await page.getByRole("button", { name: "Manage prices" }).click();
  await expect(page.getByRole("heading", { name: "Manage prices for Growth" })).toBeVisible();
  const priceDialog = page.getByRole("dialog", { name: "Manage prices for Growth" });
  await expect(page.getByText("Default fallback", { exact: true })).toBeVisible();

  await priceDialog.getByLabel("Currency").click();
  await page.getByRole("option", { name: /Euro/ }).click();
  await page.getByLabel("Amount (minor units)").fill("12500");
  await page.getByRole("button", { name: "Add price" }).click();
  await expect
    .poll(() => priceCreateBody)
    .toMatchObject({
      currencyCode: "EUR",
      amountMinor: 12500,
      billingInterval: "monthly",
    });

  await priceDialog.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Manage prices" }).click();
  await expect(page.getByRole("heading", { name: "Manage prices for Growth" })).toBeVisible();

  await priceDialog.getByRole("button", { name: "Edit" }).first().click();
  await page.getByLabel("Amount (minor units)").last().fill("13000");
  await page.getByRole("button", { name: "Save price" }).click();
  await expect.poll(() => pricePatchBody).toMatchObject({ amountMinor: 13000 });
});
