import { z } from "zod";
import { platformPlanOperations as operations } from "@/shared/api";
import type { Plan } from "../api/catalogue";

export const planFeatures = ["ATTENDANCE", "ANALYTICS", "OVERVIEW", "TEAM_MANAGEMENT"];
export const supportedPlanFeatures = new Set(planFeatures);
export const planLimits = ["MAX_USERS", "MAX_DEPARTMENTS", "MAX_POSITIONS"] as const;

/** Convert editor controls, then let the generated body schema validate the wire input. */
export function planFormSchema(plan?: Plan) {
  return z.preprocess(
    (value) => {
      if (typeof value !== "object" || value === null) return value;
      const body: Record<string, unknown> = { ...value };
      if ("features" in value && typeof value.features === "string")
        body.features = value.features
          .split(",")
          .map((feature) => feature.trim())
          .filter(Boolean);
      else if (!plan) body.features = [];
      if ("limits" in value && typeof value.limits === "object" && value.limits !== null) {
        // PATCH replaces the limits object. Retain unchanged limits and allow explicit removal.
        const limits: Record<string, unknown> = { ...(plan?.limits ?? {}) };
        for (const [name, amount] of Object.entries(value.limits)) {
          if (amount === "") delete limits[name];
          else limits[name] = amount;
        }
        body.limits = limits;
      }
      return body;
    },
    plan ? operations.update.requestSchema.shape.body : operations.create.requestSchema.shape.body,
  );
}
