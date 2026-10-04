export const diagnosticsPermissions = [
  "delegation:open",
  "delegation:email-diagnostics:preview",
  "delegation:email-diagnostics:test-send",
] as const;

export function diagnosticCatalogueBody() {
  return {
    items: ["employee-invitation", "company-user-recovery", "company-user-password-reset"].map(
      (key) => ({ key, description: "raw-description-canary", supportedLocales: ["en", "ar"] }),
    ),
  };
}

export function diagnosticPreviewBody(locale = "en") {
  return {
    emailTypeKey: "employee-invitation",
    templateKey: "company-invitation-v2",
    context: "COMPANY",
    locale,
    subject: locale === "ar" ? "دعوة تجريبية" : "Sample invitation",
    preheader: "Sample",
    text: "Synthetic invitation only",
    html: `<h1>Company sample</h1><script>top.__diagnosticEscape = true; fetch('https://diagnostic-canary.invalid/script')</script><img src="https://diagnostic-canary.invalid/image"><style>@import url('https://diagnostic-canary.invalid/css'); body {background-image: url('https://diagnostic-canary.invalid/background')}</style><a target="_top" href="https://diagnostic-canary.invalid/navigation">Inert invitation link</a><iframe src="https://diagnostic-canary.invalid/frame"></iframe><form action="https://diagnostic-canary.invalid/form"><button>Submit</button></form>`,
    senderIdentity: { name: "Acme Company", address: "hr@acme.test", replyTo: "support@acme.test" },
  };
}

export function diagnosticReceiptBody(requestId: string, overrides: Record<string, unknown> = {}) {
  return {
    requestId,
    deliveryPublicId: "77777777-7777-4777-8777-777777777777",
    emailTypeKey: "employee-invitation",
    context: "COMPANY",
    locale: "en",
    isTest: true,
    status: "QUEUED",
    ...overrides,
  };
}
