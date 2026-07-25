import { expect, test } from "@playwright/test";

const PRIMARY_CONTACT = {
  publicId: "contact-1",
  name: "Sara Youssef",
  email: "sara@acme.example.com",
  phone: "+201000000000",
  jobTitle: "COO",
  isPrimary: true,
  createdAt: "2026-07-25T10:00:00.000Z",
  updatedAt: "2026-07-25T10:00:00.000Z",
  deletedAt: null,
};

const LEAD = {
  publicId: "lead-1",
  companyName: "Acme Corp",
  website: null,
  industry: "Retail",
  companySizeRange: "21_TO_50",
  country: "Egypt",
  city: "Cairo",
  source: "CRM",
  status: "QUALIFIED",
  lostReason: null,
  isConverted: false,
  numberOfAttempts: 2,
  lastAttemptAt: "2026-07-25T10:00:00.000Z",
  isArchived: false,
  createdAt: "2026-07-20T10:00:00.000Z",
  updatedAt: "2026-07-25T10:00:00.000Z",
  deletedAt: null,
};

const BLOCKED_ELIGIBILITY = {
  isEligible: false,
  reasons: [
    { code: "PRIMARY_CONTACT_NAME_REQUIRED", message: "Primary contact name is required." },
    { code: "PRIMARY_CONTACT_EMAIL_REQUIRED", message: "Primary contact email is required." },
  ],
  primaryContact: null,
};

const ELIGIBLE = {
  isEligible: true,
  reasons: [],
  primaryContact: PRIMARY_CONTACT,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "hrms-auth",
      JSON.stringify({
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
      }),
    );
  });
});

test("deduplicates a lead and refreshes every conversion blocker at the API boundary", async ({
  page,
}) => {
  let createCount = 0;
  let eligibilityReadCount = 0;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === "/api/v1/leads" && request.method() === "GET") {
      await route.fulfill({
        json: {
          items: [],
          meta: { mode: "page", page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
        },
      });
      return;
    }

    if (url.pathname === "/api/v1/leads" && request.method() === "POST") {
      createCount += 1;
      expect(request.postDataJSON()).toMatchObject({
        companyName: "Acme Corp",
        status: "NEW",
        primaryContact: { name: "Sara Youssef", email: "SARA@ACME.EXAMPLE.COM" },
      });
      await route.fulfill({
        status: 201,
        json: {
          lead: LEAD,
          contacts: [PRIMARY_CONTACT],
          meta: { duplicate: true },
        },
      });
      return;
    }

    if (url.pathname === "/api/v1/plans/public") {
      await route.fulfill({ json: { data: [] } });
      return;
    }

    if (url.pathname === "/api/v1/leads/lead-1") {
      await route.fulfill({
        json: {
          lead: LEAD,
          contacts: [PRIMARY_CONTACT],
          activities: [],
          primaryContact: PRIMARY_CONTACT,
          conversionEligibility: BLOCKED_ELIGIBILITY,
        },
      });
      return;
    }

    if (url.pathname === "/api/v1/leads/lead-1/conversion-eligibility") {
      eligibilityReadCount += 1;
      await route.fulfill({ json: eligibilityReadCount === 1 ? BLOCKED_ELIGIBILITY : ELIGIBLE });
      return;
    }

    if (url.pathname === "/api/v1/leads/lead-1/activities") {
      await route.fulfill({
        json: {
          items: [],
          meta: { mode: "page", page: 1, pageSize: 25, totalItems: 0, totalPages: 1 },
        },
      });
      return;
    }

    if (url.pathname === "/api/v1/leads/lead-1/sending-domain") {
      await route.fulfill({ status: 404, json: { error: "No sending domain provisioned" } });
      return;
    }

    if (url.pathname === "/api/v1/leads/lead-1/sending-domain/readiness") {
      await route.fulfill({ json: { ready: false, reason: "NOT_PROVISIONED" } });
      return;
    }

    await route.abort();
  });

  await page.goto("/admin/leads");
  await page.getByRole("button", { name: "Add lead" }).click();
  await page.getByLabel("Company name").fill("Acme Corp");
  await page.getByLabel("Name", { exact: true }).fill("Sara Youssef");
  await page.getByLabel("Email", { exact: true }).fill("SARA@ACME.EXAMPLE.COM");
  await page.getByRole("dialog").getByRole("button", { name: "Add lead" }).click();

  await expect(page.getByRole("heading", { name: "Existing lead updated" })).toBeVisible();
  await expect(page.getByText("sara@acme.example.com")).toBeVisible();
  expect(createCount).toBe(1);

  await page.getByRole("button", { name: "View existing lead" }).click();
  await expect(page).toHaveURL(/\/admin\/leads\/lead-1/);
  await expect(page.getByText("Primary contact name is required.")).toBeVisible();
  await expect(page.getByText("Primary contact email is required.")).toBeVisible();

  await page.getByRole("button", { name: "Refresh eligibility" }).click();
  await expect(page.getByText("This lead is eligible for conversion.")).toBeVisible();
  expect(eligibilityReadCount).toBe(2);
});
