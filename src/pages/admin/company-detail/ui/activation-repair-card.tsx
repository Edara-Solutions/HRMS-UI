import { HTTPError } from "ky";
import { AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { readBackendErrorMessage } from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { Textarea } from "@/shared/ui/textarea";
import {
  type AccessPolicyMode,
  accessPolicyModeValues,
  type CompanyAccessPolicyState,
  type CompanyActivationState,
  type CompanySubscriptionState,
  useCompanyAccessPolicy,
  useCompanyActivation,
  useCompanySubscription,
  useExtendCompanyTrial,
  useUpdateCompanyAccessPolicy,
} from "../api/company-activation-repair";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";
const timestampInputSchema = z.string().datetime({ offset: true });

const policyModeLabels: Record<AccessPolicyMode, string> = {
  NORMAL: "Normal",
  READ_ONLY: "Read only",
  FROZEN: "Frozen",
  BLOCKED: "Blocked",
  MAINTENANCE: "Maintenance",
};

const activationRequirementLabels: Record<
  CompanyActivationState["unmetRequirements"][number]["code"],
  string
> = {
  OWNER_ONBOARDING_INCOMPLETE: "Owner onboarding",
  COMPANY_PROFILE_INCOMPLETE: "Company profile",
  REQUIRED_SETUP_INCOMPLETE: "Required setup",
  ACCESS_POLICY_RESTRICTS_ACTIVATION: "Access policy",
  SUBSCRIPTION_NOT_ACTIVATABLE: "Subscription",
};

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function formatStatus(value: string): string {
  return value.toLowerCase().replaceAll("_", " ");
}

async function readRepairErrorMessage(error: unknown): Promise<string> {
  if (error instanceof HTTPError) {
    return (await readBackendErrorMessage(error.response)) ?? GENERIC_ERROR_MESSAGE;
  }

  return error instanceof Error ? error.message : GENERIC_ERROR_MESSAGE;
}

function isLaterQualifiedInstant(value: string, current: string): boolean {
  const parsed = timestampInputSchema.safeParse(value);
  if (!parsed.success) return false;
  return new Date(parsed.data).getTime() > new Date(current).getTime();
}

function validatePolicyWindow(effectiveFrom: string, effectiveUntil: string) {
  const from = timestampInputSchema.safeParse(effectiveFrom);
  if (!from.success) return "Effective from must be a timezone-qualified instant.";

  const untilValue = effectiveUntil.trim();
  if (!untilValue) return null;

  const until = timestampInputSchema.safeParse(untilValue);
  if (!until.success) return "Effective until must be a timezone-qualified instant.";

  if (new Date(until.data).getTime() <= new Date(from.data).getTime()) {
    return "Effective until must be later than effective from.";
  }

  return null;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--color-text-faint)]">{label}</dt>
      <dd className="mt-1 text-[var(--color-text)]">{value}</dd>
    </div>
  );
}

function LoadingCard() {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Activation repairs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-40 w-full" />
      </CardContent>
    </Card>
  );
}

function ActivationReadinessPanel({ activation }: { activation: CompanyActivationState }) {
  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-[var(--color-text)]">Activation readiness</h4>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Lifecycle state refreshes after subscription or access-policy repairs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={activation.canActivate ? "success" : "warning"}>
            {activation.canActivate ? "Can activate" : "Blocked"}
          </Badge>
          <Badge variant={activation.lifecycleStatus === "ACTIVE" ? "success" : "default"}>
            {activation.lifecycleStatus}
          </Badge>
        </div>
      </div>
      {activation.unmetRequirements.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">No unmet requirements remain.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {activation.unmetRequirements.map((requirement) => (
            <div
              key={requirement.code}
              className="rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-3 text-sm"
            >
              <p className="font-medium text-[var(--color-text)]">
                {activationRequirementLabels[requirement.code]}
              </p>
              <p className="mt-1 text-[var(--color-text-muted)]">{requirement.message}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SubscriptionPanel({
  companyPublicId,
  state,
  onRefresh,
}: {
  companyPublicId: string;
  state: CompanySubscriptionState;
  onRefresh: () => Promise<unknown>;
}) {
  const extendTrial = useExtendCompanyTrial();
  const [trialEndDate, setTrialEndDate] = useState(state.subscription.trialEndDate);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const history = useMemo(
    () =>
      state.history
        .slice()
        .sort(
          (left, right) =>
            new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
        ),
    [state.history],
  );

  async function submitTrialExtension(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setMessage("Reason is required.");
      return;
    }

    if (!timestampInputSchema.safeParse(trialEndDate).success) {
      setMessage("Trial end must be a timezone-qualified instant.");
      return;
    }

    if (!isLaterQualifiedInstant(trialEndDate, state.subscription.trialEndDate)) {
      await onRefresh();
      setMessage(
        "Trial end must be later than the current trial end. Subscription was reloaded before retry.",
      );
      return;
    }

    try {
      await extendTrial.mutateAsync({
        companyPublicId,
        input: { trialEndDate, reason: trimmedReason },
      });
      setMessage("Trial extension saved. Activation readiness refreshed.");
    } catch (error) {
      await onRefresh();
      setMessage(`${await readRepairErrorMessage(error)} Subscription was reloaded before retry.`);
    }
  }

  return (
    <section className="space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
      <div>
        <h4 className="text-sm font-semibold text-[var(--color-text)]">Subscription repair</h4>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Inspect the authoritative trial state and extend eligible trials without exposing trial
          expiry.
        </p>
      </div>

      <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <Detail label="Status" value={formatStatus(state.subscription.status)} />
        <Detail label="Plan" value={state.subscription.plan.name} />
        <Detail
          label="Initial trial end"
          value={formatDateTime(state.subscription.initialTrialEndDate)}
        />
        <Detail
          label="Effective trial end"
          value={formatDateTime(state.subscription.trialEndDate)}
        />
        <Detail label="Start" value={formatDateTime(state.subscription.startDate)} />
        <Detail label="End" value={formatDateTime(state.subscription.endDate)} />
        <Detail label="Updated" value={formatDateTime(state.subscription.updatedAt)} />
        <Detail label="Note" value={state.subscription.note ?? "-"} />
      </dl>

      <form
        className="grid gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-3 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={submitTrialExtension}
      >
        <div className="space-y-1.5">
          <Label htmlFor="trial-extension-end">New trial end</Label>
          <Input
            id="trial-extension-end"
            value={trialEndDate}
            onChange={(event) => setTrialEndDate(event.target.value)}
            placeholder="2026-08-30T23:59:59.000Z"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="trial-extension-reason">Reason</Label>
          <Input
            id="trial-extension-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Customer requested more setup time"
          />
        </div>
        <div className="flex items-end">
          <Button
            type="submit"
            intent="cta"
            isLoading={extendTrial.isPending}
            disabled={extendTrial.isPending}
          >
            Extend trial
          </Button>
        </div>
      </form>
      {message && (
        <p role="status" className="text-sm text-[var(--color-text-muted)]">
          {message}
        </p>
      )}

      <div>
        <h5 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-faint)]">
          Trial history
        </h5>
        <div className="mt-2 divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
          {history.map((item) => (
            <div key={item.publicId} className="grid gap-2 p-3 text-xs sm:grid-cols-[1fr_1fr_1fr]">
              <div>
                <p className="font-medium text-[var(--color-text)]">{formatStatus(item.type)}</p>
                <p className="mt-1 text-[var(--color-text-muted)]">
                  {formatDateTime(item.occurredAt)}
                </p>
              </div>
              <div className="text-[var(--color-text-muted)]">
                {formatDateTime(item.oldTrialEndDate)} to {formatDateTime(item.newTrialEndDate)}
              </div>
              <div className="text-[var(--color-text-muted)]">{item.reason ?? "-"}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AccessPolicyPanel({
  companyPublicId,
  state,
  onRefresh,
}: {
  companyPublicId: string;
  state: CompanyAccessPolicyState;
  onRefresh: () => Promise<unknown>;
}) {
  const updatePolicy = useUpdateCompanyAccessPolicy();
  const [mode, setMode] = useState<AccessPolicyMode>(state.policy.mode);
  const [reason, setReason] = useState(state.policy.reason ?? "");
  const [note, setNote] = useState(state.policy.note ?? "");
  const [effectiveFrom, setEffectiveFrom] = useState(
    state.policy.effectiveFrom ?? new Date().toISOString(),
  );
  const [effectiveUntil, setEffectiveUntil] = useState(state.policy.effectiveUntil ?? "");
  const [loadedUpdatedAt, setLoadedUpdatedAt] = useState(state.policy.updatedAt);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (loadedUpdatedAt === null) setLoadedUpdatedAt(state.policy.updatedAt);
  }, [loadedUpdatedAt, state.policy.updatedAt]);

  const hasConcurrentChange = loadedUpdatedAt !== state.policy.updatedAt;

  async function submitPolicy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const trimmedReason = reason.trim();
    const trimmedNote = note.trim();
    const trimmedUntil = effectiveUntil.trim();
    if (!trimmedReason) {
      setMessage("Reason is required.");
      return;
    }

    const windowError = validatePolicyWindow(effectiveFrom, trimmedUntil);
    if (windowError) {
      setMessage(windowError);
      return;
    }

    if (hasConcurrentChange) {
      setMessage(
        "Policy changed since this form loaded. Saving now will use last-write-wins semantics.",
      );
    }

    try {
      await updatePolicy.mutateAsync({
        companyPublicId,
        input: {
          mode,
          reason: trimmedReason,
          note: trimmedNote || null,
          effectiveFrom,
          effectiveUntil: trimmedUntil || null,
        },
      });
      await onRefresh();
      setLoadedUpdatedAt(state.policy.updatedAt);
      setMessage("Access policy saved. Effective policy and activation readiness refreshed.");
    } catch (error) {
      await onRefresh();
      setMessage(`${await readRepairErrorMessage(error)} Access policy was reloaded before retry.`);
    }
  }

  return (
    <section className="space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
      <div>
        <h4 className="text-sm font-semibold text-[var(--color-text)]">Access-policy repair</h4>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          Stored policy and effective mode are separated because legacy state or windows can affect
          activation.
        </p>
      </div>

      {hasConcurrentChange && (
        <div className="flex gap-2 rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-warning-soft)] p-3 text-sm text-[var(--color-warning)]">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            Policy updated after this form loaded. Review the returned state before saving again.
          </p>
        </div>
      )}

      <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
        <Detail label="Stored mode" value={policyModeLabels[state.policy.mode]} />
        <Detail label="Effective mode" value={policyModeLabels[state.effectiveMode]} />
        <Detail label="Reason" value={state.policy.reason ?? "-"} />
        <Detail label="Note" value={state.policy.note ?? "-"} />
        <Detail label="Effective from" value={formatDateTime(state.policy.effectiveFrom)} />
        <Detail label="Effective until" value={formatDateTime(state.policy.effectiveUntil)} />
        <Detail label="Source" value={formatStatus(state.policy.source)} />
        <Detail label="Updated" value={formatDateTime(state.policy.updatedAt)} />
      </dl>

      <form
        className="grid gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-3 lg:grid-cols-2"
        onSubmit={submitPolicy}
      >
        <div className="space-y-1.5">
          <Label htmlFor="access-policy-mode">Stored mode</Label>
          <Select value={mode} onValueChange={(value) => setMode(value as AccessPolicyMode)}>
            <SelectTrigger id="access-policy-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {accessPolicyModeValues.map((value) => (
                <SelectItem key={value} value={value}>
                  {policyModeLabels[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="access-policy-reason">Reason</Label>
          <Input
            id="access-policy-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="access-policy-from">Effective from</Label>
          <Input
            id="access-policy-from"
            value={effectiveFrom}
            onChange={(event) => setEffectiveFrom(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="access-policy-until">Effective until</Label>
          <Input
            id="access-policy-until"
            value={effectiveUntil}
            onChange={(event) => setEffectiveUntil(event.target.value)}
          />
        </div>
        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor="access-policy-note">Note</Label>
          <Textarea
            id="access-policy-note"
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <div className="lg:col-span-2">
          <Button
            type="submit"
            intent="cta"
            isLoading={updatePolicy.isPending}
            disabled={updatePolicy.isPending}
          >
            Save policy
          </Button>
        </div>
      </form>
      {message && (
        <p role="status" className="text-sm text-[var(--color-text-muted)]">
          {message}
        </p>
      )}
    </section>
  );
}

export function ActivationRepairCard({ companyPublicId }: { companyPublicId: string }) {
  const subscriptionQuery = useCompanySubscription(companyPublicId);
  const accessPolicyQuery = useCompanyAccessPolicy(companyPublicId);
  const activationQuery = useCompanyActivation(companyPublicId);

  async function refreshSubscriptionAndActivation() {
    await Promise.all([subscriptionQuery.refetch(), activationQuery.refetch()]);
  }

  async function refreshPolicyAndActivation() {
    await Promise.all([accessPolicyQuery.refetch(), activationQuery.refetch()]);
  }

  if (subscriptionQuery.isPending || accessPolicyQuery.isPending || activationQuery.isPending) {
    return <LoadingCard />;
  }

  if (subscriptionQuery.isError || accessPolicyQuery.isError || activationQuery.isError) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Activation repairs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-4 text-sm">
          <Badge variant="danger">Support state unavailable</Badge>
          <p className="text-[var(--color-text-muted)]">
            Subscription, access policy, or activation state could not be loaded.
          </p>
        </CardContent>
      </Card>
    );
  }

  const subscription = subscriptionQuery.data;
  const accessPolicy = accessPolicyQuery.data;
  const activation = activationQuery.data;

  if (!subscription || !accessPolicy || !activation) return <LoadingCard />;

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Activation repairs</CardTitle>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Support-only controls for subscription and access-policy blockers.
          </p>
        </div>
        <Button
          intent="utility"
          leadingIcon={<RefreshCw size={13} />}
          onClick={() =>
            void Promise.all([
              subscriptionQuery.refetch(),
              accessPolicyQuery.refetch(),
              activationQuery.refetch(),
            ])
          }
        >
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-5 p-4">
        <ActivationReadinessPanel activation={activation} />
        <SubscriptionPanel
          companyPublicId={companyPublicId}
          state={subscription}
          onRefresh={refreshSubscriptionAndActivation}
        />
        <AccessPolicyPanel
          companyPublicId={companyPublicId}
          state={accessPolicy}
          onRefresh={refreshPolicyAndActivation}
        />
        <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-3 text-xs text-[var(--color-text-muted)]">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            Trial expiry is intentionally not exposed here as an ordinary owner or company-level
            action.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
