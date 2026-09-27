import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  platformLeadOperations as operations,
  platformQueryKey,
  usePlatformAccess,
  usePlatformMutationRecovery,
} from "@/shared/api";
import { type LeadCommandInput, runLeadCommand } from "../api/crm";

const readOperations = [
  operations.leads,
  operations.lead,
  operations.activities,
  operations.eligibility,
  operations.domain,
  operations.readiness,
  operations.requests,
];
export function useLeadCommands(publicId: string) {
  const { t } = useTranslation("platform-leads");
  const access = usePlatformAccess();
  const recover = usePlatformMutationRecovery();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [pending, setPending] = useState<LeadCommandInput | null>(null);
  const [feedback, setFeedback] = useState<string>();
  const locked = useRef(false);
  const userPublicId = access.user?.publicId ?? "";
  const reconcile = () =>
    Promise.all(
      readOperations.map((operation) =>
        queryClient.invalidateQueries({ queryKey: platformQueryKey(userPublicId, operation) }),
      ),
    );
  const mutation = useMutation({
    retry: false,
    mutationFn: (item: LeadCommandInput) => {
      if (access.availability(operations[item.kind].key).state !== "enabled")
        throw new Error("Authority changed");
      return runLeadCommand(publicId, item);
    },
    onSuccess: async (_result, item) => {
      setFeedback(t("done"));
      if (item.kind === "remove")
        await navigate({
          to: "/platform/leads",
          search: { page: 1, pageSize: 10, isArchived: false },
        });
    },
    onError: async (error) => {
      const outcome = await recover(error);
      setFeedback(t(`outcome.${outcome.kind}`));
    },
    onSettled: async () => {
      await Promise.all(
        readOperations.map((operation) =>
          queryClient.invalidateQueries({ queryKey: platformQueryKey(userPublicId, operation) }),
        ),
      );
      locked.current = false;
      setPending(null);
    },
  });
  return {
    pending,
    feedback,
    busy: mutation.isPending,
    failed: mutation.isError,
    request: (item: LeadCommandInput) => {
      if (!locked.current && !mutation.isError) setPending(item);
    },
    cancel: () => {
      if (!locked.current) setPending(null);
    },
    confirm: () => {
      if (pending && !locked.current) {
        locked.current = true;
        mutation.mutate(pending);
      }
    },
    reconcile: async () => {
      await reconcile();
      mutation.reset();
    },
  };
}
