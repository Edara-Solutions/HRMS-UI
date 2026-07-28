import { expect, test } from "@playwright/test";

const NOW = "2026-07-27T09:00:00.000Z";
const LATER = "2026-07-27T10:15:00.000Z";

const COMPANY_ID = "company-1";
const PROFILE_ID = "profile-1";
const PROFILE_STEP_ID = "11111111-1111-4111-8111-111111111111";
const ROLES_STEP_ID = "22222222-2222-4222-8222-222222222222";
const BRANCHES_STEP_ID = "33333333-3333-4333-8333-333333333333";

function ownerSession() {
  return {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    sessionId: "session-1",
    expiresIn: 900,
    user: {
      publicId: "owner-1",
      employeeCode: "OWNER-001",
      firstName: "Nadia",
      lastName: "Hassan",
      email: "owner@example.com",
      status: "ACTIVE",
      companyCode: "NW",
      companyPublicId: COMPANY_ID,
      mustChangePassword: false,
      permissions: [],
      isOwner: true,
      isPlatformAdmin: false,
    },
  };
}

function profileState() {
  return {
    publicId: PROFILE_ID,
    companyPublicId: COMPANY_ID,
    name: "Northwind Egypt",
    logoUrl: null,
    email: "owner@example.com",
    phone: null,
    country: null,
    city: null,
    addressLine: null,
    taxNumber: null,
    commercialNumber: null,
    status: "INCOMPLETE",
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function activationState() {
  return {
    companyPublicId: COMPANY_ID,
    lifecycleStatus: "ONBOARDING",
    activatedAt: null,
    canActivate: false,
    unmetRequirements: [
      {
        code: "COMPANY_PROFILE_INCOMPLETE",
        message: "Fill the profile first.",
        details: {},
      },
    ],
  };
}

function checklistState() {
  return {
    companyPublicId: COMPANY_ID,
    templateVersion: 2,
    steps: [
      {
        publicId: BRANCHES_STEP_ID,
        stepType: "SET_BRANCHES",
        status: "PENDING",
        isRequired: false,
        sequence: 3,
        templateVersion: 2,
        dependencies: ["SET_ROLES"],
        startedAt: null,
        completedAt: null,
        createdAt: "2026-07-27T09:20:00.000Z",
        updatedAt: "2026-07-27T09:20:00.000Z",
      },
      {
        publicId: PROFILE_STEP_ID,
        stepType: "SET_COMPANY_PROFILE",
        status: "PENDING",
        isRequired: true,
        sequence: 1,
        templateVersion: 2,
        dependencies: [],
        startedAt: null,
        completedAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        publicId: ROLES_STEP_ID,
        stepType: "SET_ROLES",
        status: "PENDING",
        isRequired: true,
        sequence: 2,
        templateVersion: 2,
        dependencies: ["SET_COMPANY_PROFILE"],
        startedAt: null,
        completedAt: null,
        createdAt: "2026-07-27T09:10:00.000Z",
        updatedAt: "2026-07-27T09:10:00.000Z",
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
  }, ownerSession());
});

test("runs the owner setup checklist with controlled step responses", async ({ page }) => {
  let profile = profileState();
  let activation = activationState();
  const checklist = checklistState();
  let releaseStart: (() => void) | undefined;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === "GET" && url.pathname === `/api/v1/companies/${COMPANY_ID}/profile`) {
      await route.fulfill({ json: profile });
      return;
    }

    if (request.method() === "GET" && url.pathname === `/api/v1/companies/${COMPANY_ID}/setup`) {
      await route.fulfill({ json: checklist });
      return;
    }

    if (
      request.method() === "GET" &&
      url.pathname === `/api/v1/companies/${COMPANY_ID}/activation`
    ) {
      await route.fulfill({ json: activation });
      return;
    }

    const startMatch = url.pathname.match(
      new RegExp(`^/api/v1/companies/${COMPANY_ID}/setup/([^/]+)/start$`),
    );
    if (request.method() === "POST" && startMatch) {
      const stepId = startMatch[1];
      const step = checklist.steps.find((candidate) => candidate.publicId === stepId);
      if (!step) {
        await route.fulfill({ status: 404, json: { error: "Not found" } });
        return;
      }

      const nextStep = {
        ...step,
        status: "IN_PROGRESS",
        startedAt: NOW,
        updatedAt: LATER,
      };
      if (stepId === ROLES_STEP_ID) {
        await new Promise<void>((resolve) => {
          releaseStart = resolve;
        });
      }
      Object.assign(step, nextStep);
      await route.fulfill({ json: nextStep });
      return;
    }

    const completeMatch = url.pathname.match(
      new RegExp(`^/api/v1/companies/${COMPANY_ID}/setup/([^/]+)/complete$`),
    );
    if (request.method() === "POST" && completeMatch) {
      const stepId = completeMatch[1];
      const step = checklist.steps.find((candidate) => candidate.publicId === stepId);
      if (!step) {
        await route.fulfill({ status: 404, json: { error: "Not found" } });
        return;
      }

      const completedStep = {
        ...step,
        status: "COMPLETED",
        completedAt: LATER,
        updatedAt: LATER,
      };
      Object.assign(step, completedStep);
      profile = { ...profile, name: "Northwind Egypt Synced", updatedAt: LATER };
      activation = {
        ...activation,
        lifecycleStatus: "ACTIVE",
        activatedAt: LATER,
        canActivate: true,
        unmetRequirements: [],
      };
      await route.fulfill({ json: completedStep });
      return;
    }

    const skipMatch = url.pathname.match(
      new RegExp(`^/api/v1/companies/${COMPANY_ID}/setup/([^/]+)/skip$`),
    );
    if (request.method() === "POST" && skipMatch) {
      const stepId = skipMatch[1];
      const step = checklist.steps.find((candidate) => candidate.publicId === stepId);
      if (!step) {
        await route.fulfill({ status: 404, json: { error: "Not found" } });
        return;
      }

      const skippedStep = {
        ...step,
        status: "SKIPPED",
        updatedAt: LATER,
      };
      Object.assign(step, skippedStep);
      await route.fulfill({ json: skippedStep });
      return;
    }

    await route.abort();
  });

  await page.goto("/company/setup");
  await expect(page.locator("h3")).toHaveText([
    "Profile snapshot",
    "Company profile",
    "Roles",
    "Branches",
    "Activation",
    "Checklist snapshot",
  ]);

  const rolesStart = page.getByRole("button", { name: "Start Roles" });
  const rolesComplete = page.getByRole("button", { name: "Complete Roles" });
  const branchesSkip = page.getByRole("button", { name: "Skip Branches" });

  await rolesStart.click();
  await expect(rolesStart).toBeDisabled();
  await expect(page.getByRole("button", { name: "Complete Roles" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Skip Roles" })).toBeEnabled();
  releaseStart?.();
  await expect(page.getByText("Roles step started.")).toBeVisible();
  await expect(page.getByText("in progress", { exact: true })).toBeVisible();

  await rolesComplete.click();
  await expect(page.getByText("Roles step completed.")).toBeVisible();
  await expect(page.getByText("Northwind Egypt Synced", { exact: true })).toBeVisible();
  await expect(page.getByText("ACTIVE", { exact: true })).toBeVisible();

  await rolesComplete.click();
  await expect(page.getByText("Roles step completed.")).toBeVisible();

  await branchesSkip.click();
  await expect(page.getByText("Branches step skipped.")).toBeVisible();
  await expect(page.getByText("skipped", { exact: true })).toBeVisible();
});
