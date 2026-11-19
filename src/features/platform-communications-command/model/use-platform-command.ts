import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  AudienceSessionChanged,
  type MutationOutcome,
  operationAuthorization,
  usePlatformAccess,
  usePlatformMutationRecovery,
} from "@/shared/api";
import { usePlatformSession } from "@/shared/auth";

export function usePlatformCommand() {
  const access = usePlatformAccess();
  const recover = usePlatformMutationRecovery();
  const client = useQueryClient();
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<MutationOutcome | { kind: "success" } | null>(null);
  const [blocked, setBlocked] = useState(false);
  const identity = access.user?.publicId;
  const generation = usePlatformSession((state) => state.generation);
  const current = () =>
    identity !== undefined &&
    usePlatformSession.getState().generation === generation &&
    usePlatformSession.getState().session?.user.publicId === identity;
  async function run(
    operation: string,
    command: (check: () => void) => Promise<unknown>,
    onSaved?: () => void,
  ) {
    if (lock.current || blocked || !current() || access.availability(operation).state !== "enabled")
      return;
    lock.current = true;
    setPending(true);
    setOutcome(null);
    try {
      await command(() => {
        if (!current()) throw new AudienceSessionChanged();
        const user = usePlatformSession.getState().session?.user;
        const policy = Object.entries(operationAuthorization).find(
          ([key]) => key === operation,
        )?.[1];
        if (
          !user ||
          user.mustChangePassword ||
          !policy ||
          (policy.permission && !user.permissions.includes(policy.permission))
        )
          throw new Error("stale");
      });
      if (!current()) throw new AudienceSessionChanged();
      setOutcome({ kind: "success" });
      onSaved?.();
    } catch (error) {
      const failure =
        error instanceof Error && error.message === "stale"
          ? { kind: "stale" as const }
          : await recover(error);
      if (current()) {
        setOutcome(failure);
        setBlocked(true);
      }
    } finally {
      try {
        if (current()) await client.invalidateQueries({ queryKey: ["platform", identity] });
      } finally {
        setPending(false);
        lock.current = false;
      }
    }
  }
  async function reconcile() {
    if (lock.current || !current()) return;
    lock.current = true;
    setPending(true);
    try {
      await client.refetchQueries(
        { queryKey: ["platform", identity], type: "active" },
        { throwOnError: true },
      );
      if (current() && outcome?.kind !== "contract") {
        setBlocked(false);
        setOutcome(null);
      }
    } catch {
      /* Failed reads retain the command lock and their bounded panel state. */
    } finally {
      setPending(false);
      lock.current = false;
    }
  }
  return { run, reconcile, pending, outcome, blocked };
}
