/** Wire-valid Platform communications bodies. Canary text must never reach the rendered page. */
const at = "2026-09-26T09:00:00.000Z";

export const platformCommunicationsIds = {
  announcementId: "7c1d2e3f-4a5b-6c7d-8e9f-0a1b2c3d4e5f",
  companyPublicId: "ace09ed2-c5bd-4474-bac9-78a7bb659da3",
  edaraDeliveryId: "1f0e2d3c-4b5a-6978-8796-a5b4c3d2e1f0",
  companyDeliveryId: "0e1f2d3c-4b5a-6978-8796-b5c4d3e2f1a0",
  platformActorId: "dbd240db-1b2f-40b3-a081-75d27d4d912c",
  emailTypeKey: "edara.company-invitation",
  variantKey: "invitation.warm",
  legacyVariantKey: "invitation.legacy",
  traceId: "0123456789abcdef0123456789abcdef",
} as const;

export const platformCommunicationsPermissions = {
  announcements: ["announcements:read", "announcements:create"],
  audit: ["audit-events:read"],
  emailTemplates: [
    "email-types:read",
    "email-template-variants:read",
    "email-template-variants:migrate",
    "email-templates:preview",
    "emails:test-send",
  ],
  deliveries: [
    "emails:delivery:list",
    "emails:delivery:read",
    "emails:delivery:cancel",
    "emails:delivery:retry",
  ],
  sending: ["emails:sending:read", "emails:sending:pause", "emails:sending:resume"],
  notificationSettings: ["notification-settings"],
};

export function announcementBody(overrides: Record<string, unknown> = {}) {
  return {
    publicId: platformCommunicationsIds.announcementId,
    status: "DELIVERED",
    scheduledFor: null,
    dueAt: at,
    dispatchFinishedAt: at,
    message: {
      en: { title: "Scheduled maintenance", body: "The portal will be briefly unavailable." },
      ar: { title: "صيانة مجدولة", body: "ستكون المنصة غير متاحة لفترة قصيرة." },
    },
    companiesReached: 12,
    recipientsReached: 340,
    pendingUnits: 0,
    failedUnits: 0,
    skippedUnits: 0,
    createdAt: at,
    ...overrides,
  };
}

export function announcementCreateBody(overrides: Record<string, unknown> = {}) {
  return {
    message: {
      en: { title: "Scheduled maintenance", body: "The portal will be briefly unavailable." },
      ar: { title: "صيانة مجدولة", body: "ستكون المنصة غير متاحة لفترة قصيرة." },
    },
    companies: [platformCommunicationsIds.companyPublicId],
    rules: [{ scope: "company", selector: { kind: "blast" } }],
    ...overrides,
  };
}

export function platformEmailTypesBody(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      {
        key: "edara.company-invitation",
        description: "Company invitation email",
        context: "EDARA" as const,
        payloadVersion: 1,
        supportedLocales: ["en" as const, "ar" as const],
        criticality: "CRITICAL" as const,
        defaultTemplateKey: "invitation.default",
      },
      {
        key: "company.payslip-ready",
        description: "Payslip ready",
        context: "COMPANY" as const,
        payloadVersion: 2,
        supportedLocales: ["en" as const, "ar" as const],
        criticality: "OPERATIONAL" as const,
        defaultTemplateKey: "payslip-ready.default",
      },
    ],
    ...overrides,
  };
}

export function platformPreviewBody(locale: string = "en") {
  return {
    emailTypeKey: "edara.company-invitation",
    templateKey: "invitation.default",
    context: "EDARA",
    locale: locale === "ar" ? ("ar" as const) : ("en" as const),
    subject: locale === "ar" ? "دعوة إلى الفريق" : "You are invited to the team",
    preheader: "Sample preview",
    html: '<html><head><script>window.previewScriptCanary = true</script></head><body><p>Hello Sample</p><a href="https://evil.test/link-canary">Open</a><img src="https://evil.test/pixel-canary.png"></body></html>',
    text: "Hello Sample",
    senderIdentity: {
      name: "Edara",
      address: "no-reply@edara.test",
      replyTo: "support@edara.test",
    },
  };
}

export function platformVariantsBody(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      {
        key: "invitation.warm",
        emailTypeKey: "edara.company-invitation",
        context: "EDARA",
        payloadVersion: 1,
        supportedLocales: ["en", "ar"],
      },
      {
        key: "invitation.legacy",
        emailTypeKey: "edara.company-invitation",
        context: "EDARA",
        payloadVersion: 1,
        supportedLocales: ["en"],
      },
    ],
    ...overrides,
  };
}

export function removalReadinessBody(overrides: Record<string, unknown> = {}) {
  return {
    revisionKey: "invitation.legacy",
    activeAssignments: 0,
    pendingMessages: 3,
    removable: true,
    ...overrides,
  };
}

export function migrateResultBody(overrides: Record<string, unknown> = {}) {
  return {
    fromRevisionKey: "invitation.legacy",
    toRevisionKey: "invitation.warm",
    emailTypeKey: "edara.company-invitation",
    migratedCount: 3,
    ...overrides,
  };
}

export function testSendResultBody(overrides: Record<string, unknown> = {}) {
  return {
    publicId: platformCommunicationsIds.edaraDeliveryId,
    status: "QUEUED",
    emailTypeKey: "edara.company-invitation",
    context: "EDARA",
    locale: "en",
    isTest: true,
    ...overrides,
  };
}

export function deliveryBody(overrides: Record<string, unknown> = {}) {
  return {
    publicId: platformCommunicationsIds.companyDeliveryId,
    emailTypeKey: "company.payslip-ready",
    context: "COMPANY",
    locale: "en",
    localeSource: "RECIPIENT",
    localeFallbackApplied: false,
    timeZone: "Africa/Cairo",
    timeZoneSource: "RECIPIENT",
    timeZoneFallbackApplied: false,
    status: "SENT",
    isTest: false,
    maskedRecipient: "s***@company.test",
    senderName: "Edara",
    senderAddress: "no-reply@edara.test",
    templateRevisionKey: "payslip-ready.default",
    attempts: 1,
    lastFailureKind: null,
    providerMessageId: "provider-message-canary",
    companyId: 7,
    company: {
      publicId: platformCommunicationsIds.companyPublicId,
      name: "Edara Labs",
      code: "EDARA",
    },
    businessReference: "payslip:2026-09",
    createdAt: at,
    sentAt: at,
    timeline: [
      { stage: "ENQUEUED", occurredAt: at, attemptNumber: 1 },
      {
        stage: "SENT",
        occurredAt: at,
        attemptNumber: 1,
        providerMessageId: "provider-message-canary",
      },
    ],
    ...overrides,
  };
}

export function deliveriesBody(overrides: Record<string, unknown> = {}) {
  return {
    items: [deliveryBody()],
    meta: { mode: "page", page: 1, pageSize: 25, totalItems: 1, totalPages: 1 },
    ...overrides,
  };
}

export function sendingBody(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      {
        context: "EDARA",
        paused: false,
        reason: null,
        updatedBy: null,
        updatedAt: null,
      },
      {
        context: "COMPANY",
        paused: false,
        reason: null,
        updatedBy: null,
        updatedAt: null,
      },
    ],
    ...overrides,
  };
}

export function platformNotificationSettingsBody(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      { typeKey: "platform.user-invited", typeVersion: 1, importance: "high", override: null },
      {
        typeKey: "platform.company-activated",
        typeVersion: 1,
        importance: "normal",
        override: { selectorKind: "role", selectorRef: "Platform Operator" },
      },
      { typeKey: "platform.future-type", typeVersion: 1, importance: "normal", override: null },
    ],
    ...overrides,
  };
}
