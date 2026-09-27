import { type OperationKey, operationAuthorization } from "@/shared/api/generated/authorization";
import type { SuccessResponse as CompanyAccessPolicy } from "@/shared/api/generated/company/get-api-v1-company-access-policy";
import type { AudienceName } from "./audience-session";

const selfOperations = {
  company: {
    profile: "GET /api/v1/company/me/profile",
    security: "POST /api/v1/company/me/password",
    sessions: "GET /api/v1/company/me/sessions",
  },
  platform: {
    profile: "GET /api/v1/platform/me/profile",
    security: "POST /api/v1/platform/me/password",
    sessions: "GET /api/v1/platform/me/sessions",
  },
} satisfies Record<AudienceName, Record<"profile" | "security" | "sessions", OperationKey>>;

export type AccessDecision =
  | "allow"
  | "authenticate"
  | "credential-completion"
  | "not-found"
  | "forbidden"
  | "company-blocked"
  | "access-session-inactive"
  | "no-work-access";
export type ActionRestriction =
  | "self-target"
  | "protected-root"
  | "final-root"
  | "system-role"
  | "self-held-role"
  | "owner-continuity"
  | "lifecycle"
  | "prerequisite"
  | "restricted-mode"
  | "access-unverified"
  | "access-session-inactive"
  | "company-blocked";
export type ActionAvailability =
  | { state: "hidden" }
  | { state: "enabled" }
  | { state: "disabled"; reason: ActionRestriction };
export interface AccessFacts {
  audience?: AudienceName;
  authenticated?: boolean;
  mustChangePassword?: boolean;
  platformEnabled?: boolean;
  permissions?: readonly string[];
  root?: boolean;
  owner?: boolean;
  companyMode?: CompanyAccessPolicy["mode"];
  accessSession?: "live" | "inactive" | "foreign" | "missing";
  delegatedScopeMatches?: boolean;
  delegatedGrant?: boolean;
  restriction?: ActionRestriction;
  target?: {
    self?: boolean;
    protectedRoot?: boolean;
    finalRoot?: boolean;
    systemRole?: boolean;
    selfHeldRole?: boolean;
    preservesOwner?: boolean;
    lifecycleAllowed?: boolean;
  };
  requiresRoot?: boolean;
  requiresOwner?: boolean;
}
export interface RouteDeclaration {
  path: string;
  audience: AudienceName;
  category: "public" | "credential" | "self" | "work";
  operation?: OperationKey;
  label?: { en: string; ar: string };
}

function audienceRoutes(audience: AudienceName): RouteDeclaration[] {
  return [
    ...["login", "accept-invitation", "forgot-password", "reset-password"].map(
      (suffix): RouteDeclaration => ({
        path: `/${audience}/${suffix}`,
        audience,
        category: "public",
      }),
    ),
    { path: `/${audience}/change-password`, audience, category: "credential" },
    { path: `/${audience}`, audience, category: "work" },
    {
      path: `/${audience}/dashboard`,
      audience,
      category: "work",
      label: { en: "Home", ar: "الرئيسية" },
    },
    {
      path: `/${audience}/me/profile`,
      audience,
      category: "self",
      operation: selfOperations[audience].profile,
      label: { en: "My profile", ar: "ملفي الشخصي" },
    },
    {
      path: `/${audience}/me/security`,
      audience,
      category: "self",
      operation: selfOperations[audience].security,
      label: { en: "Security", ar: "الأمان" },
    },
    {
      path: `/${audience}/me/sessions`,
      audience,
      category: "self",
      operation: selfOperations[audience].sessions,
      label: { en: "My sessions", ar: "جلساتي" },
    },
  ];
}

const companyWorkRoutes: RouteDeclaration[] = [
  {
    path: "/company/profile",
    audience: "company",
    category: "work",
    operation: "GET /api/v1/company/profile",
    label: { en: "Organization profile", ar: "ملف المؤسسة" },
  },
  {
    path: "/company/setup",
    audience: "company",
    category: "work",
    operation: "GET /api/v1/company/setup",
    label: { en: "Company setup", ar: "إعداد الشركة" },
  },
  {
    path: "/company/people",
    audience: "company",
    category: "work",
    operation: "GET /api/v1/company/users",
    label: { en: "People", ar: "الأفراد" },
  },
  {
    path: "/company/people/$publicId",
    audience: "company",
    category: "work",
    operation: "GET /api/v1/company/users/{publicId}",
  },
  {
    path: "/company/roles",
    audience: "company",
    category: "work",
    operation: "GET /api/v1/company/roles",
    label: { en: "Roles", ar: "الأدوار" },
  },
  {
    path: "/company/roles/$publicId",
    audience: "company",
    category: "work",
    operation: "GET /api/v1/company/roles/{publicId}",
  },
  {
    path: "/company/email",
    audience: "company",
    category: "work",
    operation: "GET /api/v1/company/email-settings",
    label: { en: "Email", ar: "البريد الإلكتروني" },
  },
  {
    path: "/company/email/templates",
    audience: "company",
    category: "work",
    operation: "GET /api/v1/company/email-types",
  },
  {
    path: "/company/notifications",
    audience: "company",
    category: "work",
    operation: "GET /api/v1/company/notification-settings",
    label: { en: "Notification routing", ar: "توجيه الإشعارات" },
  },
  {
    path: "/company/audit",
    audience: "company",
    category: "work",
    operation: "GET /api/v1/company/audit-trail",
    label: { en: "Audit trail", ar: "سجل التدقيق" },
  },
];

const platformWorkRoutes: RouteDeclaration[] = [
  {
    path: "/platform/people",
    audience: "platform",
    category: "work",
    operation: "GET /api/v1/platform/users",
    label: { en: "Platform people", ar: "فريق المنصة" },
  },
  {
    path: "/platform/people/$publicId",
    audience: "platform",
    category: "work",
    operation: "GET /api/v1/platform/users/{publicId}",
  },
  {
    path: "/platform/roles",
    audience: "platform",
    category: "work",
    operation: "GET /api/v1/platform/roles",
    label: { en: "Platform roles", ar: "أدوار المنصة" },
  },
  {
    path: "/platform/roles/$publicId",
    audience: "platform",
    category: "work",
    operation: "GET /api/v1/platform/roles",
  },
];

const publicIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A `$publicId` segment matches only a well-formed public ID; anything else stays unknown. */
function matchesDeclaredPath(declared: string, path: string) {
  const expected = declared.split("/");
  const actual = path.split("/");
  return (
    expected.length === actual.length &&
    expected.every((segment, index) =>
      segment === "$publicId"
        ? publicIdPattern.test(actual[index] ?? "")
        : segment === actual[index],
    )
  );
}

function withWorkRoutes(routes: RouteDeclaration[], work: RouteDeclaration[]) {
  const dashboard = routes.findIndex((route) => route.path.endsWith("/dashboard"));
  return [...routes.slice(0, dashboard + 1), ...work, ...routes.slice(dashboard + 1)];
}

/** Only already-owned workflows are reachable. Future slices extend this registry when migrated. */
export const routeDeclarations = [
  ...withWorkRoutes(audienceRoutes("company"), companyWorkRoutes),
  ...withWorkRoutes(audienceRoutes("platform"), platformWorkRoutes),
];

/** A known route the current identity may not open; the route error boundary renders it. */
export class RouteAccessRefusal extends Error {
  readonly audience: AudienceName;
  readonly decision: "forbidden";

  constructor(audience: AudienceName) {
    super("The route is not available to the current identity.");
    this.name = "RouteAccessRefusal";
    this.audience = audience;
    this.decision = "forbidden";
  }
}

export function projectActionAvailability(
  operation: OperationKey,
  facts: AccessFacts,
): ActionAvailability {
  const policy = operationAuthorization[operation];
  if (!policy) return { state: "hidden" };
  if (policy.authorization === "PUBLIC") return { state: "enabled" };
  const delegated = policy.audience === "delegated";
  const audience = delegated ? "platform" : policy.audience;
  if (!facts.authenticated || facts.audience !== audience) return { state: "hidden" };
  if (policy.permission && !facts.permissions?.includes(policy.permission))
    return { state: "hidden" };
  if (delegated) {
    if (!facts.delegatedScopeMatches || !facts.delegatedGrant) return { state: "hidden" };
    if (facts.accessSession === "inactive")
      return { state: "disabled", reason: "access-session-inactive" };
    if (facts.accessSession !== "live" || !facts.delegatedScopeMatches || !facts.delegatedGrant)
      return { state: "hidden" };
  }
  if (policy.authorization !== "SELF" && facts.audience === "company") {
    if (facts.companyMode === "BLOCKED") return { state: "disabled", reason: "company-blocked" };
    const write = !operation.startsWith("GET ") && !operation.startsWith("HEAD ");
    // An unknown mode fails closed, but says so instead of claiming the workspace is restricted.
    if (write && facts.companyMode === undefined)
      return { state: "disabled", reason: "access-unverified" };
    if (write && facts.companyMode !== "NORMAL")
      return { state: "disabled", reason: "restricted-mode" };
  }
  if (facts.mustChangePassword && policy.authorization !== "SELF")
    return { state: "disabled", reason: "prerequisite" };
  if ((facts.requiresRoot && !facts.root) || (facts.requiresOwner && !facts.owner))
    return { state: "disabled", reason: "prerequisite" };
  if (facts.target?.self) return { state: "disabled", reason: "self-target" };
  if (facts.target?.protectedRoot) return { state: "disabled", reason: "protected-root" };
  if (facts.target?.finalRoot) return { state: "disabled", reason: "final-root" };
  if (facts.target?.systemRole) return { state: "disabled", reason: "system-role" };
  if (facts.target?.selfHeldRole) return { state: "disabled", reason: "self-held-role" };
  if (facts.target?.preservesOwner === false)
    return { state: "disabled", reason: "owner-continuity" };
  if (facts.target?.lifecycleAllowed === false) return { state: "disabled", reason: "lifecycle" };
  if (facts.restriction) return { state: "disabled", reason: facts.restriction };
  return { state: "enabled" };
}

export function projectRouteAccess(pathname: string, facts: AccessFacts): AccessDecision {
  const path = pathname.replace(/\/$/, "");
  const route = routeDeclarations.find((candidate) => matchesDeclaredPath(candidate.path, path));
  if (!route || (route.audience === "platform" && facts.platformEnabled === false))
    return "not-found";
  if (facts.audience && route.audience !== facts.audience) return "not-found";
  if (route.category === "public") return "allow";
  if (!facts.authenticated) return "authenticate";
  if (facts.mustChangePassword && route.category !== "credential") return "credential-completion";
  if (route.category === "self" || route.category === "credential") return "allow";
  if (route.audience === "company" && facts.companyMode === "BLOCKED") return "company-blocked";
  if (route.operation) {
    const available = projectActionAvailability(route.operation, facts);
    if (available.state === "hidden") return "forbidden";
    if (available.state === "disabled" && available.reason === "access-session-inactive")
      return "access-session-inactive";
  }
  if (!facts.permissions?.length) return "no-work-access";
  return "allow";
}

export function projectNavigation(facts: AccessFacts) {
  return routeDeclarations.filter(
    (route) =>
      route.label &&
      route.audience === facts.audience &&
      ["allow", "no-work-access"].includes(projectRouteAccess(route.path, facts)),
  );
}

export function projectConfirmation(
  availability: ActionAvailability,
  tier: "none" | "standard" | "typed-target",
) {
  return availability.state === "enabled" ? tier : "none";
}

export function projectDenialResponse(
  status: number,
  code?: string,
  mode?: CompanyAccessPolicy["mode"],
  ownedInactiveSession = false,
): AccessDecision {
  if (status === 404) return "not-found";
  if ((status === 401 || status === 403) && code === "COMPANY_ACCESS_DENIED" && mode === "BLOCKED")
    return "company-blocked";
  if (status === 401) return "authenticate";
  if (status === 403 && ownedInactiveSession) return "access-session-inactive";
  return "forbidden";
}

export function confirmationMatches(
  availability: ActionAvailability,
  tier: "none" | "standard" | "typed-target",
  target: string,
  input: string,
  acknowledged: boolean,
): boolean {
  if (availability.state !== "enabled") return false;
  if (tier === "none") return true;
  if (tier === "standard") return acknowledged;
  return target.length > 0 && input === target;
}
