import { queryOptions } from "@tanstack/react-query";
import {
  platformQueryKey,
  requestPlatformOperation,
  accessRequestOperations as requests,
  accessSessionOperations as sessions,
} from "@/shared/api";
import type { AccessLength, AccessReason, AccessScope } from "../model/access-request";

export type ReviewView = "review" | "history";

export function accessRequestQueries(userPublicId: string) {
  return {
    mine: queryOptions({
      queryKey: platformQueryKey(userPublicId, requests.ownRequests),
      queryFn: ({ signal }) => requestPlatformOperation(requests.ownRequests, {}, signal),
    }),
    review: (view: ReviewView) =>
      queryOptions({
        queryKey: platformQueryKey(userPublicId, requests.reviewRequests, view),
        queryFn: ({ signal }) =>
          requestPlatformOperation(requests.reviewRequests, { query: { view } }, signal),
      }),
    live: queryOptions({
      queryKey: platformQueryKey(userPublicId, sessions.liveSessions),
      queryFn: ({ signal }) => requestPlatformOperation(sessions.liveSessions, {}, signal),
    }),
  };
}

export const accessQueryRoots = (userPublicId: string) =>
  [requests.ownRequests, requests.reviewRequests, sessions.liveSessions].map((operation) =>
    platformQueryKey(userPublicId, operation),
  );

export type AccessCommand =
  | {
      kind: "submit";
      companyPublicId: string;
      reason: AccessReason;
      scope: AccessScope;
      requestedMinutes: AccessLength;
      note: string;
    }
  | { kind: "cancel"; requestPublicId: string }
  | {
      kind: "approve";
      requestPublicId: string;
      scope: AccessScope;
      minutes: AccessLength;
      note: string;
    }
  | { kind: "reject"; requestPublicId: string; note: string }
  | { kind: "open"; requestPublicId: string }
  | { kind: "end"; sessionPublicId: string; note: string };

export function sendAccessCommand(command: AccessCommand): Promise<{ readonly publicId: string }> {
  switch (command.kind) {
    case "submit": {
      const { kind, ...body } = command;
      return requestPlatformOperation(requests.submitRequest, {
        body: { ...body, note: body.note.trim() },
      });
    }
    case "cancel":
      return requestPlatformOperation(requests.cancelRequest, {
        params: { requestPublicId: command.requestPublicId },
      });
    case "approve":
      return requestPlatformOperation(requests.approveRequest, {
        params: { requestPublicId: command.requestPublicId },
        body: {
          scope: command.scope,
          minutes: command.minutes,
          ...(command.note.trim() ? { note: command.note.trim() } : {}),
        },
      });
    case "reject":
      return requestPlatformOperation(requests.rejectRequest, {
        params: { requestPublicId: command.requestPublicId },
        body: { note: command.note.trim() },
      });
    case "open":
      return requestPlatformOperation(sessions.open, {
        body: { requestPublicId: command.requestPublicId },
      });
    case "end":
      return requestPlatformOperation(sessions.end, {
        params: { sessionPublicId: command.sessionPublicId },
        body: { note: command.note.trim() },
      });
  }
}
