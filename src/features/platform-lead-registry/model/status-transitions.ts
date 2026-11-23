import type { z } from "zod";
import { platformLeadOperations as operations } from "@/shared/api";

type UpdateBody = z.output<typeof operations.update.requestSchema.shape.body>;
type EditableStatus = NonNullable<UpdateBody["status"]>;
type LeadStatus = z.output<(typeof operations.lead.responses)[200]>["lead"]["status"];

const statusTransitions: Record<LeadStatus, readonly EditableStatus[]> = {
  NEW: ["CONTACTED", "WRONG_NUMBER", "NO_ANSWER", "FOLLOWING_UP"],
  REJOINED: ["CONTACTED", "WRONG_NUMBER", "NO_ANSWER", "FOLLOWING_UP"],
  WRONG_NUMBER: ["CONTACTED", "LOST"],
  NO_ANSWER: ["FOLLOWING_UP", "LOST"],
  FOLLOWING_UP: ["CONTACTED", "LOST"],
  CONTACTED: ["QUALIFIED", "NOT_QUALIFIED", "NOT_INTERESTED", "DEMO_SCHEDULED", "LOST"],
  QUALIFIED: ["DEMO_SCHEDULED", "TRIAL_STARTED", "NEGOTIATION", "LOST"],
  NOT_QUALIFIED: ["LOST"],
  NOT_INTERESTED: ["LOST"],
  DEMO_SCHEDULED: ["WAITING_QUOTATION", "TRIAL_STARTED", "LOST"],
  WAITING_QUOTATION: ["QUOTATION_SENT", "NEGOTIATION", "LOST"],
  QUOTATION_SENT: ["NEGOTIATION", "LOST"],
  TRIAL_STARTED: ["NEGOTIATION", "LOST"],
  NEGOTIATION: ["LOST"],
  WON_CONVERTED: [],
  LOST: [],
};

export function editableLeadStatuses(current: LeadStatus): readonly LeadStatus[] {
  if (import.meta.env.ALLOW_LEAD_STATUS_OVERRIDE === "true") {
    const statuses = operations.update.requestSchema.shape.body.shape.status.unwrap().options;
    return [current, ...statuses.map(({ value }) => value).filter((status) => status !== current)];
  }
  return [current, ...statusTransitions[current]];
}
