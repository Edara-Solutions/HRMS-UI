import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type { AccessSessionWorkspace, ActivityKind } from "./use-access-session-workspace";

export interface CommandFeedback {
  tone: "status" | "alert";
  key: string;
}

interface RunOptions {
  activity: ActivityKind;
  refresh: readonly QueryKey[];
  onInvalid?: (fields: readonly string[]) => void;
}

export function useDelegatedCommand(workspace: AccessSessionWorkspace) {
  const queryClient = useQueryClient();
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<CommandFeedback | null>(null);

  async function run<Result>(
    command: () => Promise<Result>,
    { activity, refresh, onInvalid }: RunOptions,
  ): Promise<Result | undefined> {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setFeedback(null);
    try {
      const result = await command();
      workspace.record(activity);
      setFeedback({ tone: "status", key: "outcome.confirmed" });
      return result;
    } catch (error) {
      const outcome = await workspace.reconcile(error);
      if (outcome.kind === "invalid") onInvalid?.(outcome.fields);
      setFeedback({ tone: "alert", key: `outcome.${outcome.kind}` });
      return;
    } finally {
      await Promise.all(refresh.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      lock.current = false;
      setPending(false);
    }
  }

  return { run, pending, feedback, clearFeedback: () => setFeedback(null) };
}
