import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  platformLeadOperations as operations,
  platformQueryKey,
  usePlatformAccess,
  usePlatformMutationRecovery,
} from "@/shared/api";
import { type ReviewCommand, runReviewCommand } from "../api/review";

const reads = [
  operations.request,
  operations.requests,
  operations.delivery,
  operations.leads,
  operations.lead,
  operations.eligibility,
];
export function useReviewCommands(publicId: string) {
  const access = usePlatformAccess();
  const recover = usePlatformMutationRecovery();
  const client = useQueryClient();
  const { t } = useTranslation("platform-leads");
  const [pending, setPending] = useState<ReviewCommand | null>(null);
  const [feedback, setFeedback] = useState<string>();
  const lock = useRef(false);
  const reconcile = () =>
    Promise.all(
      reads.map((operation) =>
        client.invalidateQueries({
          queryKey: platformQueryKey(access.user?.publicId ?? "", operation),
        }),
      ),
    );
  const mutation = useMutation({
    retry: false,
    mutationFn: (command: ReviewCommand) => {
      if (
        access.availability(operations[command.kind].key).state !== "enabled" ||
        access.availability(operations.request.key).state !== "enabled"
      )
        throw new Error("Authority changed");
      if (
        command.kind === "retryDelivery" &&
        access.availability(operations.delivery.key).state !== "enabled"
      )
        throw new Error("Authority changed");
      return runReviewCommand(publicId, command);
    },
    onSuccess: () => setFeedback(t("done")),
    onError: async (error) => {
      const outcome = await recover(error);
      setFeedback(t(`outcome.${outcome.kind}`));
    },
    onSettled: async () => {
      await reconcile();
      lock.current = false;
      setPending(null);
    },
  });
  return {
    pending,
    feedback,
    busy: mutation.isPending,
    failed: mutation.isError,
    request: (command: ReviewCommand) => {
      if (!lock.current && !mutation.isError) setPending(command);
    },
    cancel: () => {
      if (!lock.current) setPending(null);
    },
    confirm: () => {
      if (pending && !lock.current) {
        lock.current = true;
        mutation.mutate(pending);
      }
    },
    reconcile: async () => {
      await reconcile();
      mutation.reset();
    },
  };
}
