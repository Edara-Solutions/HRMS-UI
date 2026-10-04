/** Wire-valid Company people and role bodies. Every canary must stay out of the rendered DOM. */
const at = "2026-09-20T09:00:00.000Z";

export const peopleIds = {
  actor: "e4827627-311b-4fe2-a73d-387967af596f",
  colleague: "7b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e",
  owner: "0c9b8a7d-6e5f-4a3b-9c2d-1e0f9a8b7c6d",
  ownerRole: "5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d",
  employeeRole: "6b5c4d3e-2f1a-4b0c-9d8e-7f6a5b4c3d2e",
  managerRole: "7c6d5e4f-3a2b-4c1d-8e9f-0a1b2c3d4e5f",
  session: "8d7e6f5a-4b3c-4d2e-9f1a-0b1c2d3e4f5a",
  permissionRead: "9e8f7a6b-5c4d-4e3f-8a2b-1c0d9e8f7a6b",
  permissionWrite: "af9e8d7c-6b5a-4f4e-9d3c-2b1a0f9e8d7c",
  retiredPermission: "b0a9f8e7-d6c5-4b4a-8f3e-2d1c0b9a8f7e",
} as const;

export const peopleCanaries = [
  "internal-detail-canary",
  "internal-instance-canary",
  "bulk-error-canary",
  "203.0.113.7",
] as const;

export function personBody(publicId: string, overrides: Record<string, unknown> = {}) {
  const names: Record<string, [string, string, string]> = {
    [peopleIds.actor]: ["Sara", "Ahmed", "EMP-1"],
    [peopleIds.colleague]: ["Omar", "Nabil", "EMP-7"],
    [peopleIds.owner]: ["Laila", "Hassan", "EMP-0"],
  };
  const [firstName, lastName, employeeCode] = names[publicId] ?? ["Mona", "Samir", "EMP-9"];
  return {
    publicId,
    employeeCode,
    firstName,
    lastName,
    email: `${firstName.toLowerCase()}@edara.test`,
    phone: null,
    status: "ACTIVE",
    employmentType: "FULL_TIME",
    workLocation: null,
    hireDate: null,
    terminationDate: null,
    level: null,
    dateOfBirth: null,
    maritalStatus: null,
    gender: null,
    nationality: null,
    nationalId: null,
    photoUrl: null,
    mustChangePassword: false,
    lastLoginAt: null,
    createdAt: at,
    updatedAt: at,
    ...overrides,
  };
}

export function rosterBody(publicIds: readonly string[], totalPages = 1) {
  return {
    items: publicIds.map((publicId) => personBody(publicId)),
    meta: { mode: "page", page: 1, pageSize: 20, totalItems: publicIds.length, totalPages },
  };
}

export function roleSummary(publicId: string, overrides: Record<string, unknown> = {}) {
  const names: Record<string, [string, boolean, boolean]> = {
    [peopleIds.ownerRole]: ["Owner", true, true],
    [peopleIds.employeeRole]: ["Employee", false, true],
    [peopleIds.managerRole]: ["Manager", false, false],
  };
  const [name, isOwner, isSystem] = names[publicId] ?? ["Custom", false, false];
  return {
    publicId,
    name,
    description: null,
    isOwner,
    isSystem,
    createdAt: at,
    updatedAt: at,
    ...overrides,
  };
}

export function rolesBody() {
  const items = [peopleIds.ownerRole, peopleIds.employeeRole, peopleIds.managerRole].map((id) =>
    roleSummary(id),
  );
  return {
    items,
    meta: { mode: "page", page: 1, pageSize: 100, totalItems: items.length, totalPages: 1 },
  };
}

export function roleDetailBody(publicId: string, permissionIds: readonly string[] = []) {
  return {
    ...roleSummary(publicId),
    permissions: permissionIds.map((id) => ({
      publicId: id,
      action: id === peopleIds.permissionRead ? "users:read" : "users:update",
      description: null,
    })),
  };
}

export function catalogueBody() {
  return [
    {
      publicId: "c1b0a9f8-e7d6-4c5b-8a4f-3e2d1c0b9a8f",
      name: "Users",
      description: null,
      permissions: [
        { publicId: peopleIds.permissionRead, action: "users:read", description: "View people" },
        { publicId: peopleIds.permissionWrite, action: "users:update", description: "Edit people" },
      ],
    },
  ];
}

export function assignmentBody(userPublicId: string, rolePublicId: string) {
  return {
    publicId: "d2c1b0a9-f8e7-4d6c-9b5a-4f3e2d1c0b9a",
    userPublicId,
    rolePublicId,
    roleName: roleSummary(rolePublicId).name,
    assignedAt: at,
    expiresAt: null,
  };
}

export function sessionsBody() {
  return {
    items: [
      {
        id: peopleIds.session,
        clientType: "web",
        deviceName: "Work laptop",
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
