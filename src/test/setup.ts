import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import { i18next } from "@/shared/i18n";
import arAudit from "../../public/locales/ar/audit.json";
import arAuth from "../../public/locales/ar/auth.json";
import arCommon from "../../public/locales/ar/common.json";
import arCommunications from "../../public/locales/ar/communications.json";
import arNotification from "../../public/locales/ar/notification.json";
import arOrganization from "../../public/locales/ar/organization.json";
import arPeople from "../../public/locales/ar/people.json";
import arPlatformPeople from "../../public/locales/ar/platform-people.json";
import enAudit from "../../public/locales/en/audit.json";
import enAuth from "../../public/locales/en/auth.json";
import enCommon from "../../public/locales/en/common.json";
import enCommunications from "../../public/locales/en/communications.json";
import enNotification from "../../public/locales/en/notification.json";
import enOrganization from "../../public/locales/en/organization.json";
import enPeople from "../../public/locales/en/people.json";
import enPlatformPeople from "../../public/locales/en/platform-people.json";

// Locale loading must not race transport tests that replace global fetch. The real
// shipped resources below remain authoritative; browser tests exercise the HTTP backend.
vi.mock("i18next-http-backend", () => ({
  default: class FixtureLocaleBackend {
    static type = "backend";
    type = "backend";
    read(
      ...request: [
        language: string,
        namespace: string,
        complete: (error: Error | null, data: Record<string, unknown>) => void,
      ]
    ) {
      request[2](null, {});
    }
  },
}));

// The app fetches locale resources over HTTP, which jsdom has no server for. Registering
// the shipped files keeps every asserted label the one a user reads, and keeps `t`
// synchronous so a render needs no waiting.
i18next.addResourceBundle("en", "audit", enAudit);
i18next.addResourceBundle("ar", "audit", arAudit);
i18next.addResourceBundle("en", "auth", enAuth);
i18next.addResourceBundle("ar", "auth", arAuth);
i18next.addResourceBundle("en", "common", enCommon);
i18next.addResourceBundle("ar", "common", arCommon);
i18next.addResourceBundle("en", "notification", enNotification);
i18next.addResourceBundle("ar", "notification", arNotification);
i18next.addResourceBundle("en", "organization", enOrganization);
i18next.addResourceBundle("ar", "organization", arOrganization);
i18next.addResourceBundle("en", "people", enPeople);
i18next.addResourceBundle("ar", "people", arPeople);
i18next.addResourceBundle("en", "communications", enCommunications);
i18next.addResourceBundle("ar", "communications", arCommunications);
i18next.addResourceBundle("en", "platform-people", enPlatformPeople);
i18next.addResourceBundle("ar", "platform-people", arPlatformPeople);

import arPlatformCompanies from "../../public/locales/ar/platform-companies.json";
import enPlatformCompanies from "../../public/locales/en/platform-companies.json";

i18next.addResourceBundle("en", "platform-companies", enPlatformCompanies);
i18next.addResourceBundle("ar", "platform-companies", arPlatformCompanies);

import arPlatformDashboard from "../../public/locales/ar/platform-dashboard.json";
import arPlatformLeads from "../../public/locales/ar/platform-leads.json";
import enPlatformDashboard from "../../public/locales/en/platform-dashboard.json";
import enPlatformLeads from "../../public/locales/en/platform-leads.json";

i18next.addResourceBundle("en", "platform-leads", enPlatformLeads);
i18next.addResourceBundle("ar", "platform-leads", arPlatformLeads);
i18next.addResourceBundle("en", "platform-dashboard", enPlatformDashboard);
i18next.addResourceBundle("ar", "platform-dashboard", arPlatformDashboard);

import arPlatformNotifications from "../../public/locales/ar/platform-notifications.json";
import arPlatformPlans from "../../public/locales/ar/platform-plans.json";
import enPlatformNotifications from "../../public/locales/en/platform-notifications.json";
import enPlatformPlans from "../../public/locales/en/platform-plans.json";

i18next.addResourceBundle("en", "platform-plans", enPlatformPlans);
i18next.addResourceBundle("ar", "platform-plans", arPlatformPlans);

i18next.addResourceBundle("en", "platform-notifications", enPlatformNotifications);
i18next.addResourceBundle("ar", "platform-notifications", arPlatformNotifications);

import arPlatformEmails from "../../public/locales/ar/platform-emails.json";
import enPlatformEmails from "../../public/locales/en/platform-emails.json";

i18next.addResourceBundle("en", "platform-emails", enPlatformEmails);
i18next.addResourceBundle("ar", "platform-emails", arPlatformEmails);

import arplatformannouncements from "../../public/locales/ar/platform-announcements.json";
import enplatformannouncements from "../../public/locales/en/platform-announcements.json";

i18next.addResourceBundle("en", "platform-announcements", enplatformannouncements);
i18next.addResourceBundle("ar", "platform-announcements", arplatformannouncements);

import arplatformemailsending from "../../public/locales/ar/platform-email-sending.json";
import enplatformemailsending from "../../public/locales/en/platform-email-sending.json";

i18next.addResourceBundle("en", "platform-email-sending", enplatformemailsending);
i18next.addResourceBundle("ar", "platform-email-sending", arplatformemailsending);

import arplatformemaildeliveries from "../../public/locales/ar/platform-email-deliveries.json";
import enplatformemaildeliveries from "../../public/locales/en/platform-email-deliveries.json";

i18next.addResourceBundle("en", "platform-email-deliveries", enplatformemaildeliveries);
i18next.addResourceBundle("ar", "platform-email-deliveries", arplatformemaildeliveries);

import arPlatformAccessSession from "../../public/locales/ar/platform-access-session.json";
import enPlatformAccessSession from "../../public/locales/en/platform-access-session.json";

i18next.addResourceBundle("en", "platform-access-session", enPlatformAccessSession);
i18next.addResourceBundle("ar", "platform-access-session", arPlatformAccessSession);
