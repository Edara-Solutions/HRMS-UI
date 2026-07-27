import { expect, test } from "@playwright/test";

const NOW = "2026-07-27T09:00:00.000Z";

const incompleteProfile = {
  publicId: "profile-1",
  companyPublicId: "company-1",
  name: "Northwind Egypt",
  logoUrl: null,
  email: null,
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

function setup(status: "PENDING" | "COMPLETED") {
  return {
    companyPublicId: "company-1",
    templateVersion: 1,
    steps: [
      {
        publicId: "step-1",
        stepType: "SET_COMPANY_PROFILE",
        status,
        isRequired: true,
        sequence: 1,
        templateVersion: 1,
        dependencies: [],
        startedAt: null,
        completedAt: status === "COMPLETED" ? "2026-07-27T10:00:00.000Z" : null,
        createdAt: NOW,
        updatedAt: "2026-07-27T10:00:00.000Z",
      },
    ],
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
              publicId: "owner-1",
              employeeCode: "OWNER-001",
              firstName: "Nadia",
              lastName: "Hassan",
              email: "owner@example.com",
              status: "ACTIVE",
              companyCode: "NW",
              companyPublicId: "company-1",
              mustChangePassword: false,
              permissions: [],
              isOwner: true,
              isPlatformAdmin: false,
            },
          },
        },
        version: 0,
      }),
    );
  });
});

test("owner completes company profile and sees setup synchronization", async ({ page }) => {
  let profile = incompleteProfile;
  let setupStatus: "PENDING" | "COMPLETED" = "PENDING";
  let patchBody: unknown;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === "/api/v1/companies/company-1/profile" && request.method() === "GET") {
      await route.fulfill({ json: profile });
      return;
    }

    if (url.pathname === "/api/v1/companies/company-1/setup" && request.method() === "GET") {
      await route.fulfill({ json: setup(setupStatus) });
      return;
    }

    if (url.pathname === "/api/v1/companies/company-1/profile" && request.method() === "PATCH") {
      patchBody = request.postDataJSON();
      profile = {
        ...profile,
        ...patchBody,
        email: "owner@example.com",
        status: "COMPLETE",
        updatedAt: "2026-07-27T10:00:00.000Z",
      };
      setupStatus = "COMPLETED";
      await route.fulfill({ json: profile });
      return;
    }

    await route.abort();
  });

  await page.goto("/company/profile");
  await expect(page.getByText("Incomplete")).toBeVisible();

  await page.getByLabel("Email").fill("OWNER@EXAMPLE.COM");
  await page.getByLabel("Phone").fill("+20 100 000 0000");
  await page.getByLabel("Country").fill("EG");
  await page.getByLabel("City").fill("Cairo");
  await page.getByLabel("Address line").fill("12 Nile Street");
  await page.getByRole("button", { name: "Save profile" }).click();

  await expect(
    page.getByText("Profile saved. Continue with the remaining setup checklist."),
  ).toBeVisible();
  await expect(page.getByText("Complete", { exact: true })).toBeVisible();
  await expect(page.getByText("Setup: completed")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue("owner@example.com");
  expect(patchBody).toEqual({
    email: "OWNER@EXAMPLE.COM",
    phone: "+20 100 000 0000",
    country: "EG",
    city: "Cairo",
    addressLine: "12 Nile Street",
  });
});
