import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const PLAN = {
  publicId: "11111111-1111-4111-8111-111111111111",
  name: "Growth",
  description: "For growing teams",
  duration: 30,
  features: ["OVERVIEW"],
  limits: { MAX_USERS: 100 },
  isPublic: true,
  isActive: true,
  prices: [],
  effectivePrice: null,
  createdAt: "2026-07-25T10:00:00.000Z",
  updatedAt: "2026-07-25T10:00:00.000Z",
  deletedAt: null,
};

const LEAD = {
  publicId: "lead-1",
  companyName: "Acme Corp",
  website: "https://acme.example.com",
  industry: "Retail",
  companySizeRange: "21_TO_50",
  country: "Egypt",
  city: "Cairo",
  source: "REFERRAL",
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

const PRIMARY_CONTACT = {
  publicId: "contact-1",
  name: "Sara Youssef",
  email: "sara@acme.example.com",
  phone: "+201000000000",
  jobTitle: "COO",
  isPrimary: true,
  createdAt: "2026-07-20T10:00:00.000Z",
  updatedAt: "2026-07-25T10:00:00.000Z",
  deletedAt: null,
};

const ELIGIBILITY = {
  isEligible: true,
  reasons: [],
  primaryContact: PRIMARY_CONTACT,
};

const PENDING_REQUEST = {
  publicId: "33333333-3333-4333-8333-333333333333",
  status: "PENDING",
  lead: { publicId: LEAD.publicId },
  plan: { publicId: PLAN.publicId, name: PLAN.name },
};

async function installSession(page: Page) {
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
}

function leadDetails() {
  return {
    lead: LEAD,
    contacts: [PRIMARY_CONTACT],
    activities: [],
    primaryContact: PRIMARY_CONTACT,
    conversionEligibility: ELIGIBILITY,
  };
}

async function selectPlan(page: Page) {
  const planSelect = page.getByRole("combobox", { name: "Conversion plan" });
  await expect(planSelect).toBeEnabled();
  await planSelect.press("g");
  await expect(planSelect).toContainText("Growth");
}

test("submits a pending lead-conversion request with public identifiers", async ({ page }) => {
  await installSession(page);
  let submittedBody: unknown;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/v1/leads/lead-1") return route.fulfill({ json: leadDetails() });
    if (url.pathname === "/api/v1/leads/lead-1/activities") {
      return route.fulfill({
        json: {
          items: [],
          meta: { mode: "page", page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
        },
      });
    }
    if (url.pathname === "/api/v1/leads/lead-1/conversion-eligibility") {
      return route.fulfill({ json: ELIGIBILITY });
    }
    if (url.pathname === "/api/v1/plans/public") return route.fulfill({ json: { data: [PLAN] } });
    if (url.pathname === "/api/v1/leads/lead-1/sending-domain") {
      return route.fulfill({ status: 404, json: { error: "Not provisioned" } });
    }
    if (url.pathname === "/api/v1/leads/lead-1/sending-domain/readiness") {
      return route.fulfill({ json: { ready: false, reason: "NOT_PROVISIONED" } });
    }
    if (url.pathname === "/api/v1/lead-conversion-requests" && request.method() === "POST") {
      submittedBody = request.postDataJSON();
      return route.fulfill({ status: 201, json: PENDING_REQUEST });
    }
    return route.abort();
  });

  await page.goto("/admin/leads/lead-1");
  await selectPlan(page);
  await page.getByRole("button", { name: "Submit for review" }).click();

  await expect(page.getByText("Conversion request submitted for review.")).toBeVisible();
  expect(submittedBody).toEqual({ leadPublicId: LEAD.publicId, planPublicId: PLAN.publicId });
});

test("recovers a committed pending request after immediate conversion fails", async ({ page }) => {
  await installSession(page);

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/v1/leads/lead-1") return route.fulfill({ json: leadDetails() });
    if (url.pathname === "/api/v1/leads/lead-1/activities") {
      return route.fulfill({
        json: {
          items: [],
          meta: { mode: "page", page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
        },
      });
    }
    if (url.pathname === "/api/v1/leads/lead-1/conversion-eligibility") {
      return route.fulfill({ json: ELIGIBILITY });
    }
    if (url.pathname === "/api/v1/plans/public") return route.fulfill({ json: { data: [PLAN] } });
    if (url.pathname === "/api/v1/leads/lead-1/sending-domain") {
      return route.fulfill({ status: 404, json: { error: "Not provisioned" } });
    }
    if (url.pathname === "/api/v1/leads/lead-1/sending-domain/readiness") {
      return route.fulfill({ json: { ready: false, reason: "NOT_PROVISIONED" } });
    }
    if (url.pathname === "/api/v1/lead-conversion-requests/immediate") {
      return route.fulfill({ status: 500, json: { error: "Provisioning failed" } });
    }
    if (url.pathname === "/api/v1/lead-conversion-requests") {
      expect(url.searchParams.get("status")).toBe("PENDING");
      return route.fulfill({
        json: {
          items: [PENDING_REQUEST],
          meta: { mode: "page", page: 1, pageSize: 100, totalItems: 1, totalPages: 1 },
        },
      });
    }
    return route.abort();
  });

  await page.goto("/admin/leads/lead-1");
  await selectPlan(page);
  await page.getByRole("button", { name: "Convert immediately" }).click();

  await expect(
    page.getByText(
      "Immediate conversion did not finish. The committed pending request is ready for reviewer recovery.",
    ),
  ).toBeVisible();
  await expect(page.getByText(PENDING_REQUEST.publicId, { exact: false })).toBeVisible();
});
