import {
  ArrowRightLeft,
  Bell,
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
import type { NotificationTier } from "./notification-tier";

/**
 * Frontend mirror of the backend Notification Type catalog. The backend ships keys, versions and
 * typed params; everything a row shows — tone, icon, copy, click-through — is decided here, so no
 * prose ever crosses the wire. A type belongs to the audience its key is prefixed with.
 */

export type NotificationImportance = "high" | "normal";

/** Semantic status colour for the row tile. */
export type NotificationTone = "info" | "success" | "warning";

/** The verified routes a row may navigate to; one member per click-through in the catalog. */
export type NotificationRoute =
  | { readonly to: "/platform/leads" | "/company/dashboard" | "/company/me/profile" }
  | { readonly to: "/platform/conversion-requests/$publicId"; readonly publicId: string };

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

/** The only catalog version this mirror renders; a newer version falls back to neutral copy. */
const SUPPORTED_VERSION = 1;

const noParams = z.object({}).passthrough();

const authoredMessageSchema = z.object({ title: z.string(), body: z.string() });

/**
 * An Announcement carries the publisher's authored prose in its params. The publisher requires
 * both locales; treating `ar` as optional here is the en fallback the panel promises.
 */
export const announcementParamsSchema = z.object({
  announcementPublicId: z.string().min(1),
  message: z.object({ en: authoredMessageSchema, ar: authoredMessageSchema.optional() }),
});

export const ANNOUNCEMENT_TYPE_KEYS: ReadonlySet<string> = new Set([
  "platform.announcement",
  "company.announcement",
]);

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
    route: () => ({ to: "/platform/leads" }),
  }),
  catalogEntry("platform.conversion-requested", {
    importance: "high",
    tone: "warning",
    icon: ArrowRightLeft,
    route: (subject) =>
      subject
        ? { to: "/platform/conversion-requests/$publicId", publicId: subject.publicId }
        : null,
  }),
  catalogEntry("platform.announcement", {
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
    route: () => ({ to: "/company/me/profile" }),
  }),
  catalogEntry("company.user-joined", {
    importance: "normal",
    tone: "success",
    icon: Users,
    route: null,
  }),
  catalogEntry("company.activated", {
    importance: "normal",
    tone: "success",
    icon: Building2,
    route: null,
  }),
  catalogEntry("company.conversion-decided", {
    importance: "normal",
    tone: "info",
    icon: ClipboardCheck,
    paramsSchema: z.object({ decision: z.enum(["approved", "rejected"]) }),
    enumParams: ["decision"],
    route: null,
  }),
  catalogEntry("company.announcement", {
    importance: "normal",
    tone: "info",
    icon: Megaphone,
    paramsSchema: announcementParamsSchema,
    route: null,
  }),
]);

/**
 * What a row shows when this audience's mirror does not know its type or version: neutral copy,
 * no navigation, never a toast, and never the raw key, params or payload.
 */
export const NEUTRAL_NOTIFICATION: NotificationTypeEntry = {
  importance: "normal",
  tone: "info",
  icon: Bell,
  copyKey: "notifications.unknown",
  paramsSchema: noParams,
  route: null,
};

interface CatalogLookup {
  readonly typeKey: string;
  readonly typeVersion?: number;
}

/** The audience's own entry for a known type and version, or `null` when it must fall back. */
export function knownNotificationEntry(
  tier: NotificationTier | null,
  { typeKey, typeVersion = SUPPORTED_VERSION }: CatalogLookup,
): NotificationTypeEntry | null {
  if (!tier || !typeKey.startsWith(`${tier}.`) || typeVersion !== SUPPORTED_VERSION) return null;
  return NOTIFICATION_CATALOG.get(typeKey) ?? null;
}

/** The entry a row renders: the audience's own, or the neutral fallback — never another tier's. */
export function resolveNotificationEntry(
  tier: NotificationTier | null,
  lookup: CatalogLookup,
): NotificationTypeEntry {
  return knownNotificationEntry(tier, lookup) ?? NEUTRAL_NOTIFICATION;
}
