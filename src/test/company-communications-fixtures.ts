/** Wire-valid Company communications bodies. Canary text must never reach the rendered page. */
const at = "2026-09-20T09:00:00.000Z";

export const communicationsCanaries = [
  "failure-detail-canary",
  "last-failure-canary",
  "provider-reference-canary",
  "invitation-secret-canary",
] as const;

export function emailSettingsBody(overrides: Record<string, unknown> = {}) {
  return {
    displayName: "Edara Labs",
    primaryColor: "#1f3a5f",
    onPrimaryColor: "#ffffff",
    footerIdentity: "Edara Labs, Cairo",
    senderLocalPart: "hello",
    replyToEmail: "support@edara.test",
    defaultLocale: "en",
    defaultTimeZone: "Africa/Cairo",
    sendingDomain: "mail.edara.test",
    senderVerified: false,
    ...overrides,
  };
}

export function sendingDomainBody(
  status: "UNCONFIGURED" | "PENDING" | "VERIFIED" | "FAILED",
  overrides: Record<string, unknown> = {},
) {
  return {
    publicId: "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a",
    owner: "COMPANY",
    ownerPublicId: "ace09ed2-c5bd-4474-bac9-78a7bb659da3",
    domain: "mail.edara.test",
    status,
    health: status === "VERIFIED" ? "HEALTHY" : "UNKNOWN",
    dnsRecords: [
      {
        kind: "OWNERSHIP_TXT",
        host: "_edara.mail.edara.test",
        recordType: "TXT",
        value: "edara-verify=abc123",
        description: "record-description-canary",
      },
    ],
    checkResults: [
      {
        kind: "OWNERSHIP_TXT",
        status: status === "FAILED" ? "FAILED" : status === "VERIFIED" ? "VERIFIED" : "PENDING",
        failureDetail: status === "FAILED" ? "failure-detail-canary" : null,
      },
    ],
    verifiedAt: status === "VERIFIED" ? at : null,
    providerReference: "provider-reference-canary",
    lastFailure: status === "FAILED" ? "last-failure-canary" : null,
    createdAt: at,
    updatedAt: at,
    ...overrides,
  };
}

export function emailTypesBody() {
  return {
    items: [
      {
        key: "company.payslip-ready",
        description: "Payslip ready",
        context: "COMPANY",
        payloadVersion: 2,
        supportedLocales: ["en", "ar"],
        criticality: "OPERATIONAL",
        defaultTemplateKey: "payslip-ready.default",
      },
      {
        key: "edara.company-invitation",
        description: "Invitation secret email",
        context: "EDARA",
        payloadVersion: 1,
        supportedLocales: ["en"],
        criticality: "CRITICAL",
        defaultTemplateKey: "invitation.default",
      },
    ],
  };
}

export function variantsBody() {
  return {
    items: [
      {
        key: "payslip-ready.warm",
        emailTypeKey: "company.payslip-ready",
        context: "COMPANY",
        payloadVersion: 2,
        supportedLocales: ["en", "ar"],
      },
      {
        key: "payslip-ready.legacy",
        emailTypeKey: "company.payslip-ready",
        context: "COMPANY",
        payloadVersion: 1,
        supportedLocales: ["en"],
      },
      {
        key: "payslip-ready.edara",
        emailTypeKey: "company.payslip-ready",
        context: "EDARA",
        payloadVersion: 2,
        supportedLocales: ["en"],
      },
    ],
  };
}

export function effectiveBody(templateKey = "payslip-ready.default") {
  return {
    emailTypeKey: "company.payslip-ready",
    templateKey,
    context: "COMPANY",
    payloadVersion: 2,
    supportedLocales: ["en", "ar"],
    deprecated: false,
  };
}

export function previewBody(locale: "en" | "ar" = "en") {
  return {
    emailTypeKey: "company.payslip-ready",
    templateKey: "payslip-ready.default",
    context: "COMPANY",
    locale,
    subject: locale === "ar" ? "قسيمة الراتب جاهزة" : "Your payslip is ready",
    preheader: "Sample preview",
    html: '<html><head><script>window.previewScriptCanary = true</script></head><body><p>Hello Sample</p><a href="https://evil.test/link-canary">Open</a><img src="https://evil.test/pixel-canary.png"></body></html>',
    text: "Hello Sample",
  };
}

export function routingBody() {
  return {
    items: [
      {
        typeKey: "company.subscription-changed",
        typeVersion: 1,
        importance: "high",
        override: null,
      },
      {
        typeKey: "company.user-joined",
        typeVersion: 1,
        importance: "normal",
        override: { selectorKind: "role", selectorRef: "Manager" },
      },
      {
        typeKey: "company.future-type",
        typeVersion: 1,
        importance: "normal",
        override: null,
      },
    ],
  };
}
