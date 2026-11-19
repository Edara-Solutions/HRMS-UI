import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  platformCompanyOperations as operations,
  usePlatformAccess,
  usePlatformMutationRecovery,
} from "@/shared/api";
import { companyRoots, runCompanyCommand } from "../api/company-detail";
import type { Command } from "./company";
export interface PendingCommand {
  command: Command;
  body?: unknown;
}
export function useCompanyCommands(publicId: string) {
  const { t } = useTranslation("platform-companies");
  const access = usePlatformAccess();
  const recover = usePlatformMutationRecovery();
  const queryClient = useQueryClient();
  const [deleted, setDeleted] = useState(false);
  const [pending, setPending] = useState<PendingCommand | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const locked = useRef(false);
  const reconcile = async () => {
    await Promise.all(
      companyRoots(access.user?.publicId ?? "").map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
  };
  const mutation = useMutation({
    retry: false,
    mutationFn: (item: PendingCommand) => {
      if (access.availability(operations[item.command].key).state !== "enabled")
        throw new Error("Authority changed");
      return runCompanyCommand(item.command, publicId, item.body);
    },
    onSuccess: (_result, item) => {
      setFeedback(t("done"));
      if (item.command === "remove") setDeleted(true);
      if (item.command === "restore") setDeleted(false);
    },
    onError: async (error) => {
      const outcome = await recover(error);
      setFeedback(t(`outcome.${outcome.kind}`));
    },
    onSettled: async () => {
      await reconcile();
      setPending(null);
      locked.current = false;
    },
  });
  return {
    deleted,
    pending,
    feedback,
    busy: mutation.isPending,
    failed: mutation.isError,
    request: (item: PendingCommand) => {
      if (!locked.current) {
        setFeedback(null);
        setPending(item);
      }
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
      setFeedback(null);
    },
  };
}
