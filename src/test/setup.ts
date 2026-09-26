import "@testing-library/jest-dom/vitest";
import { i18next } from "@/shared/i18n";
import arAudit from "../../public/locales/ar/audit.json";
import arAuth from "../../public/locales/ar/auth.json";
import arCommon from "../../public/locales/ar/common.json";
import arNotification from "../../public/locales/ar/notification.json";
import enAudit from "../../public/locales/en/audit.json";
import enAuth from "../../public/locales/en/auth.json";
import enCommon from "../../public/locales/en/common.json";
import enNotification from "../../public/locales/en/notification.json";

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
