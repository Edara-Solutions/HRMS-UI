import { expect, test } from "@playwright/test";

const CATALOG = {
  items: [
    {
      key: "owner-invitation",
      description: "Invite the initial Company Owner.",
      context: "EDARA",
      payloadVersion: 1,
      supportedLocales: ["en", "ar"],
      criticality: "CRITICAL",
      defaultTemplateKey: "edara-owner-invitation-v1",
    },
    {
      key: "employee-invitation",
      description: "Invite an employee in the Company's voice.",
      context: "COMPANY",
      payloadVersion: 1,
      supportedLocales: ["en", "ar"],
      criticality: "OPERATIONAL",
      defaultTemplateKey: "company-employee-invitation-v1",
    },
  ],
};

const OWNER_PREVIEW = {
  emailTypeKey: "owner-invitation",
  templateKey: "edara-owner-invitation-v1",
  context: "EDARA",
  locale: "en",
  subject: "You are invited to set up your Company on Edara",
  preheader: "Your safe sample invitation is ready.",
  html: "<html><body><h1>Welcome to Edara</h1></body></html>",
  text: "Welcome to Edara",
};

const COMPANY_PREVIEW = {
  emailTypeKey: "employee-invitation",
  templateKey: "company-employee-invitation-v1",
  context: "COMPANY",
  locale: "ar",
  subject: "دعوة للانضمام إلى شركة النور",
  preheader: "دعوة تجريبية آمنة.",
  html: '<html lang="ar" dir="rtl"><body><h1>شركة النور</h1></body></html>',
  text: "شركة النور",
  senderIdentity: {
    name: "شركة النور",
    address: "people@alnoor.example",
    replyTo: "hr@alnoor.example",
  },
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

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname === "/api/v1/email-types") {
      await route.fulfill({ json: CATALOG });
      return;
    }

    if (url.pathname === "/api/v1/email-types/owner-invitation/preview") {
      await route.fulfill({ json: OWNER_PREVIEW });
      return;
    }

    if (url.pathname === "/api/v1/email-types/employee-invitation/preview") {
      await route.fulfill({ json: COMPANY_PREVIEW });
      return;
    }

    await route.abort();
  });
});

test("opens the Admin Email catalog and keeps Company preview white-label", async ({ page }) => {
  await page.goto("/admin/email");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("heading", { name: "Email", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Email" })).toBeVisible();
  await expect(page.getByTitle("Owner Invitation email preview")).toBeVisible();

  await page.getByRole("button", { name: /Employee Invitation Company Email/ }).click();
  await page.getByRole("button", { name: "Arabic preview" }).click();

  const companyFrame = page.getByTitle("Employee Invitation email preview");
  await expect(companyFrame).toBeVisible();
  await expect(page.getByText("people@alnoor.example")).toBeVisible();
  await expect(companyFrame).toHaveAttribute("srcdoc", /شركة النور/);
  await expect(companyFrame).not.toHaveAttribute("srcdoc", /Edara/i);
});

test("stays usable in dark mode, RTL, and a narrow desktop viewport", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/admin/email");

  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("button", { name: /Switch language.*English/ }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "البريد", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "البريد" })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
