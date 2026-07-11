import type { SupportedLocale } from "@/shared/i18n";
import type { EmailContext, EmailPreview, EmailType } from "../api/email-platform";

const EMAIL_TYPE_TITLE: Readonly<Record<SupportedLocale, Readonly<Record<string, string>>>> = {
  en: {
    "owner-invitation": "Owner Invitation",
    "employee-invitation": "Employee Invitation",
  },
  ar: {
    "owner-invitation": "دعوة مالك الشركة",
    "employee-invitation": "دعوة موظف",
  },
};

const NUMERIC_HTML_REFERENCE = /&#(?:x([\da-f]+)|(\d+));?/gi;

function normalizeIdentityContent(value: string): string {
  return value
    .replace(NUMERIC_HTML_REFERENCE, (reference, hexadecimal: string, decimal: string) => {
      const codePoint = Number.parseInt(hexadecimal ?? decimal, hexadecimal ? 16 : 10);
      return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : reference;
    })
    .normalize("NFKD")
    .replaceAll(/\p{Mark}/gu, "")
    .toLocaleLowerCase();
}

const EDARA_IDENTITY_MARKERS = ["edara", "إدارة"].map(normalizeIdentityContent);

/** Returns an operator-friendly title while preserving unknown registry keys. */
export function emailTypeTitle(emailType: EmailType, locale: SupportedLocale = "en"): string {
  return EMAIL_TYPE_TITLE[locale][emailType.key] ?? emailType.key.replaceAll("-", " ");
}

/** Selects the issue-defined default invitation for a catalog context. */
export function defaultEmailTypeKey(context: "ALL" | EmailContext): string {
  return context === "COMPANY" ? "employee-invitation" : "owner-invitation";
}

/** Detects Edara identity in any field rendered for a white-label Company preview. */
export function companyPreviewContainsEdaraIdentity(preview: EmailPreview): boolean {
  const senderIdentity = preview.senderIdentity;
  const identityBearingContent = [
    preview.subject,
    preview.preheader,
    preview.html,
    preview.text,
    senderIdentity?.name,
    senderIdentity?.address,
    senderIdentity?.replyTo,
  ];

  return identityBearingContent.some((value) => {
    if (!value) return false;
    const normalizedValue = normalizeIdentityContent(value);
    return EDARA_IDENTITY_MARKERS.some((marker) => normalizedValue.includes(marker));
  });
}
