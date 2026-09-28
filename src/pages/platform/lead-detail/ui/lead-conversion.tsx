import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConversionPlanForm, ConversionSetupForm } from "@/features/platform-conversion-setup";
import {
  ContractViolation,
  platformLeadOperations as operations,
  platformQueryKey,
  requestPlatformOperation,
  usePlatformAccess,
  usePlatformMutationRecovery,
} from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { QueryPanel } from "@/shared/ui/query-panel";
import type { crmQueries } from "../api/crm";
import { findPendingRequest } from "../api/submission";

interface Props {
  publicId: string;
  name: string;
  queries: ReturnType<typeof crmQueries>;
  blocked: boolean;
  onPendingChange: (value: boolean) => void;
}
interface Submission {
  kind: "submit" | "immediate";
  body: unknown;
}
const readOperations = [
  operations.leads,
  operations.lead,
  operations.eligibility,
  operations.requests,
  operations.request,
  operations.delivery,
];
export function LeadConversion({ publicId, name, queries, blocked, onPendingChange }: Props) {
  const { t } = useTranslation("platform-leads");
  const access = usePlatformAccess();
  const recover = usePlatformMutationRecovery();
  const queryClient = useQueryClient();
  const { data, error, isPending, isFetching, refetch } = useQuery({
    ...queries.eligibility,
    enabled: access.availability(operations.eligibility.key).state === "enabled",
  });
  const [pending, setPending] = useState<Submission | null>(null);
  const [feedback, setFeedback] = useState<string>();
  const [committed, setCommitted] = useState<{ publicId: string; plan: string } | null>(null);
  const locked = useRef(false);
  const readRequests = access.availability(operations.requests.key).state === "enabled";
  const userPublicId = access.user?.publicId ?? "";
  const reconcile = async () => {
    await refetch();
    if (access.availability(operations.requests.key).state === "enabled") {
      try {
        setCommitted(await findPendingRequest(publicId));
      } catch {
        setFeedback(t("conversion.recoveryUnavailable"));
      }
    }
  };
  const mutation = useMutation({
    retry: false,
    mutationFn: async (item: Submission) => {
      if (access.availability(operations[item.kind].key).state !== "enabled")
        throw new Error("Authority changed");
      const fresh = await requestPlatformOperation(operations.eligibility, {
        params: { publicId },
      });
      if (!fresh.isEligible) throw new Error("Eligibility changed");
      const body =
        item.body && typeof item.body === "object"
          ? { ...item.body, leadPublicId: publicId }
          : item.body;
      const result =
        item.kind === "submit"
          ? await requestPlatformOperation(operations.submit, { body })
          : await requestPlatformOperation(operations.immediate, { body });
      if (result.lead.publicId !== publicId)
        throw new ContractViolation({
          audience: "platform",
          key: operations[item.kind].key,
          phase: "response",
          status: 200,
        });
      return result;
    },
    onSuccess: (result) => {
      setCommitted({ publicId: result.publicId, plan: result.plan.name });
      setFeedback(t(result.status === "APPROVED" ? "conversion.approved" : "conversion.submitted"));
    },
    onError: async (error) => {
      await recover(error);
      setFeedback(t("conversion.indeterminate"));
      await reconcile();
    },
    onSettled: async () => {
      await Promise.all(
        readOperations.map((operation) =>
          queryClient.invalidateQueries({ queryKey: platformQueryKey(userPublicId, operation) }),
        ),
      );
      locked.current = false;
      setPending(null);
      onPendingChange(false);
    },
  });
  const disabled =
    blocked ||
    isFetching ||
    !!error ||
    !data?.isEligible ||
    mutation.isPending ||
    mutation.isError ||
    !!committed;
  const submit = access.availability(operations.submit.key);
  const immediate = access.availability(operations.immediate.key);
  return (
    <div className="space-y-4">
      <QueryPanel
        title={t("eligibility.title")}
        pending={isPending}
        error={error}
        retry={() => void refetch()}
      >
        {data && (
          <>
            <p>{t(data.isEligible ? "eligibility.ready" : "eligibility.blocked")}</p>
            <ul className="list-inside list-disc">
              {data.reasons.map((code) => (
                <li key={code}>{t(`enum.${code}`)}</li>
              ))}
            </ul>
          </>
        )}
      </QueryPanel>
      {feedback && <p role={mutation.isError ? "alert" : "status"}>{feedback}</p>}
      {committed && (
        <p>
          {t("conversion.result", { plan: committed.plan })}{" "}
          {readRequests && (
            <Link
              to="/platform/conversion-requests/$publicId"
              params={{ publicId: committed.publicId }}
              className="underline"
            >
              {t("conversion.inspect")}
            </Link>
          )}
        </p>
      )}
      {mutation.isError && (
        <>
          <p>{t("conversion.reviewerGuidance")}</p>
          <Button intent="action" disabled={mutation.isPending} onClick={() => void reconcile()}>
            {t("reconcile")}
          </Button>
        </>
      )}
      {submit.state !== "hidden" && (
        <ConversionPlanForm
          label={t("action.submit")}
          disabled={disabled || submit.state !== "enabled"}
          onSubmit={(body) => setPending({ kind: "submit", body })}
        />
      )}
      {immediate.state !== "hidden" && (
        <ConversionSetupForm
          selectPlan
          label={t("action.immediate")}
          disabled={disabled || immediate.state !== "enabled"}
          onSubmit={(body) => setPending({ kind: "immediate", body })}
        />
      )}
      {pending && (
        <ConfirmDialog
          open
          title={t("confirm.title", { action: t(`action.${pending.kind}`), name })}
          description={t(`confirm.${pending.kind}`, { name })}
          confirmLabel={t(`action.${pending.kind}`)}
          cancelLabel={t("cancel")}
          tone="consequential"
          isLoading={mutation.isPending}
          onClose={() => {
            if (!locked.current) setPending(null);
          }}
          onConfirm={() => {
            if (!locked.current) {
              locked.current = true;
              onPendingChange(true);
              mutation.mutate(pending);
            }
          }}
        />
      )}
    </div>
  );
}
