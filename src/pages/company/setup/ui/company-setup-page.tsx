import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ContractViolation,
  classifyMutationFailure,
  isCompanyBlocked,
  OperationRefusal,
  useCompanyAccess,
} from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { CompanyAccessNotice } from "@/shared/ui/company-access-notice";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  companySetupQueries,
  runSetupCommand,
  type SetupCommand,
  setupCommandOperationKeys,
} from "../api/company-setup";
import {
  applyStepResult,
  type CompanySetup,
  missingPrerequisite,
  orderSteps,
  type SetupStep,
} from "../model/setup-step";
import { SetupStepItem } from "./setup-step-item";

interface Feedback {
  tone: "status" | "alert";
  message: string;
}

export function CompanySetupPage() {
  const { t } = useTranslation("organization");
  const access = useCompanyAccess();
  const queryClient = useQueryClient();
  const queries = companySetupQueries(access.user?.publicId ?? "");
  const canProfile = access.availability("GET /api/v1/company/profile").state !== "hidden";
  const canActivation = access.availability("GET /api/v1/company/activation").state !== "hidden";
  const {
    data: checklist,
    error: checklistError,
    isPending: checklistPending,
    isError: checklistFailed,
    isFetching: checklistFetching,
    refetch: refetchChecklist,
  } = useQuery({ ...queries.setup, enabled: access.user !== undefined });
  const { data: profile } = useQuery({ ...queries.profile, enabled: canProfile });
  const {
    data: activation,
    isPending: activationPending,
    isError: activationFailed,
  } = useQuery({ ...queries.activation, enabled: canActivation });
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [skipTarget, setSkipTarget] = useState<SetupStep | null>(null);
  const [contractFailed, setContractFailed] = useState(false);

  const transition = useMutation({
    mutationFn: ({ step, command }: { step: SetupStep; command: SetupCommand }) =>
      runSetupCommand(command, step.publicId),
    retry: false,
    onSuccess: (updated, { command }) => {
      const current = queryClient.getQueryData<CompanySetup>(queries.setup.queryKey);
      const next = current ? applyStepResult(current, updated) : null;
      if (next) queryClient.setQueryData(queries.setup.queryKey, next);
      setFeedback({
        tone: "status",
        message: t(`setup.command.${command}.done`, { step: t(`step.${updated.stepType}`) }),
      });
    },
    onError: async (error) => {
      const outcome = classifyMutationFailure(error);
      if (outcome.kind === "access-restricted") await access.recordRefusedMode(outcome.mode);
      if (outcome.kind === "contract") setContractFailed(true);
      setFeedback({
        tone: "alert",
        message:
          outcome.kind === "access-restricted"
            ? t("setup.restricted")
            : outcome.kind === "contract"
              ? t("state.contractUnavailable")
              : outcome.kind === "refused"
                ? t("setup.refused")
                : outcome.kind === "uncertain"
                  ? t("setup.uncertain")
                  : t("setup.stale"),
      });
    },
    // Success or failure, the server's checklist is re-read before another action is offered.
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queries.setup.queryKey }),
        queryClient.invalidateQueries({ queryKey: queries.activation.queryKey }),
        queryClient.invalidateQueries({ queryKey: queries.registry.queryKey }),
      ]),
  });

  if (isCompanyBlocked(checklistError)) throw checklistError;
  if (checklistError instanceof OperationRefusal && [403, 404].includes(checklistError.status))
    throw checklistError;
  if (!access.user) return null;

  function request(step: SetupStep, command: SetupCommand) {
    setFeedback(null);
    if (command === "skip") {
      setSkipTarget(step);
      return;
    }
    transition.mutate({ step, command });
  }

  const pendingCommand = transition.isPending ? transition.variables.command : null;
  const pendingStep = transition.isPending ? transition.variables.step.publicId : null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("setup.pageTitle")}</h1>
        <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
          {t("setup.pageDescription")}
        </p>
      </header>

      {access.policy && <CompanyAccessNotice {...access.policy} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section
          aria-labelledby="setup-steps"
          aria-busy={checklistFetching}
          className="min-w-0 space-y-3"
        >
          <h2 id="setup-steps" className="text-base font-semibold">
            {t("setup.stepsTitle")}
          </h2>
          {checklistPending ? (
            <output className="block space-y-3" aria-label={t("state.loading")}>
              {[0, 1, 2].map((row) => (
                <Skeleton key={row} className="h-24 w-full" />
              ))}
            </output>
          ) : checklistFailed ? (
            <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 text-sm">
              <p>
                {checklistError instanceof ContractViolation
                  ? t("state.contractUnavailable")
                  : t("state.loadFailed")}
              </p>
              {!(checklistError instanceof ContractViolation) && (
                <Button intent="action" size="sm" onClick={() => void refetchChecklist()}>
                  {t("state.retry")}
                </Button>
              )}
            </div>
          ) : checklist.steps.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">{t("setup.empty")}</p>
          ) : (
            <ol className="space-y-3">
              {orderSteps(checklist).map((step) => (
                <SetupStepItem
                  key={step.publicId}
                  step={step}
                  busy={transition.isPending || contractFailed}
                  pendingCommand={pendingStep === step.publicId ? pendingCommand : null}
                  canOpenProfile={canProfile}
                  onCommand={request}
                  commandAvailability={(command) => {
                    const availability = access.availability(setupCommandOperationKeys[command]);
                    return availability.state === "enabled" &&
                      missingPrerequisite(step, command, profile?.status)
                      ? { state: "disabled", reason: "prerequisite" }
                      : availability;
                  }}
                />
              ))}
            </ol>
          )}
          {contractFailed && (
            <p className="text-sm text-[var(--color-text-muted)]">{t("setup.actionsPaused")}</p>
          )}
          <p role={feedback?.tone === "alert" ? "alert" : "status"} className="min-h-5 text-sm">
            {feedback?.message}
          </p>
        </section>

        {canActivation && (
          <Card as="section" aria-labelledby="setup-activation" className="h-fit">
            <CardHeader>
              <CardTitle id="setup-activation">{t("activation.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-[18px] text-sm">
              {activationPending ? (
                <Skeleton className="h-16 w-full" />
              ) : activationFailed ? (
                <p className="text-[var(--color-text-muted)]">{t("state.loadFailed")}</p>
              ) : (
                <>
                  <p className="font-medium">
                    {activation.lifecycleStatus === "ACTIVE"
                      ? t("lifecycle.ACTIVE")
                      : activation.canActivate
                        ? t("activation.ready")
                        : t("activation.pending")}
                  </p>
                  {activation.unmetRequirements.length > 0 && (
                    <ul className="space-y-2 text-[var(--color-text-muted)]">
                      {activation.unmetRequirements.map((requirement) => (
                        <li key={requirement.code} className="space-y-1">
                          <p>{t(`requirement.${requirement.code}`)}</p>
                          {requirement.code === "COMPANY_PROFILE_INCOMPLETE" && canProfile && (
                            <Link
                              to="/company/profile"
                              className="font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
                            >
                              {t("organization.openProfile")}
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={skipTarget !== null}
        title={t("setup.skipConfirm.title", {
          step: skipTarget ? t(`step.${skipTarget.stepType}`) : "",
        })}
        description={t(
          skipTarget?.isRequired ? "setup.skipConfirm.required" : "setup.skipConfirm.optional",
        )}
        confirmLabel={t("setup.command.skip.action")}
        cancelLabel={t("state.cancel")}
        onClose={() => setSkipTarget(null)}
        onConfirm={() => {
          if (skipTarget) transition.mutate({ step: skipTarget, command: "skip" });
          setSkipTarget(null);
        }}
      />
    </div>
  );
}
