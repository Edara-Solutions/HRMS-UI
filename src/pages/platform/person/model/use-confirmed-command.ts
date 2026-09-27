import { type QueryKey, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePlatformMutationRecovery } from "@/shared/api";

export interface ConfirmedCommand {
  title: string;
  description: string;
  confirmLabel: string;
  tone: "consequential" | "destructive";
  typedTarget?: { label: string; target: string };
  success: string;
  run: () => Promise<unknown>;
  onSuccess?: () => void | Promise<void>;
}

export interface CommandFeedback {
  tone: "status" | "alert";
  message: string;
}

/**
 * One confirmed command at a time for a target: it names the target and consequence, blocks duplicate
 * submission, never retries, and reconciles the affected data whether or not the server confirmed it.
 */
export function useConfirmedCommand(affected: readonly QueryKey[]) {
  const { t } = useTranslation("platform-people");
  const recover = usePlatformMutationRecovery();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<ConfirmedCommand | null>(null);
  const [feedback, setFeedback] = useState<CommandFeedback | null>(null);
  const mutation = useMutation({
    retry: false,
    mutationFn: async (command: ConfirmedCommand) => {
      await command.run();
      return command;
    },
    onSuccess: async (command) => {
      setFeedback({ tone: "status", message: command.success });
      await command.onSuccess?.();
    },
    onError: async (error) => {
      const outcome = await recover(error);
      setFeedback({ tone: "alert", message: t(`outcome.${outcome.kind}`) });
    },
    onSettled: () =>
      Promise.all(affected.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });

  return {
    pending,
    feedback,
    busy: mutation.isPending,
    request: (command: ConfirmedCommand) => {
      setFeedback(null);
      setPending(command);
    },
    cancel: () => setPending(null),
    /** The dialog stays open, showing progress, until the server settles the command. */
    confirm: () => {
      if (pending) mutation.mutate(pending, { onSettled: () => setPending(null) });
    },
  };
}
