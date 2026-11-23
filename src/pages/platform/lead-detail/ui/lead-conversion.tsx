import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertCircle, ArrowUpRight, ClipboardCheck, Zap } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
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
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { QueryPanel } from "@/shared/ui/query-panel";
import type { crmQueries } from "../api/crm";
import { findPendingRequest } from "../api/submission";

interface Props {
  publicId: string;
  name: string;
  converted: boolean;
  queries: ReturnType<typeof crmQueries>;
  blocked: boolean;
  onOpenProfile: () => void;
  onPendingChange: (value: boolean) => void;
}
interface Submission {
  kind: "submit" | "immediate";
  body: unknown;
}
const methods = [
  {
    kind: "submit",
    label: "conversion.reviewPath",
    description: "conversion.reviewDescription",
    icon: ClipboardCheck,
  },
  {
    kind: "immediate",
    label: "conversion.immediatePath",
    description: "conversion.immediateDescription",
    icon: Zap,
  },
] as const;
const readOperations = [
  operations.leads,
  operations.lead,
  operations.eligibility,
  operations.requests,
  operations.request,
  operations.delivery,
];
export function LeadConversion({
  publicId,
  name,
  converted,
  queries,
  blocked,
  onOpenProfile,
  onPendingChange,
}: Props) {
  const { t } = useTranslation("platform-leads");
  const access = usePlatformAccess();
  const recover = usePlatformMutationRecovery();
  const queryClient = useQueryClient();
  const { data, error, isPending, isFetching, refetch } = useQuery({
    ...queries.eligibility,
    enabled: access.availability(operations.eligibility.key).state === "enabled",
  });
  const [pending, setPending] = useState<Submission | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<Submission["kind"]>();
  const methodGroup = useId();
  const outcomeRef = useRef<HTMLDivElement>(null);
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
  const completed = converted || data?.reasons.includes("LEAD_ALREADY_CONVERTED");
  const hasContactBlocker = data?.reasons.some((code) => code.startsWith("PRIMARY_CONTACT_"));
  const disabled =
    blocked ||
    isFetching ||
    !!error ||
    !data?.isEligible ||
    mutation.isPending ||
    mutation.isError ||
    !!committed;
  const availableMethods = methods
    .map((method) => ({
      ...method,
      availability: access.availability(operations[method.kind].key),
    }))
    .filter(({ availability }) => availability.state !== "hidden");
  const activeMethod =
    availableMethods.find(
      ({ kind, availability }) => kind === selectedMethod && availability.state === "enabled",
    ) ??
    availableMethods.find(({ availability }) => availability.state === "enabled") ??
    availableMethods[0];
  const showWorkflow =
    !completed && !!data?.isEligible && !error && !committed && !mutation.isError;
  const hasOutcome = !!(feedback || committed);
  useEffect(() => {
    const outcome = outcomeRef.current;
    if (hasOutcome && !pending && !mutation.isPending && !outcome?.closest("[hidden]"))
      outcome?.focus();
  }, [hasOutcome, pending, mutation.isPending]);
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
            <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
              <Badge
                variant={completed || data.isEligible ? "success" : "warning"}
                className="h-auto min-h-5 py-0.5"
              >
                {t(
                  completed
                    ? "conversion.completed"
                    : data.isEligible
                      ? "eligibility.ready"
                      : "eligibility.blocked",
                )}
              </Badge>
              {!completed && (
                <dl className="grid min-w-0 flex-[1_1_22rem] grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))] gap-3 text-sm [&_dt]:text-[var(--color-text-muted)]">
                  <div>
                    <dt>{t("requests.owner")}</dt>
                    <dd className="font-medium">
                      <bdi>{data.primaryContact?.name?.trim() || t("notProvided")}</bdi>
                    </dd>
                  </div>
                  <div>
                    <dt>{t("contact.email")}</dt>
                    <dd>
                      <bdi dir={data.primaryContact?.email ? "ltr" : "auto"}>
                        {data.primaryContact?.email?.trim() || t("notProvided")}
                      </bdi>
                    </dd>
                  </div>
                </dl>
              )}
            </div>
            {!completed && data.reasons.length > 0 && (
              <ul className="space-y-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-sm">
                {data.reasons.map((code) => (
                  <li key={code} className="flex items-start gap-2">
                    <AlertCircle
                      aria-hidden="true"
                      size={15}
                      className="mt-0.5 shrink-0 text-[var(--color-warning)]"
                    />
                    {t(`enum.${code}`)}
                  </li>
                ))}
              </ul>
            )}
            {!completed && hasContactBlocker && (
              <Button intent="navigation" size="sm" onClick={onOpenProfile}>
                {t("conversion.openContacts")}
              </Button>
            )}
            {completed && readRequests && !committed && (
              <Link
                to="/platform/conversion-requests"
                search={{ page: 1, pageSize: 10, status: "APPROVED" }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] underline underline-offset-2"
              >
                {t("conversion.browseApproved")}{" "}
                <ArrowUpRight aria-hidden="true" size={14} className="rtl:rotate-270" />
              </Link>
            )}
          </>
        )}
      </QueryPanel>
      {hasOutcome && (
        <div ref={outcomeRef} role="region" tabIndex={-1} aria-label={t("conversion.outcomeTitle")}>
          <QueryPanel title={t("conversion.outcomeTitle")}>
            {feedback && (
              <p className="font-medium" role={mutation.isError ? "alert" : "status"}>
                {feedback}
              </p>
            )}
            {committed && (
              <p className="flex flex-wrap gap-x-3 gap-y-1">
                {t("conversion.result", { plan: committed.plan })}{" "}
                {readRequests && (
                  <Link
                    to="/platform/conversion-requests/$publicId"
                    params={{ publicId: committed.publicId }}
                    className="text-[var(--color-primary)] underline underline-offset-2"
                  >
                    {t("conversion.inspect")}
                  </Link>
                )}
              </p>
            )}
            {mutation.isError && (
              <>
                <p className="text-[var(--color-text-muted)]">{t("conversion.reviewerGuidance")}</p>
                <Button
                  intent="action"
                  disabled={mutation.isPending}
                  onClick={() => void reconcile()}
                >
                  {t("reconcile")}
                </Button>
              </>
            )}
          </QueryPanel>
        </div>
      )}
      {showWorkflow && !activeMethod && (
        <p className="text-sm text-[var(--color-text-muted)]">{t("conversion.noMethod")}</p>
      )}
      {activeMethod && (
        <div className="space-y-4" hidden={!showWorkflow}>
          {availableMethods.length > 1 && (
            <QueryPanel title={t("conversion.chooseMethod")}>
              <fieldset
                className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-3"
                disabled={disabled}
              >
                <legend className="sr-only">{t("conversion.chooseMethod")}</legend>
                {availableMethods.map(({ kind, label, description, icon: Icon, availability }) => {
                  const selected = activeMethod.kind === kind;
                  return (
                    <label
                      key={kind}
                      className={cn(
                        "flex min-w-0 items-start gap-3 rounded-[var(--radius-md)] border p-3 transition-colors focus-within:ring-2 focus-within:ring-[var(--color-primary)]",
                        selected
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                          : "border-[var(--color-border)] bg-[var(--color-surface)]",
                        availability.state === "enabled" && !disabled
                          ? "cursor-pointer hover:border-[var(--color-primary)]"
                          : "opacity-70",
                      )}
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-surface)] text-[var(--color-primary)]">
                        <Icon size={16} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1 space-y-1">
                        <span
                          className="block text-sm font-semibold"
                          id={`${methodGroup}-${kind}-label`}
                        >
                          {t(label)}
                        </span>
                        <span
                          className="block text-xs leading-relaxed text-[var(--color-text-muted)]"
                          id={`${methodGroup}-${kind}-description`}
                        >
                          {t(description)}
                        </span>
                      </span>
                      <input
                        type="radio"
                        name={methodGroup}
                        checked={selected}
                        disabled={availability.state !== "enabled"}
                        aria-labelledby={`${methodGroup}-${kind}-label`}
                        aria-describedby={`${methodGroup}-${kind}-description`}
                        className="mt-1 shrink-0 accent-[var(--color-primary)]"
                        onChange={() => setSelectedMethod(kind)}
                      />
                    </label>
                  );
                })}
              </fieldset>
            </QueryPanel>
          )}
          {availableMethods.map(({ kind, label, description, availability }) => (
            <div key={kind} hidden={activeMethod.kind !== kind}>
              {kind === "submit" ? (
                <ConversionPlanForm
                  title={t(availableMethods.length === 1 ? label : "conversion.choosePlan")}
                  description={availableMethods.length === 1 ? t(description) : undefined}
                  label={t("action.submit")}
                  disabled={disabled || availability.state !== "enabled"}
                  onSubmit={(body) => setPending({ kind: "submit", body })}
                />
              ) : (
                <ConversionSetupForm
                  selectPlan
                  title={t(availableMethods.length === 1 ? label : "setup.title")}
                  description={availableMethods.length === 1 ? t(description) : undefined}
                  label={t("action.immediate")}
                  disabled={disabled || availability.state !== "enabled"}
                  onSubmit={(body) => setPending({ kind: "immediate", body })}
                />
              )}
            </div>
          ))}
        </div>
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
