import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { type MutationOutcome, usePlatformAccess, usePlatformMutationRecovery } from "@/shared/api";
import { roleRoots } from "../api/roles";

export interface RoleFeedback {
  tone: "status" | "alert";
  message: string;
}

interface RoleMutationOptions<Input, Result> {
  run: (input: Input) => Promise<Result>;
  success: string;
  onSuccess?: (result: Result) => void | Promise<void>;
  onFailure?: (outcome: MutationOutcome) => void;
}

/**
 * One role command: never retried, reconciled through `/me` and the role catalogue whether or not
 * the server confirmed it, and reported with safe copy only.
 */
export function useRoleMutation<Input, Result>({
  run,
  success,
  onSuccess,
  onFailure,
}: RoleMutationOptions<Input, Result>) {
  const { t } = useTranslation("platform-people");
  const access = usePlatformAccess();
  const recover = usePlatformMutationRecovery();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<RoleFeedback | null>(null);
  const mutation = useMutation({
    retry: false,
    mutationFn: run,
    onSuccess: async (result) => {
      setFeedback({ tone: "status", message: success });
      await onSuccess?.(result);
    },
    onError: async (error) => {
      const outcome = await recover(error);
      onFailure?.(outcome);
      setFeedback({ tone: "alert", message: t(`outcome.${outcome.kind}`) });
    },
    onSettled: () =>
      Promise.all(
        roleRoots(access.user?.publicId ?? "").map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });

  return {
    feedback,
    isPending: mutation.isPending,
    showFeedback: setFeedback,
    /** Runs the command; `onSettled` lets a confirmation stay open until the server answers. */
    mutate: (input: Input, onSettled?: () => void) => {
      setFeedback(null);
      mutation.mutate(input, { onSettled });
    },
  };
}
