import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAuthenticated } from "@/app/guards/auth-guards";
import {
  AdminEmailPlatformPage,
  type EmailContext,
  type EmailLocale,
} from "@/pages/admin/email-platform";

const EMAIL_CONTEXTS = ["EDARA", "COMPANY"] as const satisfies readonly EmailContext[];
const CONTEXT_FILTERS = ["ALL", ...EMAIL_CONTEXTS] as const;
const EMAIL_LOCALES = ["en", "ar"] as const satisfies readonly EmailLocale[];
const PREVIEW_VIEWS = ["html", "text"] as const;

const ADMIN_EMAIL_SEARCH_SCHEMA = z.object({
  context: z.enum(CONTEXT_FILTERS).catch("ALL"),
  emailTypeKey: z
    .preprocess(
      (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
      z.string().max(120).optional(),
    )
    .catch(undefined),
  locale: z.enum(EMAIL_LOCALES).catch("en"),
  view: z.enum(PREVIEW_VIEWS).catch("html"),
});

/** Normalizes URL-owned Email Platform filters into safe defaults. */
export function parseAdminEmailSearch(input: unknown) {
  return ADMIN_EMAIL_SEARCH_SCHEMA.parse(input);
}

/** Enforces Platform Admin access even when this route is loaded independently in tests. */
export function requireEmailPlatformRouteAccess() {
  return requireAuthenticated({ platformAdminOnly: true });
}

/** Platform Admin Email catalog and preview route. */
export const Route = createFileRoute("/admin/email/")({
  beforeLoad: requireEmailPlatformRouteAccess,
  validateSearch: parseAdminEmailSearch,
  component: AdminEmailPlatformPage,
});
