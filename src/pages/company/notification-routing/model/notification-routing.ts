import type { z } from "zod";
import type { companyCommunicationsOperations } from "@/shared/api";

type Operations = typeof companyCommunicationsOperations;
export type RoutingSetting = z.output<
  Operations["notificationSettings"]["responses"]["200"]
>["items"][number];
export type RoutingOverride = z.input<
  Operations["updateNotificationRouting"]["requestSchema"]
>["body"]["override"];

/** Who receives a type: its declared default, a named role, a permission's holders, or everyone. */
export type RoutingChoice = "default" | "role" | "permission" | "blast";

/** The selector a stored override uses; `null` is the type's declared default. */
export function routingChoice(override: RoutingOverride): RoutingChoice {
  return override === null ? "default" : override.selectorKind;
}

/**
 * Builds the override the chosen selector sends. A role or permission selector needs its reference;
 * without one there is nothing valid to send, so the result is `undefined` rather than a guess.
 */
export function toOverride(
  choice: RoutingChoice,
  reference: string | undefined,
): RoutingOverride | undefined {
  switch (choice) {
    case "default":
      return null;
    case "blast":
      return { selectorKind: "blast" };
    case "role":
    case "permission":
      return reference ? { selectorKind: choice, selectorRef: reference } : undefined;
    default:
      return undefined;
  }
}

/** Whether two overrides route to the same audience, compared field by field. */
export function sameOverride(left: RoutingOverride, right: RoutingOverride): boolean {
  if (left === null || right === null) return left === right;
  if (left.selectorKind !== right.selectorKind) return false;
  const leftReference = "selectorRef" in left ? left.selectorRef : null;
  const rightReference = "selectorRef" in right ? right.selectorRef : null;
  return leftReference === rightReference;
}
