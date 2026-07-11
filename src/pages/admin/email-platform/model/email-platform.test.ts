import { describe, expect, it } from "vitest";
import type { EmailPreview } from "../api/email-platform";
import { companyPreviewContainsEdaraIdentity } from "./email-platform";

const SAFE_SENDER_IDENTITY: NonNullable<EmailPreview["senderIdentity"]> = {
  name: "Al Noor",
  address: "people@alnoor.example",
  replyTo: "hr@alnoor.example",
};

const SAFE_COMPANY_PREVIEW: EmailPreview = {
  emailTypeKey: "employee-invitation",
  templateKey: "company-employee-invitation-v1",
  context: "COMPANY",
  locale: "en",
  subject: "Join Al Noor",
  preheader: "Your invitation is ready.",
  html: '<img src="https://alnoor.example/logo.svg" alt="Al Noor" />',
  text: "Welcome to Al Noor",
  senderIdentity: SAFE_SENDER_IDENTITY,
};

describe("companyPreviewContainsEdaraIdentity", () => {
  it("allows a fully Company-owned preview", () => {
    expect(companyPreviewContainsEdaraIdentity(SAFE_COMPANY_PREVIEW)).toBe(false);
  });

  it.each([
    ["subject", { subject: "An Edara invitation" }],
    ["preheader", { preheader: "Edara support" }],
    ["HTML-encoded logo", { html: '<img alt="E&#100;ara" />' }],
    ["Arabic text", { text: "تواصل مع دعم إدارة" }],
    ["sender name", { senderIdentity: { ...SAFE_SENDER_IDENTITY, name: "Edara" } }],
    [
      "sender address",
      { senderIdentity: { ...SAFE_SENDER_IDENTITY, address: "mail@edara.example" } },
    ],
    [
      "reply-to address",
      { senderIdentity: { ...SAFE_SENDER_IDENTITY, replyTo: "help@edara.example" } },
    ],
  ])("blocks Edara identity in the %s field", (_field, override) => {
    expect(companyPreviewContainsEdaraIdentity({ ...SAFE_COMPANY_PREVIEW, ...override })).toBe(
      true,
    );
  });
});
