import { HTTPError } from "ky";
import { Send } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { readBackendErrorMessage } from "@/shared/api";
import { hasPermission, useAuthStore } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { DateTimePicker } from "@/shared/ui/date-time-picker";
import { Label } from "@/shared/ui/label";
import { SearchableSelect } from "@/shared/ui/searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useConversionPlans } from "../api/conversion-plans";
import {
  findPendingConversionRequest,
  type LeadConversionRequest,
  useSubmitImmediateConversion,
  useSubmitPendingConversion,
} from "../api/conversion-requests";
import type { LeadConversionEligibility } from "../api/lead-detail";

const immediateInputSchema = z.object({
  templateKey: z.coerce.number().pipe(z.union([z.literal(1), z.literal(2), z.literal(3)])),
  trialEndDate: z
    .string()
    .optional()
    .transform((value) => (value ? new Date(value).toISOString() : undefined))
    .refine((value) => !value || new Date(value).getTime() > Date.now(), {
      message: "Trial end date must be in the future.",
    }),
});

interface ConversionSubmissionCardProps {
  leadPublicId: string;
  refreshEligibility: () => Promise<LeadConversionEligibility | undefined>;
}

async function getErrorMessage(error: unknown): Promise<string> {
  if (error instanceof HTTPError) {
    return (await readBackendErrorMessage(error.response)) ?? "Conversion submission failed.";
  }
  return error instanceof Error ? error.message : "Conversion submission failed.";
}

export function ConversionSubmissionCard({
  leadPublicId,
  refreshEligibility,
}: ConversionSubmissionCardProps) {
  const plansQuery = useConversionPlans();
  const plans = plansQuery.data?.data ?? [];
  const planOptions = plans.map((plan) => ({ value: plan.publicId, label: plan.name }));
  const user = useAuthStore((state) => state.session?.user);
  const canRequest = hasPermission(user, "REQUEST_LEAD_CONVERSION");
  const canConvertImmediately = hasPermission(user, "AUTO_APPROVE_LEAD_CONVERSION");
  const canReview = hasPermission(user, "APPROVE_LEAD_CONVERSION_REQUEST");
  const [selectedPlanPublicId, setSelectedPlanPublicId] = useState("");
  const [templateKey, setTemplateKey] = useState("1");
  const [trialEndDate, setTrialEndDate] = useState("");
  const [message, setMessage] = useState("");
  const [pendingRequest, setPendingRequest] = useState<LeadConversionRequest | null>(null);
  const pendingMutation = useSubmitPendingConversion();
  const [immediateRecoveryRequired, setImmediateRecoveryRequired] = useState(false);
  const immediateMutation = useSubmitImmediateConversion();
  const isSubmitting = pendingMutation.isPending || immediateMutation.isPending;

  async function recoverPendingRequest() {
    try {
      const existing = await findPendingConversionRequest(leadPublicId);
      setPendingRequest(existing);
      return existing;
    } catch {
      return null;
    }
  }

  async function ensureEligible() {
    const eligibility = await refreshEligibility();
    if (eligibility?.isEligible) return true;
    setMessage("Conversion eligibility changed. Resolve every blocker shown above.");
    return false;
  }

  async function submitPending() {
    setMessage("");
    setPendingRequest(null);
    if (!selectedPlanPublicId || !(await ensureEligible())) return;

    try {
      const request = await pendingMutation.mutateAsync({
        leadPublicId,
        planPublicId: selectedPlanPublicId,
      });
      setPendingRequest(request);
      setMessage("Conversion request submitted for review.");
    } catch (error) {
      if (error instanceof HTTPError && error.response.status === 409) {
        const existing = await recoverPendingRequest();
        if (existing) {
          setMessage("An existing pending request was loaded.");
          return;
        }
        setMessage("A pending request already exists. Ask an authorized reviewer to open it.");
        return;
      }
      setMessage(await getErrorMessage(error));
    }
  }

  async function submitImmediate() {
    setMessage("");
    setPendingRequest(null);
    if (!selectedPlanPublicId || !(await ensureEligible())) return;
    setImmediateRecoveryRequired(false);

    const input = immediateInputSchema.safeParse({ templateKey, trialEndDate });
    if (!input.success) {
      setMessage(input.error.issues[0]?.message ?? "Check the immediate conversion setup.");
      return;
    }

    try {
      const request = await immediateMutation.mutateAsync({
        leadPublicId,
        planPublicId: selectedPlanPublicId,
        templateKey: input.data.templateKey,
        ...(input.data.trialEndDate ? { trialEndDate: input.data.trialEndDate } : {}),
      });
      setPendingRequest(request.status === "PENDING" ? request : null);
      setMessage(
        request.status === "APPROVED"
          ? "Lead converted successfully."
          : "Immediate conversion is pending reviewer action.",
      );
    } catch (error) {
      const existing = await recoverPendingRequest();
      setImmediateRecoveryRequired(true);
      if (existing) {
        setMessage(
          canReview
            ? "Immediate conversion did not finish. The committed pending request is ready for reviewer recovery."
            : "Immediate conversion did not finish. A pending request was committed for an authorized reviewer.",
        );
        return;
      }
      const errorMessage = await getErrorMessage(error);
      setMessage(`${errorMessage} An authorized reviewer should check for a pending request.`);
    }
  }

  if (!canRequest && !canConvertImmediately) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit conversion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div>
          <Label htmlFor="conversion-plan">Conversion plan</Label>
          <div className="mt-1">
            <SearchableSelect
              id="conversion-plan"
              value={selectedPlanPublicId || undefined}
              options={planOptions}
              placeholder="Select an active plan"
              searchPlaceholder="Search plans..."
              emptyText={
                plansQuery.isPending ? "Loading active plans..." : "No active plans found."
              }
              onValueChange={(value) => setSelectedPlanPublicId(value ?? "")}
              disabled={plansQuery.isPending || plans.length === 0 || isSubmitting}
            />
          </div>
        </div>

        {canConvertImmediately && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="conversion-template">Setup preset</Label>
              <Select value={templateKey} onValueChange={setTemplateKey} disabled={isSubmitting}>
                <SelectTrigger id="conversion-template" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Preset 1</SelectItem>
                  <SelectItem value="2">Preset 2</SelectItem>
                  <SelectItem value="3">Preset 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DateTimePicker
              id="conversion-trial-end"
              label="Trial end date (optional)"
              value={trialEndDate || undefined}
              onChange={(value) => setTrialEndDate(value ?? "")}
              boundary="to"
              disabled={isSubmitting}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {canRequest && (
            <Button
              leadingIcon={<Send size={13} />}
              disabled={!selectedPlanPublicId || isSubmitting}
              isLoading={pendingMutation.isPending}
              onClick={() => void submitPending()}
            >
              Submit for review
            </Button>
          )}
          {canConvertImmediately && (
            <Button
              intent="cta"
              disabled={!selectedPlanPublicId || isSubmitting || immediateRecoveryRequired}
              isLoading={immediateMutation.isPending}
              onClick={() => void submitImmediate()}
            >
              Convert immediately
            </Button>
          )}
        </div>

        {message && (
          <p className="text-sm text-[var(--color-text)]" role="status">
            {message}
          </p>
        )}
        {pendingRequest && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-warning)] bg-[var(--color-warning-soft)] p-3 text-sm">
            <p className="font-medium">Pending conversion request</p>
            <p className="mt-1 text-[var(--color-text-muted)]">
              {pendingRequest.plan.name} - {pendingRequest.publicId}
            </p>
            {canReview && (
              <p className="mt-1 text-[var(--color-text-muted)]">
                Reviewer recovery is available from the conversion review queue.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
