import {
  ArrowRightLeft,
  Building2,
  ClipboardCheck,
  CreditCard,
  type LucideIcon,
  Megaphone,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { z } from "zod";

/**
 * Frontend mirror of the backend Notification Type catalog (HRMS_Back_End#198 §2). The backend
 * ships keys and typed params; everything a row shows — tone, icon, copy, click-through — is
 * decided here, so no prose ever crosses the wire.
 */

export type NotificationImportance = "high" | "normal";

/** Semantic status colour for the row tile. */
export type NotificationTone = "info" | "success" | "warning";

/** The verified routes a row may navigate to; one member per click-through in the catalog. */
export type NotificationRoute =
  | { readonly to: "/admin/leads" | "/company/dashboard" | "/company/profile" }
  | { readonly to: "/admin/conversion-requests/$publicId"; readonly publicId: string };

export interface NotificationSubject {
  readonly type: string;
  readonly publicId: string;
}

export interface NotificationTypeEntry {
  readonly importance: NotificationImportance;
  readonly tone: NotificationTone;
  readonly icon: LucideIcon;
  /** Copy key declared by the backend catalog; `.title` and `.body` hang off it. */
  readonly copyKey: string;
  readonly paramsSchema: z.ZodType<Record<string, unknown>>;
  /**
   * Params holding a closed backend enum. Their values are localized through
   * `values.<param>.<value>` before interpolation, so Arabic copy never shows an English literal.
   */
  readonly enumParams?: readonly string[];
  /** `null` marks an informational type — the row renders without a navigation affordance. */
  readonly route: ((subject: NotificationSubject | null) => NotificationRoute | null) | null;
}

const noParams = z.object({}).passthrough();

const authoredMessageSchema = z.object({ title: z.string(), body: z.string() });

/**
 * The Announcement carries the Platform Admin's authored prose in its params. The publisher
 * requires both locales; treating `ar` as optional here is the en fallback the panel promises.
 */
export const announcementParamsSchema = z.object({
  announcementPublicId: z.string().min(1),
  message: z.object({ en: authoredMessageSchema, ar: authoredMessageSchema.optional() }),
});

export const ANNOUNCEMENT_TYPE_KEY = "platform.announcement";

function catalogEntry(
  typeKey: string,
  definition: Omit<NotificationTypeEntry, "copyKey" | "paramsSchema"> &
    Partial<Pick<NotificationTypeEntry, "paramsSchema">>,
): [string, NotificationTypeEntry] {
  return [
    typeKey,
    {
      ...definition,
      copyKey: `notifications.${typeKey}`,
      paramsSchema: definition.paramsSchema ?? noParams,
    },
  ];
}

export const NOTIFICATION_CATALOG: ReadonlyMap<string, NotificationTypeEntry> = new Map([
  catalogEntry("platform.lead-created", {
    importance: "high",
    tone: "info",
    icon: UserPlus,
    route: () => ({ to: "/admin/leads" }),
  }),
  catalogEntry("platform.conversion-requested", {
    importance: "high",
    tone: "warning",
    icon: ArrowRightLeft,
    route: (subject) =>
      subject ? { to: "/admin/conversion-requests/$publicId", publicId: subject.publicId } : null,
  }),
  catalogEntry("platform.company-activated", {
    importance: "normal",
    tone: "success",
    icon: Building2,
    route: null,
  }),
  catalogEntry("platform.conversion-decided", {
    importance: "normal",
    tone: "info",
    icon: ClipboardCheck,
    paramsSchema: z.object({ decision: z.enum(["approved", "rejected"]) }),
    enumParams: ["decision"],
    route: null,
  }),
  catalogEntry(ANNOUNCEMENT_TYPE_KEY, {
    importance: "normal",
    tone: "info",
    icon: Megaphone,
    paramsSchema: announcementParamsSchema,
    route: null,
  }),
  catalogEntry("company.subscription-changed", {
    importance: "high",
    tone: "warning",
    icon: CreditCard,
    paramsSchema: z.object({ planName: z.string(), status: z.string() }),
    route: () => ({ to: "/company/dashboard" }),
  }),
  catalogEntry("company.role-assigned", {
    importance: "high",
    tone: "success",
    icon: ShieldCheck,
    paramsSchema: z.object({ roleName: z.string() }),
    route: () => ({ to: "/company/profile" }),
  }),
  catalogEntry("company.user-joined", {
    importance: "normal",
    tone: "success",
    icon: Users,
    route: null,
  }),
]);
