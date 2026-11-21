import type { z } from "zod";
import { accessRequestOperations, type accessSessionOperations } from "@/shared/api";

type RequestBody = z.input<typeof accessRequestOperations.submitRequest.requestSchema>["body"];

export type AccessRequest = z.output<
  (typeof accessRequestOperations.ownRequests.responses)["200"]
>["items"][number];
export type LiveAccessSession = z.output<
  (typeof accessSessionOperations.liveSessions.responses)["200"]
>["items"][number];
export type AccessReason = RequestBody["reason"];
export type AccessScope = RequestBody["scope"];
export type AccessLength = RequestBody["requestedMinutes"];

const bodyShape = accessRequestOperations.submitRequest.requestSchema.shape.body.shape;

export const accessReasons: readonly AccessReason[] = bodyShape.reason.options.map(
  (option) => option.value,
);
export const accessScopes: readonly AccessScope[] = bodyShape.scope.options.map(
  (option) => option.value,
);
export const accessLengths: readonly AccessLength[] = bodyShape.requestedMinutes.options.map(
  (option) => option.value,
);

export const REQUEST_NOTE_MIN = bodyShape.note.minLength ?? 0;
export const DECISION_NOTE_MIN =
  accessRequestOperations.rejectRequest.requestSchema.shape.body.shape.note.minLength ?? 0;
export const NOTE_MAX = bodyShape.note.maxLength ?? 0;

export type AccessRequestDisplay =
  | Exclude<AccessRequest["state"], "USED">
  | "SESSION_OPEN"
  | "SESSION_ENDED"
  | "SESSION_ENDED_BY_APPROVER";

export function accessRequestDisplay(request: AccessRequest): AccessRequestDisplay {
  if (request.state !== "USED") return request.state;
  if (request.session?.status === "OPEN") return "SESSION_OPEN";
  if (request.session?.status === "ENDED") return "SESSION_ENDED_BY_APPROVER";
  return "SESSION_ENDED";
}

export const displayTone: Record<
  AccessRequestDisplay,
  "warning" | "success" | "danger" | "default"
> = {
  PENDING: "warning",
  APPROVED: "success",
  SESSION_OPEN: "success",
  REJECTED: "danger",
  SESSION_ENDED_BY_APPROVER: "danger",
  CANCELLED: "default",
  LAPSED: "default",
  EXPIRED: "default",
  SESSION_ENDED: "default",
};

export function lengthsUpTo(minutes: number): readonly AccessLength[] {
  return accessLengths.filter((length) => length <= minutes);
}

export function scopesWithin(scope: AccessScope): readonly AccessScope[] {
  return scope === "CHANGE" ? accessScopes : ["READ"];
}

export function grantedScope(request: AccessRequest): AccessScope {
  return request.grantedScope ?? request.scope;
}

export function grantedMinutes(request: AccessRequest): number {
  return request.grantedMinutes ?? request.requestedMinutes;
}

export function isNarrowed(request: AccessRequest) {
  return (
    request.grantedScope !== null &&
    (request.grantedScope !== request.scope || request.grantedMinutes !== request.requestedMinutes)
  );
}

export function latestRequestFor(
  requests: readonly AccessRequest[] | undefined,
  companyPublicId: string,
): AccessRequest | undefined {
  return requests?.find((request) => request.company.publicId === companyPublicId);
}

export function noteIsLongEnough(note: string, minLength: number) {
  return note.trim().length >= minLength;
}
