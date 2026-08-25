import { readFileSync } from "node:fs";
import i18next from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import type { SupportedLocale } from "@/shared/i18n";
import { NOTIFICATION_CATALOG } from "./notification-catalog";
import { resolveNotificationCopy } from "./notification-copy";

const readCopy = (locale: SupportedLocale) =>
  JSON.parse(readFileSync(`public/locales/${locale}/notification.json`, "utf8"));

const copyInstance = i18next.createInstance();

/** One sample per v1 catalog type, carrying the params its backend schema declares. */
const SAMPLE_PARAMS: Record<string, Record<string, unknown>> = {
  "platform.lead-created": {},
  "platform.conversion-requested": {},
  "platform.company-activated": {},
  "platform.conversion-decided": { decision: "approved" },
  "platform.announcement": {
    announcementPublicId: "a-1",
    message: {
      en: { title: "Scheduled maintenance", body: "Edara is upgrading on Friday." },
      ar: { title: "صيانة مجدولة", body: "سيتم تحديث إدارة يوم الجمعة." },
    },
  },
  "company.subscription-changed": { planName: "Growth", status: "active" },
  "company.role-assigned": { roleName: "Payroll Manager" },
  "company.user-joined": {},
};

function copyFor(typeKey: string, locale: SupportedLocale, params = SAMPLE_PARAMS[typeKey]) {
  return resolveNotificationCopy(
    { typeKey, params },
    copyInstance.getFixedT(locale, "notification"),
    locale,
  );
}

describe("resolveNotificationCopy", () => {
  beforeAll(async () => {
    await copyInstance.init({
      lng: "en",
      fallbackLng: "en",
      ns: ["notification"],
      defaultNS: "notification",
      interpolation: { escapeValue: false },
      resources: {
        en: { notification: readCopy("en") },
        ar: { notification: readCopy("ar") },
      },
    });
  });

  it("renders every v1 catalog type in both locales", () => {
    for (const typeKey of NOTIFICATION_CATALOG.keys()) {
      for (const locale of ["en", "ar"] as const) {
        const copy = copyFor(typeKey, locale);

        expect(copy, `${typeKey} (${locale})`).not.toBeNull();
        expect(copy?.title, `${typeKey} (${locale}) title`).not.toContain("notifications.");
        expect(copy?.body, `${typeKey} (${locale}) body`).not.toContain("notifications.");
      }
    }
  });

  it("interpolates typed params", () => {
    expect(copyFor("company.role-assigned", "en")?.body).toContain("Payroll Manager");
    expect(copyFor("company.subscription-changed", "en")?.body).toContain("Growth");
  });

  it("localizes closed enum params instead of interpolating the raw value", () => {
    expect(copyFor("platform.conversion-decided", "en")?.title).toContain("approved");
    expect(copyFor("platform.conversion-decided", "ar")?.title).toContain("مقبول");
  });

  it("takes the announcement's authored prose from params, falling back to en", () => {
    expect(copyFor("platform.announcement", "ar")?.title).toBe("صيانة مجدولة");

    const englishOnly = {
      announcementPublicId: "a-2",
      message: { en: { title: "Only English", body: "No Arabic authored." } },
    };
    expect(copyFor("platform.announcement", "ar", englishOnly)?.title).toBe("Only English");
  });

  it("skips a type key the mirror does not know", () => {
    expect(copyFor("platform.not-in-catalog", "en", {})).toBeNull();
  });
});
