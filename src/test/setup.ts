import "@testing-library/jest-dom/vitest";
import { i18next } from "@/shared/i18n";
import arAudit from "../../public/locales/ar/audit.json";
import enAudit from "../../public/locales/en/audit.json";

// The app fetches locale resources over HTTP, which jsdom has no server for. Registering
// the shipped files keeps every asserted label the one a user reads, and keeps `t`
// synchronous so a render needs no waiting.
i18next.addResourceBundle("en", "audit", enAudit);
i18next.addResourceBundle("ar", "audit", arAudit);
