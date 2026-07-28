import { Link, useNavigate } from "@tanstack/react-router";
import { HTTPError } from "ky";
import { ArrowLeft, Check, Play, RefreshCw, SkipForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { readBackendErrorMessage } from "@/shared/api";
import { useCurrentSession } from "@/shared/auth";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import {
  type ActivationRequirementCode,
  type CompanyActivation,
  type CompanyProfile,
  type CompanySetupStep,
  type SetupStepStatus,
  type SetupStepType,
  useCompanyActivation,
  useCompanyProfile,
  useCompanySetupChecklist,
  useCompleteSetupStep,
  useSkipSetupStep,
  useStartSetupStep,
} from "../api/company-setup";

const stepTypeLabels: Record<SetupStepType, string> = {
  SET_COMPANY_PROFILE: "Company profile",
  SET_ROLES: "Roles",
  SET_JOBS: "Jobs",
  SET_BRANCHES: "Branches",
  SET_SHIFTS: "Shifts",
  SET_DEPARTMENTS: "Departments",
};

const stepStatusVariants: Record<SetupStepStatus, "default" | "info" | "success" | "warning"> = {
  PENDING: "default",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  SKIPPED: "warning",
};

const activationRequirementLabels: Record<ActivationRequirementCode, string> = {
  OWNER_ONBOARDING_INCOMPLETE: "Owner onboarding",
  COMPANY_PROFILE_INCOMPLETE: "Company profile",
  REQUIRED_SETUP_INCOMPLETE: "Required setup",
  ACCESS_POLICY_RESTRICTS_ACTIVATION: "Access policy",
  SUBSCRIPTION_NOT_ACTIVATABLE: "Subscription",
};

const activationRequirementRoutes: Partial<Record<ActivationRequirementCode, string>> = {
  COMPANY_PROFILE_INCOMPLETE: "/company/profile",
};

const commandLabels = {
  start: "started",
  complete: "completed",
  skip: "skipped",
} as const;

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

function statusLabel(value: SetupStepStatus) {
  return value.toLowerCase().replaceAll("_", " ");
}

function dependencyLabels(step: CompanySetupStep) {
  if (step.dependencies.length === 0) return "None";
  return step.dependencies.map((dependency) => stepTypeLabels[dependency]).join(", ");
}

function actionKey(stepPublicId: string, command: keyof typeof commandLabels) {
  return `${stepPublicId}:${command}`;
}

async function readSetupErrorMessage(error: unknown) {
  if (error instanceof HTTPError) {
    return (await readBackendErrorMessage(error.response)) ?? "The step could not be updated.";
  }

  return error instanceof Error ? error.message : "The step could not be updated.";
}

interface SetupStepCardProps {
  step: CompanySetupStep;
  profile: CompanyProfile;
  isActionPending: (stepPublicId: string, command: keyof typeof commandLabels) => boolean;
  onCommand: (step: CompanySetupStep, command: keyof typeof commandLabels) => Promise<void>;
}

function SetupStepCard({ step, profile, isActionPending, onCommand }: SetupStepCardProps) {
  const completeDisabled = step.stepType === "SET_COMPANY_PROFILE" && profile.status !== "COMPLETE";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{stepTypeLabels[step.stepType]}</CardTitle>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Step public ID: {step.publicId}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={stepStatusVariants[step.status]}>{statusLabel(step.status)}</Badge>
            <Badge variant={step.isRequired ? "warning" : "default"}>
              {step.isRequired ? "Required" : "Optional"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-[18px]">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Sequence" value={String(step.sequence)} />
          <Field label="Template" value={`v${step.templateVersion}`} />
          <Field label="Started" value={formatDateTime(step.startedAt)} />
          <Field label="Completed" value={formatDateTime(step.completedAt)} />
          <Field label="Created" value={formatDateTime(step.createdAt)} />
          <Field label="Updated" value={formatDateTime(step.updatedAt)} />
          <Field label="Dependencies" value={dependencyLabels(step)} wide />
          {step.stepType === "SET_COMPANY_PROFILE" && (
            <Field label="Profile status" value={profile.status.toLowerCase()} wide />
          )}
        </div>

        <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 text-sm text-[var(--color-text-muted)]">
          <p>
            Dependencies are guidance only; the backend still accepts the step commands directly.
          </p>
          {step.isRequired && <p>Required steps can still be skipped by the backend.</p>}
          {step.stepType === "SET_COMPANY_PROFILE" && profile.status !== "COMPLETE" && (
            <p>
              Complete this profile on the profile page first. The complete command stays disabled
              until the profile becomes authoritative `COMPLETE`.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            leadingIcon={<Play size={15} />}
            aria-label={`Start ${stepTypeLabels[step.stepType]}`}
            disabled={isActionPending(step.publicId, "start")}
            isLoading={isActionPending(step.publicId, "start")}
            onClick={() => void onCommand(step, "start")}
          >
            Start
          </Button>
          <Button
            intent="cta"
            leadingIcon={<Check size={15} />}
            aria-label={`Complete ${stepTypeLabels[step.stepType]}`}
            disabled={isActionPending(step.publicId, "complete") || completeDisabled}
            isLoading={isActionPending(step.publicId, "complete")}
            onClick={() => void onCommand(step, "complete")}
          >
            Complete
          </Button>
          <Button
            variant="secondary"
            leadingIcon={<SkipForward size={15} />}
            aria-label={`Skip ${stepTypeLabels[step.stepType]}`}
            disabled={isActionPending(step.publicId, "skip")}
            isLoading={isActionPending(step.publicId, "skip")}
            onClick={() => void onCommand(step, "skip")}
          >
            Skip
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface FieldProps {
  label: string;
  value: string;
  wide?: boolean;
}

function Field({ label, value, wide }: FieldProps) {
  return (
    <div className={wide ? "sm:col-span-2 xl:col-span-4" : "space-y-1"}>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
        {label}
      </p>
      <p className="text-sm text-[var(--color-text)]">{value}</p>
    </div>
  );
}

function ActivationCard({
  activation,
  onRefresh,
}: {
  activation: CompanyActivation | null;
  onRefresh: () => void;
}) {
  if (!activation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activation</CardTitle>
        </CardHeader>
        <CardContent className="p-[18px] text-sm text-[var(--color-text-muted)]">
          <p>Evaluating activation.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle>Activation</CardTitle>
          <Button variant="secondary" leadingIcon={<RefreshCw size={15} />} onClick={onRefresh}>
            Reevaluate
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-[18px] text-sm">
        <div className="flex flex-wrap gap-2">
          <Badge variant={activation.canActivate ? "success" : "warning"}>
            {activation.canActivate ? "Can activate" : "Blocked"}
          </Badge>
          <Badge variant={activation.lifecycleStatus === "ACTIVE" ? "success" : "default"}>
            {activation.lifecycleStatus}
          </Badge>
        </div>
        <p className="text-[var(--color-text-muted)]">
          Activated at: {formatDateTime(activation.activatedAt)}
        </p>
        {activation.unmetRequirements.length > 0 ? (
          <div className="space-y-2">
            {activation.unmetRequirements.map((requirement) => {
              const route = activationRequirementRoutes[requirement.code];
              return (
                <div
                  className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"
                  key={requirement.code}
                >
                  <p className="font-medium text-[var(--color-text)]">
                    {activationRequirementLabels[requirement.code]}
                  </p>
                  <p className="mt-1 text-[var(--color-text-muted)]">{requirement.message}</p>
                  {route && (
                    <Link
                      className="mt-2 inline-flex text-[var(--color-primary)] hover:underline"
                      to={route}
                    >
                      Open fix
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[var(--color-text-muted)]">No unmet requirements remain.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function CompanySetupPage() {
  const session = useCurrentSession();
  const companyPublicId = session?.user.companyPublicId ?? null;
  const navigate = useNavigate();
  const profileQuery = useCompanyProfile(companyPublicId);
  const setupQuery = useCompanySetupChecklist(companyPublicId);
  const startStep = useStartSetupStep();
  const completeStep = useCompleteSetupStep();
  const skipStep = useSkipSetupStep();
  const [shouldEvaluateActivation, setShouldEvaluateActivation] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingActions, setPendingActions] = useState<Record<string, true>>({});

  useEffect(() => {
    if (profileQuery.data && setupQuery.data) {
      setShouldEvaluateActivation(true);
    }
  }, [profileQuery.data, setupQuery.data]);

  const activationQuery = useCompanyActivation(companyPublicId, shouldEvaluateActivation);

  const steps = useMemo(
    () =>
      (setupQuery.data?.steps ?? []).slice().sort((left, right) => left.sequence - right.sequence),
    [setupQuery.data],
  );

  const profile = profileQuery.data ?? null;
  const activation = activationQuery.data ?? null;

  function setActionPending(
    stepPublicId: string,
    command: keyof typeof commandLabels,
    pending: boolean,
  ) {
    const key = actionKey(stepPublicId, command);
    setPendingActions((current) => {
      if (pending) {
        if (current[key]) return current;
        return { ...current, [key]: true };
      }

      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function isActionPending(stepPublicId: string, command: keyof typeof commandLabels) {
    return pendingActions[actionKey(stepPublicId, command)] === true;
  }

  async function runCommand(step: CompanySetupStep, command: keyof typeof commandLabels) {
    if (!companyPublicId) return;

    setActionPending(step.publicId, command, true);
    setMessage("");

    try {
      const mutation =
        command === "start" ? startStep : command === "complete" ? completeStep : skipStep;
      await mutation.mutateAsync({ companyPublicId, stepPublicId: step.publicId });
      setMessage(`${stepTypeLabels[step.stepType]} step ${commandLabels[command]}.`);
    } catch (error) {
      if (error instanceof HTTPError && error.response.status >= 500) {
        await Promise.all([
          setupQuery.refetch(),
          activationQuery.refetch(),
          profileQuery.refetch(),
        ]);
        setMessage(
          `${await readSetupErrorMessage(error)} The checklist was reloaded before retry.`,
        );
        return;
      }

      setMessage(await readSetupErrorMessage(error));
    } finally {
      setActionPending(step.publicId, command, false);
    }
  }

  if (!companyPublicId) {
    return (
      <Card>
        <EmptyState
          icon={ArrowLeft}
          title="Company context unavailable"
          description="Sign in as the company owner to operate the setup checklist."
        />
      </Card>
    );
  }

  if (profileQuery.isPending || setupQuery.isPending) {
    return (
      <Card>
        <EmptyState
          icon={RefreshCw}
          title="Loading checklist"
          description="Fetching company profile and setup state."
        />
      </Card>
    );
  }

  if (profileQuery.isError || !profile || setupQuery.isError || !setupQuery.data) {
    return (
      <Card>
        <EmptyState
          icon={ArrowLeft}
          title="Checklist unavailable"
          description="The company setup data could not be loaded."
        />
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-[var(--color-primary)]">Setup checklist</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--color-text)]">
            Company setup
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Sequence, status, and commands come from the server snapshot for {profile.name}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void navigate({ to: "/company/profile" })}>
            Open profile
          </Button>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-[18px] text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant={profile.status === "COMPLETE" ? "success" : "warning"}>
                  {profile.status}
                </Badge>
                <Badge variant="default">{profile.name}</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Field label="Company public ID" value={profile.companyPublicId} wide />
                <Field label="Created" value={formatDateTime(profile.createdAt)} />
                <Field label="Updated" value={formatDateTime(profile.updatedAt)} />
              </div>
              <p className="text-[var(--color-text-muted)]">
                The profile step becomes complete only when the authoritative profile is COMPLETE.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {steps.map((step) => (
              <SetupStepCard
                key={step.publicId}
                step={step}
                profile={profile}
                isActionPending={isActionPending}
                onCommand={runCommand}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <ActivationCard
            activation={activation}
            onRefresh={() => void activationQuery.refetch()}
          />

          <Card>
            <CardHeader>
              <CardTitle>Checklist snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-[18px] text-sm">
              <p className="text-[var(--color-text-muted)]">
                Template version: {setupQuery.data.templateVersion}
              </p>
              <p className="text-[var(--color-text-muted)]">
                Steps: {setupQuery.data.steps.length}
              </p>
              <p className="text-[var(--color-text-muted)]">
                Commands use the step public ID and preserve backend timestamps on repeated valid
                transitions.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {message && (
        <p
          role="status"
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 text-sm"
        >
          {message}
        </p>
      )}
    </div>
  );
}
