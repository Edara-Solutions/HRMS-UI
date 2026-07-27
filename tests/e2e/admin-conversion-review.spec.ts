import { expect, test } from "@playwright/test";

const REQUEST_ID = "33333333-3333-4333-8333-333333333333";
const LEAD_ID = "11111111-1111-4111-8111-111111111111";
const CONTACT_ID = "22222222-2222-4222-8222-222222222222";
const PLAN_ID = "44444444-4444-4444-8444-444444444444";
const REPLACEMENT_PLAN_ID = "55555555-5555-4555-8555-555555555555";
const REVIEWER_ID = "66666666-6666-4666-8666-666666666666";
const NOW = "2026-07-25T10:00:00.000Z";

const plan = (publicId: string, name: string) => ({
  publicId,
  name,
  description: `${name} plan`,
  duration: 30,
  features: ["OVERVIEW"],
  limits: { MAX_USERS: 100 },
  isPublic: true,
  isActive: true,
  prices: [],
  effectivePrice: null,
  createdAt: NOW,
  updatedAt: NOW,
  deletedAt: null,
});

const actor = {
  publicId: REVIEWER_ID,
  firstName: "Nadia",
  lastName: "Hassan",
  email: "nadia@example.com",
};

function request(status: "PENDING" | "APPROVED" | "REJECTED" = "PENDING") {
  return {
    publicId: REQUEST_ID,
    status,
    rejectionReason: status === "REJECTED" ? "Missing primary contact" : null,
    approvedAt: status === "APPROVED" ? NOW : null,
    rejectedAt: status === "REJECTED" ? NOW : null,
    createdAt: NOW,
    updatedAt: NOW,
    lead: {
      publicId: LEAD_ID,
      companyName: "Acme Egypt",
      website: "https://acme.example",
      industry: "Technology",
      country: "Egypt",
      companySizeRange: "21_TO_50",
      source: "REFERRAL",
      lostReason: null,
      numberOfAttempts: 1,
      lastAttemptAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
      deletedAt: null,
      city: "Cairo",
      status: status === "APPROVED" ? "CONVERTED" : "CONVERSION_PENDING",
      isConverted: status === "APPROVED",
      isArchived: false,
    },
    primaryContact: {
      publicId: CONTACT_ID,
      name: "Omar Ali",
      email: "omar@acme.example",
      phone: "+201000000000",
      jobTitle: "Owner",
      isPrimary: true,
      createdAt: NOW,
      updatedAt: NOW,
      deletedAt: null,
    },
    plan: plan(PLAN_ID, "Growth"),
    requester: actor,
    approvedBy: status === "APPROVED" ? actor : null,
    rejectedBy: status === "REJECTED" ? actor : null,
    company:
      status === "APPROVED"
        ? {
            publicId: "77777777-7777-4777-8777-777777777777",
            name: "Acme Egypt",
            companyCode: "ACME",
          }
        : null,
    ownerOnboardingDelivery:
      status === "APPROVED"
        ? {
            publicId: "88888888-8888-4888-8888-888888888888",
            status: "SUCCEEDED",
            attemptCount: 1,
            maxAttempts: 5,
            lastError: null,
            lastAttemptedAt: NOW,
            deliveredAt: NOW,
            exhaustedAt: null,
            createdAt: NOW,
            updatedAt: NOW,
          }
        : null,
  };
}

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
              publicId: "reviewer-1",
              employeeCode: "ADMIN-001",
              firstName: "Nadia",
              lastName: "Hassan",
              email: "nadia@example.com",
              status: "ACTIVE",
              companyCode: "EDARA",
              mustChangePassword: false,
              permissions: ["APPROVE_LEAD_CONVERSION_REQUEST", "REQUEST_LEAD_CONVERSION"],
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

test("reviewer corrects the plan and approves a pending request", async ({ page }) => {
  let current = request();
  let planBody: unknown;
  let approvalBody: unknown;

  await page.route("**/api/v1/plans?**", (route) =>
    route.fulfill({
      json: {
        data: [plan(PLAN_ID, "Growth"), plan(REPLACEMENT_PLAN_ID, "Enterprise")],
        meta: { mode: "offset", total: 2, limit: 20, offset: 0 },
      },
    }),
  );
  await page.route("**/api/v1/lead-conversion-requests**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname.endsWith(`/${REQUEST_ID}/plan`) && method === "PATCH") {
      planBody = route.request().postDataJSON();
      current = { ...current, plan: plan(REPLACEMENT_PLAN_ID, "Enterprise") };
      await route.fulfill({ json: current });
      return;
    }
    if (url.pathname.endsWith(`/${REQUEST_ID}/approve`) && method === "POST") {
      approvalBody = route.request().postDataJSON();
      current = { ...request("APPROVED"), plan: plan(REPLACEMENT_PLAN_ID, "Enterprise") };
      await route.fulfill({ json: current });
      return;
    }
    if (url.pathname.endsWith(`/${REQUEST_ID}`)) {
      await route.fulfill({ json: current });
      return;
    }
    await route.fulfill({
      json: {
        items: [current],
        meta: { mode: "page", page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
      },
    });
  });

  await page.goto("/admin/conversion-requests?status=PENDING&page=1&pageSize=10");
  await expect(page.getByText("Acme Egypt")).toBeVisible();
  await page.getByRole("button", { name: "Review request" }).click();
  await expect(page.getByText(CONTACT_ID)).toBeVisible();
  await expect(page.getByText(PLAN_ID)).toBeVisible();

  await page.getByLabel("Replacement plan").press("e");
  await page.getByRole("button", { name: "Update selected plan" }).click();
  await expect.poll(() => planBody).toEqual({ planPublicId: REPLACEMENT_PLAN_ID });
  await expect(page.getByText("Enterprise - 30 days")).toBeVisible();

  await page.getByRole("button", { name: "Approve and provision" }).click();
  await expect.poll(() => approvalBody).toEqual({ templateKey: 1 });
  await expect(page.getByText("This request is terminal and cannot be changed.")).toBeVisible();
  await expect(page.getByText("Provisioned company")).toBeVisible();
  await expect(page.getByText("Owner invitation delivery", { exact: true })).toBeVisible();
  await expect(page.getByText("succeeded", { exact: true })).toBeVisible();
});

test("reviewer rejects with a trimmed reason and sees that later resubmission remains available", async ({
  page,
}) => {
  let current = request();
  let rejectionBody: unknown;
  let resubmissionBody: unknown;

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === `/api/v1/leads/${LEAD_ID}`) {
      await route.fulfill({
        json: {
          lead: {
            ...request().lead,
            companySizeRange: "21_TO_50",
            source: "REFERRAL",
            lostReason: null,
            numberOfAttempts: 1,
            lastAttemptAt: NOW,
            deletedAt: null,
          },
          contacts: [request().primaryContact],
          activities: [],
          primaryContact: request().primaryContact,
          conversionEligibility: {
            isEligible: true,
            reasons: [],
            primaryContact: request().primaryContact,
          },
        },
      });
      return;
    }
    if (url.pathname === `/api/v1/leads/${LEAD_ID}/activities`) {
      await route.fulfill({
        json: {
          items: [],
          meta: { mode: "page", page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
        },
      });
      return;
    }
    if (url.pathname === `/api/v1/leads/${LEAD_ID}/conversion-eligibility`) {
      await route.fulfill({
        json: { isEligible: true, reasons: [], primaryContact: request().primaryContact },
      });
      return;
    }
    if (url.pathname === "/api/v1/plans/public") {
      await route.fulfill({ json: { data: [plan(PLAN_ID, "Growth")] } });
      return;
    }
    if (url.pathname === `/api/v1/leads/${LEAD_ID}/sending-domain`) {
      await route.fulfill({ status: 404, json: { error: "Not provisioned" } });
      return;
    }
    if (url.pathname === `/api/v1/leads/${LEAD_ID}/sending-domain/readiness`) {
      await route.fulfill({ json: { ready: false, reason: "NOT_PROVISIONED" } });
      return;
    }
    await route.abort();
  });

  await page.route("**/api/v1/plans?**", (route) =>
    route.fulfill({
      json: {
        data: [plan(PLAN_ID, "Growth")],
        meta: { mode: "offset", total: 1, limit: 20, offset: 0 },
      },
    }),
  );
  await page.route("**/api/v1/lead-conversion-requests**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith(`/${REQUEST_ID}/reject`) && route.request().method() === "POST") {
      rejectionBody = route.request().postDataJSON();
      current = request("REJECTED");
      await route.fulfill({ json: current });
      return;
    }
    if (
      url.pathname === "/api/v1/lead-conversion-requests" &&
      route.request().method() === "POST"
    ) {
      resubmissionBody = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        json: {
          publicId: "99999999-9999-4999-8999-999999999999",
          status: "PENDING",
          lead: { publicId: LEAD_ID },
          plan: { publicId: PLAN_ID, name: "Growth" },
        },
      });
      return;
    }
    await route.fulfill({ json: current });
  });

  await page.goto(`/admin/conversion-requests/${REQUEST_ID}`);
  await page.getByLabel("Rejection reason").fill("  Missing primary contact  ");
  await page.getByRole("button", { name: "Reject request" }).click();

  await expect.poll(() => rejectionBody).toEqual({ reason: "Missing primary contact" });
  await expect(page.getByText("This request is terminal and cannot be changed.")).toBeVisible();
  await expect(page.getByText("Reason: Missing primary contact")).toBeVisible();

  await page.goto(`/admin/leads/${LEAD_ID}`);
  await page.getByRole("combobox", { name: "Conversion plan" }).press("g");
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect
    .poll(() => resubmissionBody)
    .toEqual({
      leadPublicId: LEAD_ID,
      planPublicId: PLAN_ID,
    });
});

test("recovers retryable owner delivery and completes invitation acceptance into tenant context", async ({
  page,
}) => {
  const invitationToken = "owner-invitation-token";
  const ownerTokens = {
    accessToken: "owner-access-token",
    refreshToken: "owner-refresh-token",
    sessionId: "owner-session-1",
    expiresIn: 900,
  };
  const owner = {
    publicId: "99999999-9999-4999-8999-999999999999",
    employeeCode: "OWN-001",
    firstName: "Omar",
    lastName: "Ali",
    email: "omar@acme.example",
    status: "ACTIVE",
    companyCode: "ACME",
    mustChangePassword: false,
    permissions: [],
    isOwner: true,
    isPlatformAdmin: false,
  };
  let delivery = {
    publicId: "88888888-8888-4888-8888-888888888888",
    status: "FAILED_RETRYABLE",
    attemptCount: 2,
    maxAttempts: 3,
    lastError: "SMTP timeout",
    lastAttemptedAt: "2026-07-25T10:05:00.000Z",
    deliveredAt: null,
    exhaustedAt: null,
    createdAt: NOW,
    updatedAt: "2026-07-25T10:05:00.000Z",
  };
  let retryCount = 0;
  let acceptBody: unknown;

  const current = {
    ...request("APPROVED"),
    ownerOnboardingDelivery: delivery,
  };

  await page.route("**/api/v1/plans?**", (route) =>
    route.fulfill({
      json: {
        data: [plan(PLAN_ID, "Growth")],
        meta: { mode: "offset", total: 1, limit: 20, offset: 0 },
      },
    }),
  );

  await page.route("**/api/v1/lead-conversion-requests/**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (url.pathname.endsWith(`/${REQUEST_ID}/onboarding-delivery/retry`) && method === "POST") {
      retryCount += 1;
      delivery = {
        ...delivery,
        status: "SUCCEEDED",
        attemptCount: 3,
        lastError: null,
        deliveredAt: "2026-07-25T10:10:00.000Z",
        updatedAt: "2026-07-25T10:10:00.000Z",
      };
      await route.fulfill({ json: delivery });
      return;
    }

    if (url.pathname.endsWith(`/${REQUEST_ID}/onboarding-delivery`) && method === "GET") {
      await route.fulfill({ json: delivery });
      return;
    }

    if (url.pathname.endsWith(`/${REQUEST_ID}`)) {
      await route.fulfill({ json: { ...current, ownerOnboardingDelivery: delivery } });
      return;
    }

    await route.abort();
  });

  await page.route("**/api/v1/auth/accept-invitation", async (route) => {
    acceptBody = route.request().postDataJSON();
    await route.fulfill({ json: ownerTokens });
  });

  await page.route("**/api/v1/auth/me", async (route) => {
    await route.fulfill({ json: owner });
  });

  await page.goto(`/admin/conversion-requests/${REQUEST_ID}`);
  await expect(page.getByText("failed retryable")).toBeVisible();
  await expect(page.getByText("SMTP timeout")).toBeVisible();
  await page.getByRole("button", { name: "Retry delivery" }).click();

  await expect.poll(() => retryCount).toBe(1);
  await expect(page.getByText("succeeded", { exact: true })).toBeVisible();
  await expect(
    page.getByText("This does not mean the owner accepted the invitation."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry delivery" })).toBeDisabled();

  await page.goto(`/accept-invitation?token=${invitationToken}`);
  await page.getByRole("textbox", { name: "New password", exact: true }).fill("StrongPassword123!");
  await page
    .getByRole("textbox", { name: "Confirm new password", exact: true })
    .fill("StrongPassword123!");
  await page.getByRole("button", { name: "Accept invitation" }).click();

  await expect
    .poll(() => acceptBody)
    .toEqual({
      token: invitationToken,
      newPassword: "StrongPassword123!",
      clientType: "web",
    });
  await expect(page).toHaveURL(/\/company\/dashboard/);
  await expect(
    page.evaluate(() => JSON.parse(localStorage.getItem("hrms-auth") ?? "{}").state.session.user),
  ).resolves.toMatchObject({
    isOwner: true,
    companyCode: "ACME",
    permissions: [],
  });
});
