import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  delegationOpenPermission,
  type MutationOutcome,
  OperationRefusal,
  usePlatformAccess,
  usePlatformMutationRecovery,
} from "@/shared/api";
import {
  accessSessionQueries,
  closeAccessSession,
  delegatedCommands,
  delegatedQueries,
} from "../api/access-session";
import { type AccessSession, canClose, sessionLiveness } from "./session";
import { useEmailDiagnostics } from "./use-email-diagnostics";

const maxTimerDelay = 2_147_483_647;

export type ActivityKind =
  | "employeeCorrected"
  | "profileSaved"
  | "stepChanged"
  | "emailSettingsSaved"
  | "templateAssigned"
  | "templateRemoved";

export interface ActivityEntry {
  id: number;
  kind: ActivityKind;
  at: number;
}

function useExpiryClock(expiresAt: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const remaining = Date.parse(expiresAt) - now;
    if (remaining <= 0) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(remaining + 50, maxTimerDelay));
    return () => clearTimeout(timer);
  }, [expiresAt, now]);
  return now;
}

export type ContentState = "pending" | "open" | "inactive" | "ineligible" | "concealed";

function contentState(session: AccessSession | undefined, now: number, permitted: boolean) {
  if (!session) return "pending";
  if (sessionLiveness(session, now) === "inactive") return "inactive";
  return permitted ? "open" : "ineligible";
}

export function useAccessSessionWorkspace(sessionPublicId: string) {
  const access = usePlatformAccess();
  const queryClient = useQueryClient();
  const recover = usePlatformMutationRecovery();
  const userPublicId = access.user?.publicId ?? "";
  const queries = useMemo(
    () => accessSessionQueries(userPublicId, sessionPublicId),
    [userPublicId, sessionPublicId],
  );
  const delegated = useMemo(
    () => delegatedQueries(userPublicId, sessionPublicId),
    [userPublicId, sessionPublicId],
  );
  const {
    data: session,
    error: sessionError,
    refetch: refetchSession,
  } = useQuery({ ...queries.session, enabled: access.user !== undefined });
  const now = useExpiryClock(session?.expiresAt);
  const permitted = access.facts.permissions?.includes(delegationOpenPermission) ?? false;
  const [terminal, setTerminal] = useState<ContentState>();
  const projectedState = contentState(session, now, permitted);
  const state = projectedState === "inactive" ? projectedState : (terminal ?? projectedState);
  const [activity, setActivity] = useState<readonly ActivityEntry[]>([]);
  const sessionKey = queries.session.queryKey;
  const root = delegated.root;

  useEffect(() => {
    const clear = () => {
      void queryClient.cancelQueries({ queryKey: root });
      queryClient.removeQueries({ queryKey: root });
    };
    if (state !== "open" && state !== "pending") clear();
    return clear;
  }, [state, root, queryClient]);

  const reconcile = useCallback(
    async (error: unknown): Promise<MutationOutcome> => {
      if (
        error instanceof OperationRefusal &&
        (error.status === 401 ||
          (error.status === 404 && error.key.includes("/email-diagnostics/")) ||
          error.code === "ACCESS_SESSION_INACTIVE" ||
          error.code === "PERMISSION_DENIED")
      ) {
        setTerminal(
          error.code === "ACCESS_SESSION_INACTIVE"
            ? "inactive"
            : error.status === 404
              ? "concealed"
              : "ineligible",
        );
        void queryClient.cancelQueries({ queryKey: root });
        queryClient.removeQueries({ queryKey: root });
      }
      const outcome = await recover(error);
      if (outcome.kind !== "invalid")
        await queryClient.invalidateQueries({ queryKey: sessionKey, exact: true });
      return outcome;
    },
    [recover, queryClient, sessionKey, root],
  );

  useEffect(() => {
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated" || event.action.type !== "error") return;
      const key = event.query.queryKey;
      if (!root.every((segment, index) => key[index] === segment)) return;
      const { error } = event.action;
      if (error instanceof OperationRefusal && [403, 404].includes(error.status))
        void reconcile(error);
    });
  }, [queryClient, root, reconcile]);

  const record = useCallback((kind: ActivityKind) => {
    setActivity((entries) => [{ id: entries.length + 1, kind, at: Date.now() }, ...entries]);
  }, []);

  const close = useMutation({
    mutationFn: () => closeAccessSession(sessionPublicId),
    retry: false,
    onSuccess: (closed) => queryClient.setQueryData(sessionKey, closed),
    onError: () => queryClient.invalidateQueries({ queryKey: sessionKey, exact: true }),
  });

  const liveness = state === "open" ? "live" : "inactive";
  const diagnostics = useEmailDiagnostics(session, state === "open", reconcile);

  return {
    access,
    session,
    sessionError,
    refetchSession,
    state,
    queries,
    delegated,
    commands: delegatedCommands(sessionPublicId),
    activity,
    record,
    reconcile,
    close,
    diagnostics,
    closable: session !== undefined && canClose(session),
    availability: (operation: { key: string }) =>
      access.delegatedAvailability(operation.key, liveness),
  };
}

export type AccessSessionWorkspace = ReturnType<typeof useAccessSessionWorkspace>;
