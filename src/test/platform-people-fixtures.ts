/** Wire-valid Platform roster, role and session bodies. Every canary must stay out of the DOM. */
const at = "2026-09-20T09:00:00.000Z";

export const platformIds = {
  actor: "dbd240db-1b2f-40b3-a081-75d27d4d912c",
  colleague: "7b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e",
  root: "0c9b8a7d-6e5f-4a3b-9c2d-1e0f9a8b7c6d",
  pending: "1d0c9b8a-7e6f-4b3c-8d2e-3f4a5b6c7d8e",
  rootRole: "5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d",
  supportRole: "6b5c4d3e-2f1a-4b0c-9d8e-7f6a5b4c3d2e",
  auditorRole: "7c6d5e4f-3a2b-4c1d-8e9f-0a1b2c3d4e5f",
  colleagueAssignment: "d2c1b0a9-f8e7-4d6c-9b5a-4f3e2d1c0b9a",
  rootAssignment: "e3d2c1b0-a9f8-4e7d-8c6b-5a4f3e2d1c0b",
  session: "8d7e6f5a-4b3c-4d2e-9f1a-0b1c2d3e4f5a",
} as const;

export const platformCanaries = [
  "internal-detail-canary",
  "internal-instance-canary",
  "203.0.113.7",
] as const;

/** Every Platform people permission; reserved ones still need current root standing. */
export const platformAdministrator = [
  "platform-users:read",
  "platform-users:invite",
  "platform-users:update",
  "platform-users:suspend",
  "platform-users:unsuspend",
  "platform-users:delete",
  "platform-users:reset-password",
  "platform-sessions:read",
  "platform-sessions:revoke",
  "platform-roles:read",
] as const;

export const rootAuthority = [
  "platform-roles:create",
  "platform-roles:update",
  "platform-roles:delete",
  "platform-roles:assign",
] as const;

export function platformPersonBody(publicId: string, overrides: Record<string, unknown> = {}) {
  const names: Record<string, [string, string, string]> = {
    [platformIds.actor]: ["Nadia", "Hassan", "ACTIVE"],
    [platformIds.colleague]: ["Omar", "Nabil", "ACTIVE"],
    [platformIds.root]: ["Laila", "Kamal", "ACTIVE"],
    [platformIds.pending]: ["Mona", "Samir", "PENDING"],
  };
  const [firstName, lastName, status] = names[publicId] ?? ["Tarek", "Adel", "ACTIVE"];
  return {
    publicId,
    email: `${firstName.toLowerCase()}@edara.test`,
    firstName,
    lastName,
    status,
    staffCode: null,
    jobTitle: null,
    team: "Support",
    startedAt: null,
    locale: "en",
    timezone: "UTC",
    photoUrl: null,
    mustChangePassword: false,
    lastLoginAt: null,
    createdAt: at,
    ...overrides,
  };
}

export function platformRosterBody(publicIds: readonly string[], totalPages = 1) {
  return {
    items: publicIds.map((publicId) => platformPersonBody(publicId)),
    meta: { mode: "page", page: 1, pageSize: 20, totalItems: publicIds.length, totalPages },
  };
}

export function platformRoleBody(publicId: string, overrides: Record<string, unknown> = {}) {
  const roles: Record<string, [string, boolean, string[]]> = {
    [platformIds.rootRole]: ["SUPER_ADMIN", true, ["platform-roles:assign", "leads:read"]],
    [platformIds.supportRole]: ["Support", false, ["leads:read", "retired:action"]],
    [platformIds.auditorRole]: ["Auditor", false, ["audit-events:read"]],
  };
  const [name, isSystem, actions] = roles[publicId] ?? ["Custom", false, []];
  return { publicId, name, description: null, isSystem, actions, ...overrides };
}

export function platformRolesBody() {
  return {
    items: [platformIds.rootRole, platformIds.supportRole, platformIds.auditorRole].map((id) =>
      platformRoleBody(id),
    ),
  };
}

export function platformAssignmentsBody(
  platformUserPublicId: string,
  held: readonly { publicId: string; rolePublicId: string }[],
) {
  return {
    items: held.map((assignment) => ({
      ...assignment,
      platformUserPublicId,
      expiresAt: null,
    })),
  };
}

export function platformSessionsBody() {
  return {
    items: [
      {
        id: platformIds.session,
        clientType: "web",
        deviceName: "Ops laptop",
        ipAddress: "203.0.113.7",
        city: "Cairo",
        country: "EG",
        createdAt: at,
        lastUsedAt: at,
      },
    ],
    meta: { mode: "page", page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
  };
}
