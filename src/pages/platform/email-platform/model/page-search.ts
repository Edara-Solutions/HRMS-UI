import { z } from "zod";
import type { EmailContext, EmailLocale } from "../api/email-platform";

const EMAIL_CONTEXTS = ["EDARA", "COMPANY"] as const satisfies readonly EmailContext[];
const CONTEXT_FILTERS = ["ALL", ...EMAIL_CONTEXTS] as const;
const EMAIL_LOCALES = ["en", "ar"] as const satisfies readonly EmailLocale[];
const PREVIEW_VIEWS = ["html", "text"] as const;

export const pageSearchSchema = z.object({
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
