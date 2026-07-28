import { expect, test } from "@playwright/test";

const COMPANY_ID = "77777777-7777-4777-8777-777777777777";
const PLAN_ID = "44444444-4444-4444-8444-444444444444";
const SUBSCRIPTION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const HISTORY_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const POLICY_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const NOW = "2026-07-28T10:00:00.000Z";

function installAdminSession() {
  return {
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
  };
}

function company() {
  return {
    publicId: COMPANY_ID,
    logo: null,
    name: "Nexus Technologies",
    website: "https://nexustech.sa",
    phoneNumber: "+966112345678",
    country: "Saudi Arabia",
    companyCode: "NEXUS",
    isActive: true,
    addressLine: "King Fahd Road, Riyadh",
    createdAt: "2026-05-20T10:00:00.000Z",
    updatedAt: "2026-05-20T10:00:00.000Z",
    deletedAt: null,
  };
}

function companyConfigs() {
  return {
    data: [
      {
        public_id: "config-1",
        companyId: 1,
        planId: 1,
        subscriptionStatus: "TRIAL",
        siteStatus: {
          isFrozen: false,
          isReadOnly: false,
          isBlocked: true,
          isUnderMaintenance: false,
          note: "Blocked during activation repair",
        },
        subscriptionStartDate: null,
        subscriptionEndDate: null,
        trialEndDate: "2026-07-20T00:00:00.000Z",
        subscriptionNotes: null,
        createdAt: "2026-05-20T10:00:00.000Z",
        updatedAt: "2026-05-20T10:00:00.000Z",
        deletedAt: null,
        company: {
          publicId: COMPANY_ID,
          name: "Nexus Technologies",
          companyCode: "NEXUS",
          country: "Saudi Arabia",
          isActive: true,
          phoneNumber: "+966112345678",
        },
        plan: {
          publicId: PLAN_ID,
          name: "Full Access",
          duration: 30,
          features: [],
          limits: {},
          isPublic: false,
          isActive: true,
        },
      },
    ],
  };
}

function sendingDomain() {
  return {
    domain: "mail.nexustech.sa",
    status: "VERIFIED",
    health: "HEALTHY",
    dnsRecords: [
      {
        kind: "OWNERSHIP_TXT",
        host: "_edara-verify.mail.nexustech.sa",
        recordType: "TXT",
        value: "edara-verify=nexus",
        description: "Ownership record",
      },
    ],
    checkResults: [{ kind: "OWNERSHIP_TXT", status: "VERIFIED", failureDetail: null }],
    verifiedAt: "2026-06-01T10:00:00.000Z",
    lastFailure: null,
    createdAt: "2026-05-20T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
  };
}

function subscriptionState(
  trialEndDate = "2026-07-20T00:00:00.000Z",
  reason = "Initial onboarding trial",
) {
  return {
    subscription: {
      publicId: SUBSCRIPTION_ID,
      companyPublicId: COMPANY_ID,
      plan: { publicId: PLAN_ID, name: "Full Access", duration: 30 },
      status: "TRIAL",
      startDate: "2026-05-20T10:00:00.000Z",
      endDate: null,
      initialTrialEndDate: "2026-07-20T00:00:00.000Z",
      trialEndDate,
      note: "Customer setup window",
      createdAt: "2026-05-20T10:00:00.000Z",
      updatedAt: trialEndDate,
    },
    history: [
      {
        publicId: HISTORY_ID,
        type: reason === "Initial onboarding trial" ? "TRIAL_STARTED" : "TRIAL_EXTENDED",
        plan: { publicId: PLAN_ID, name: "Full Access", duration: 30 },
        oldStatus: null,
        newStatus: "TRIAL",
        oldTrialEndDate: reason === "Initial onboarding trial" ? null : "2026-07-20T00:00:00.000Z",
        newTrialEndDate: trialEndDate,
        actorUserId: 1,
        reason,
        occurredAt: trialEndDate,
      },
    ],
  };
}

function accessPolicyState(
  mode: "BLOCKED" | "NORMAL" | "READ_ONLY" | "FROZEN" | "MAINTENANCE" = "BLOCKED",
) {
  return {
    policy: {
      publicId: POLICY_ID,
      companyPublicId: COMPANY_ID,
      mode,
      reason:
        mode === "BLOCKED" ? "Activation held for support review" : "Activation blockers repaired",
      note: mode === "BLOCKED" ? "Support lock" : "Company can continue onboarding",
      effectiveFrom: "2026-07-20T00:00:00.000Z",
      effectiveUntil: null,
      changedByUserId: 1,
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: mode === "BLOCKED" ? "2026-07-20T00:00:00.000Z" : NOW,
      source: "policy",
    },
    effectiveMode: mode,
    effectiveAt: NOW,
    isCurrentlyEffective: true,
    isExpired: false,
    legacyMapping: null,
  };
}

function activationState(canActivate: boolean) {
  return {
    companyPublicId: COMPANY_ID,
    lifecycleStatus: canActivate ? "ACTIVE" : "ONBOARDING",
    activatedAt: canActivate ? NOW : null,
    canActivate,
    unmetRequirements: canActivate
      ? []
      : [
          {
            code: "SUBSCRIPTION_NOT_ACTIVATABLE",
            message: "Trial is expired.",
            details: {},
          },
          {
            code: "ACCESS_POLICY_RESTRICTS_ACTIVATION",
            message: "Stored policy blocks activation.",
            details: {},
          },
        ],
  };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((session) => {
    localStorage.setItem(
      "hrms-auth",
      JSON.stringify({ state: { status: "authenticated", session }, version: 0 }),
    );
  }, installAdminSession());
});

test("support repairs subscription and access-policy activation blockers", async ({ page }) => {
  let subscription = subscriptionState();
  let policy = accessPolicyState();
  let activation = activationState(false);
  let trialPatchBody: { trialEndDate: string; reason: string } | null = null;
  let policyPatchBody: {
    mode: "NORMAL" | "READ_ONLY" | "FROZEN" | "BLOCKED" | "MAINTENANCE";
    reason: string;
    note: string | null;
    effectiveFrom: string;
    effectiveUntil: string | null;
  } | null = null;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "GET" && url.pathname === `/api/v1/companies/${COMPANY_ID}`) {
      await route.fulfill({ json: company() });
      return;
    }
    if (request.method() === "GET" && url.pathname === "/api/v1/company-configs") {
      await route.fulfill({ json: companyConfigs() });
      return;
    }
    if (
      request.method() === "GET" &&
      url.pathname === `/api/v1/companies/${COMPANY_ID}/sending-domain`
    ) {
      await route.fulfill({ json: sendingDomain() });
      return;
    }
    if (
      request.method() === "GET" &&
      url.pathname === `/api/v1/companies/${COMPANY_ID}/subscription`
    ) {
      await route.fulfill({ json: subscription });
      return;
    }
    if (
      request.method() === "GET" &&
      url.pathname === `/api/v1/companies/${COMPANY_ID}/access-policy`
    ) {
      await route.fulfill({ json: policy });
      return;
    }
    if (
      request.method() === "GET" &&
      url.pathname === `/api/v1/companies/${COMPANY_ID}/activation`
    ) {
      await route.fulfill({ json: activation });
      return;
    }
    if (
      request.method() === "PATCH" &&
      url.pathname === `/api/v1/companies/${COMPANY_ID}/subscription/trial`
    ) {
      trialPatchBody = request.postDataJSON();
      subscription = subscriptionState(trialPatchBody?.trialEndDate, trialPatchBody?.reason);
      await route.fulfill({ json: subscription });
      return;
    }
    if (
      request.method() === "PATCH" &&
      url.pathname === `/api/v1/companies/${COMPANY_ID}/access-policy`
    ) {
      policyPatchBody = request.postDataJSON();
      policy = accessPolicyState(policyPatchBody?.mode);
      activation = activationState(true);
      await route.fulfill({ json: policy.policy });
      return;
    }

    await route.abort();
  });

  await page.goto(`/admin/companies/${COMPANY_ID}`);
  await expect(page.getByRole("heading", { name: "Activation repairs" })).toBeVisible();
  await expect(page.getByText("Blocked", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Trial is expired.")).toBeVisible();

  await page.getByLabel("New trial end").fill("2026-08-05T00:00:00");
  await page.getByLabel("Reason").first().fill("  Customer needs setup buffer  ");
  await page.getByRole("button", { name: "Extend trial" }).click();
  await expect(page.getByText("Trial end must be a timezone-qualified instant.")).toBeVisible();
  await expect(page.getByLabel("New trial end")).toHaveValue("2026-08-05T00:00:00");

  await page.getByLabel("New trial end").fill("2026-08-05T00:00:00.000Z");
  await page.getByRole("button", { name: "Extend trial" }).click();
  await expect(
    page.getByText("Trial extension saved. Activation readiness refreshed."),
  ).toBeVisible();
  expect(trialPatchBody).toEqual({
    trialEndDate: "2026-08-05T00:00:00.000Z",
    reason: "Customer needs setup buffer",
  });

  await page.getByRole("combobox", { name: "Stored mode" }).press("n");
  await page.getByLabel("Reason").nth(1).fill("Activation blockers repaired");
  await page.getByLabel("Effective from").fill("2026-07-28T10:00:00.000Z");
  await page.getByRole("button", { name: "Save policy" }).click();

  await expect(
    page.getByText("Access policy saved. Effective policy and activation readiness refreshed."),
  ).toBeVisible();
  await expect(page.getByText("Can activate")).toBeVisible();
  expect(policyPatchBody).toEqual({
    mode: "NORMAL",
    reason: "Activation blockers repaired",
    note: "Support lock",
    effectiveFrom: "2026-07-28T10:00:00.000Z",
    effectiveUntil: null,
  });
});
