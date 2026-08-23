import {
  type AuditTranslate,
  humanizeAuditKey,
  shortAuditIdentifier,
} from "@/features/audit-filters";
import type { CatalogAuditActor, CatalogAuditTarget } from "./audit-catalog";

/** The trail an identity is being read in. It decides which targets have a destination. */
export type AuditPortal = "admin" | "company";

/**
 * An erased `user` target arrives as this literal rather than an identifier, so the sentinel
 * has to be recognised before anything formats the value as a UUID.
 */
export const erasedTargetPublicId = "ERASED";

/**
 * The actor as the wire may carry it. Each catalog arm is narrower than this — the Company
 * trail's Platform Admin has neither `publicId` nor `name` — so the fields the arms disagree
 * about are optional here and the renderer is total over the widest shape. `kind` and
 * `component` stay derived, so an arm the catalog adds is a type error rather than a default.
 */
export interface AuditActorIdentity {
  kind: CatalogAuditActor["kind"];
  publicId?: string;
  component?: Extract<CatalogAuditActor, { kind: "SYSTEM" }>["component"];
  name?: string | null;
}

/**
 * Which of the six actor states a row is showing. Anonymous, attribution-failed and erased are
 * three different facts and are kept apart here so no renderer can collapse them by accident.
 */
export type AuditActorState =
  | "named"
  | "unresolved"
  | "system"
  | "anonymous"
  | "attribution-failed"
  | "erased"
  | "withheld";

export interface AuditActorPresentation {
  state: AuditActorState;
  primary: string;
  secondary: string;
  /** The identifier this trail filters by, absent wherever the actor carries no identity. */
  filterablePublicId?: string;
}

/**
 * A target as the wire may carry it, plus the name a projection may resolve for it.
 * `targetType` is deliberately not a closed set — every catalog file declares it a string.
 */
export type AuditTargetIdentity = CatalogAuditTarget & { name?: string | null };

/** A destination that exists in the portal doing the reading. */
export type AuditTargetDestination = "admin-company" | "admin-lead";

export interface AuditTargetPresentation {
  typeLabel: string;
  /** The entity's current name, once the wire resolves one. */
  name: string | null;
  /** The identifier to show when there is no name; empty for an erased subject. */
  publicId: string;
  erased: boolean;
  /** Where this reader can go from here, or `null` — never a link into a 403 or a dead end. */
  destination: AuditTargetDestination | null;
}

type TargetRoutes = Readonly<Record<string, AuditTargetDestination>>;

const adminTargetRoutes: TargetRoutes = {
  company: "admin-company",
  lead: "admin-lead",
};

/**
 * Empty on purpose. The Company portal has no route to any audited entity — not even the users
 * it names — so no reader is offered a link into a 403 and no permission check is needed.
 */
const companyTargetRoutes: TargetRoutes = {};

const portalTargetRoutes: Readonly<Record<AuditPortal, TargetRoutes>> = {
  admin: adminTargetRoutes,
  company: companyTargetRoutes,
};

/**
 * Total over `targetType`: a type the catalog adds tomorrow resolves to `null` rather than
 * throwing, which is the whole point of reading it through a lookup instead of a switch.
 */
export function auditTargetDestination(
  portal: AuditPortal,
  targetType: string,
): AuditTargetDestination | null {
  const routes = portalTargetRoutes[portal];
  return Object.hasOwn(routes, targetType) ? routes[targetType] : null;
}

/**
 * Reads one actor into the words and the state a row renders it with.
 *
 * A `USER` with no name is not a blank cell: there is no hard-delete path for users and the
 * audit row deliberately carries no foreign key, so a missing name means referential drift and
 * is shown as an identifier that did not resolve.
 *
 * `ATTRIBUTION_FAILED` is a defect rather than an actor category: the identity middleware
 * always writes `ANONYMOUS` explicitly, so nothing legitimate reaches the trail unattributed.
 */
export function presentAuditActor(
  actor: AuditActorIdentity,
  t: AuditTranslate,
): AuditActorPresentation {
  switch (actor.kind) {
    case "ANONYMOUS":
      return {
        state: "anonymous",
        primary: t("chrome.anonymous"),
        secondary: t("chrome.unauthenticated"),
      };
    case "ATTRIBUTION_FAILED":
      return {
        state: "attribution-failed",
        primary: t("chrome.attributionFailed"),
        secondary: t("chrome.attributionFailedHint"),
      };
    case "ERASED_USER":
      return {
        state: "erased",
        primary: t("chrome.erasedIdentity"),
        secondary: t("chrome.erasedIdentityHint"),
      };
    case "SYSTEM":
      return {
        state: "system",
        primary: actor.component ? humanizeAuditKey(actor.component) : t("chrome.system"),
        secondary: t("chrome.system"),
      };
    default:
      return presentIdentifiedActor(actor, t);
  }
}

function presentIdentifiedActor(
  actor: AuditActorIdentity,
  t: AuditTranslate,
): AuditActorPresentation {
  if (!actor.publicId) {
    // The Company trail's Platform Admin arm has no identity fields at all, so the actor is a
    // fixed client-side constant: there is no server value it could leak through. Any other
    // kind arriving without an identifier is the same recording defect as an unset actor —
    // it must not borrow the Platform Admin's label.
    return actor.kind === "PLATFORM_ADMIN"
      ? {
          state: "withheld",
          primary: t("chrome.platformAdmin"),
          secondary: t("chrome.identityWithheld"),
        }
      : {
          state: "attribution-failed",
          primary: t("chrome.attributionFailed"),
          secondary: t("chrome.attributionFailedHint"),
        };
  }

  if (actor.name) {
    return {
      state: "named",
      primary: actor.name,
      secondary: humanizeAuditKey(actor.kind),
      filterablePublicId: actor.publicId,
    };
  }

  return {
    state: "unresolved",
    primary: shortAuditIdentifier(actor.publicId),
    secondary: humanizeAuditKey(actor.kind),
    filterablePublicId: actor.publicId,
  };
}

/**
 * Reads one target into words, an optional name and an optional destination.
 *
 * A link is offered only where the type has a route in this portal *and* the name resolved, so
 * an entity the projection could not name degrades to plain text rather than a dead link.
 */
export function presentAuditTarget(
  target: AuditTargetIdentity,
  portal: AuditPortal,
): AuditTargetPresentation {
  const typeLabel = humanizeAuditKey(target.targetType);

  if (target.publicId === erasedTargetPublicId) {
    return { typeLabel, name: null, publicId: "", erased: true, destination: null };
  }

  const name = target.name ?? null;

  return {
    typeLabel,
    name,
    publicId: target.publicId,
    erased: false,
    destination: name === null ? null : auditTargetDestination(portal, target.targetType),
  };
}
