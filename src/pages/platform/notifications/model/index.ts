import type { z as zlib } from "zod";
import { z } from "zod";
import { platformCommunicationsOperations } from "@/shared/api";

/** The override union from the generated GET response (settings.items[].override). */
export type RoutingOverride = zlib.output<
  typeof platformCommunicationsOperations.updateNotificationRouting.requestSchema
>["body"]["override"];

/** A single notification type's routing setting from the GET response. */
export type RoutingSetting = zlib.output<
  (typeof platformCommunicationsOperations.notificationSettings.responses)["200"]
>["items"][number];

/** The PUT request body's override field (identical shape to GET). */
const putOverrideSchema =
  platformCommunicationsOperations.updateNotificationRouting.requestSchema.shape.body.shape
    .override;

/** Form schema for the editor: choice + optional reference. */
export const routingEditorSchema = z.object({
  choice: z.enum(["default", "role", "permission"]),
  reference: z.string().min(1).max(120).optional(),
});

export type RoutingEditorInput = zlib.infer<typeof routingEditorSchema>;
export type RoutingChoice = RoutingEditorInput["choice"];

/** Validates a selector reference (1..120 chars). */
export function validateReference(value: string): boolean {
  return value.length >= 1 && value.length <= 120;
}

/** Derives the editor choice from an existing override. */
export function routingChoice(override: RoutingOverride): RoutingEditorInput["choice"] {
  if (override === null) return "default";
  return override.selectorKind;
}

/** Checks if two overrides are the same (for disabling "no change" submissions). */
export function sameOverride(a: RoutingOverride, b: RoutingOverride): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.selectorKind === b.selectorKind && a.selectorRef === b.selectorRef;
}

/** Converts editor input to the wire override shape. Returns undefined if incomplete. */
export function toOverride(input: RoutingEditorInput): RoutingOverride | undefined {
  if (input.choice === "default") return null;
  if (!input.reference) return undefined;
  return { selectorKind: input.choice, selectorRef: input.reference };
}

/** Validates the PUT override body against the generated schema. */
export function parsePutOverride(value: unknown): RoutingOverride {
  return putOverrideSchema.parse(value);
}
