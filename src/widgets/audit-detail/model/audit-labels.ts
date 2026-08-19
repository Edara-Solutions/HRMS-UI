import type { TFunction } from "i18next";
import { humanizeAuditKey } from "./audit-detail";
import { auditEnumFields } from "./audit-enum-fields";

/** The namespace holding every audit label: events, payload fields, and page chrome. */
export const auditNamespace = "audit";

export type AuditTranslate = TFunction<typeof auditNamespace>;

/**
 * The authored label for a payload field. The key set is generated from the contract and
 * gated by `openapi:check`, so a bare `field.taxNumber` on screen means a key was lost.
 */
export function auditFieldLabel(t: AuditTranslate, field: string): string {
  return t(`field.${field}`);
}

/** Whether the contract closes this field to a fixed set of values. */
export function isAuditEnumField(field: string): boolean {
  return Object.hasOwn(auditEnumFields, field);
}

/**
 * The words for a closed-enum value. Values derive — `IN_PROGRESS` reads as "In progress"
 * — so a value the contract adds later never renders as a raw token; the namespace carries
 * an override only where the derived form misleads.
 */
export function auditEnumLabel(t: AuditTranslate, field: string, value: string): string {
  return t(`enum.${field}.${value}`, { defaultValue: humanizeAuditKey(value) });
}
