import { useNavigate, useParams } from "@tanstack/react-router";
import { HTTPError } from "ky";
import { ArrowLeft, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { readBackendErrorMessage, usePlans } from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import {
  type ApprovalInput,
  approvalInputSchema,
  type ConversionRequest,
  rejectionInputSchema,
  SETUP_STEP_TYPES,
  type SetupStepType,
  useApproveConversionRequest,
  useChangeConversionPlan,
  useConversionRequest,
  useRejectConversionRequest,
} from "../api/conversion-requests";

const STEP_LABEL: Record<SetupStepType, string> = {
  SET_COMPANY_PROFILE: "Company profile",
  SET_ROLES: "Roles",
  SET_JOBS: "Jobs",
  SET_BRANCHES: "Branches",
  SET_SHIFTS: "Shifts",
  SET_DEPARTMENTS: "Departments",
};

interface CustomStepDraft {
  stepType: SetupStepType;
  isRequired: boolean;
  sequence: string;
  dependencies: string;
}

function formatActor(actor: ConversionRequest["requester"] | null) {
  return actor ? `${actor.firstName} ${actor.lastName} (${actor.email})` : "Not recorded";
}

async function getErrorMessage(error: unknown) {
  if (error instanceof HTTPError) {
    return (await readBackendErrorMessage(error.response)) ?? "The request could not be updated.";
  }
  return error instanceof Error ? error.message : "The request could not be updated.";
}

function parseDependencies(value: string): SetupStepType[] | null {
  const dependencies: SetupStepType[] = [];
  for (const item of value
    .split(",")
    .map((dependency) => dependency.trim())
    .filter(Boolean)) {
    const supported = SETUP_STEP_TYPES.find((stepType) => stepType === item);
    if (!supported) return null;
    dependencies.push(supported);
  }
  return dependencies;
}

interface DetailsCardProps {
  request: ConversionRequest;
}

interface ProvisioningCardProps {
  request: ConversionRequest;
}

function DetailsCard({ request }: DetailsCardProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Lead and primary contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 text-sm">
          <div>
            <p className="text-[var(--color-text-faint)]">Company</p>
            <p>{request.lead.companyName ?? "Untitled lead"}</p>
          </div>
          <div>
            <p className="text-[var(--color-text-faint)]">Location</p>
            <p>
              {[request.lead.city, request.lead.country].filter(Boolean).join(", ") ||
                "Not provided"}
            </p>
          </div>
          <div>
            <p className="text-[var(--color-text-faint)]">Lead status</p>
            <p>{request.lead.status.toLowerCase().replace(/_/g, " ")}</p>
          </div>
          {request.primaryContact ? (
            <div>
              <p className="text-[var(--color-text-faint)]">Primary contact</p>
              <p>{request.primaryContact.name}</p>
              <p className="text-[var(--color-text-muted)]">
                {request.primaryContact.email}
                {request.primaryContact.phone ? ` - ${request.primaryContact.phone}` : ""}
              </p>
              <code className="text-[11px] text-[var(--color-text-faint)]">
                {request.primaryContact.publicId}
              </code>
            </div>
          ) : (
            <p className="text-[var(--color-danger)]">No active primary contact.</p>
          )}
          <code className="text-[11px] text-[var(--color-text-faint)]">
            Lead: {request.lead.publicId}
          </code>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Plan and actors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 text-sm">
          <div>
            <p className="text-[var(--color-text-faint)]">Selected plan</p>
            <p>
              {request.plan.name} - {request.plan.duration} days
            </p>
            <code className="text-[11px] text-[var(--color-text-faint)]">
              {request.plan.publicId}
            </code>
          </div>
          <div>
            <p className="text-[var(--color-text-faint)]">Requester</p>
            <p>{formatActor(request.requester)}</p>
            <code className="text-[11px] text-[var(--color-text-faint)]">
              {request.requester.publicId}
            </code>
          </div>
          <div>
            <p className="text-[var(--color-text-faint)]">Approved by</p>
            <p>{formatActor(request.approvedBy)}</p>
            {request.approvedBy && (
              <code className="text-[11px] text-[var(--color-text-faint)]">
                {request.approvedBy.publicId}
              </code>
            )}
          </div>
          <div>
            <p className="text-[var(--color-text-faint)]">Rejected by</p>
            <p>{formatActor(request.rejectedBy)}</p>
            {request.rejectedBy && (
              <code className="text-[11px] text-[var(--color-text-faint)]">
                {request.rejectedBy.publicId}
              </code>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProvisioningCard({ request }: ProvisioningCardProps) {
  if (!request.company && !request.ownerOnboardingDelivery) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Provisioning and onboarding delivery</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
            Provisioned company
          </p>
          {request.company ? (
            <>
              <p className="mt-1 text-sm">
                {request.company.name} ({request.company.companyCode})
              </p>
              <code className="text-[11px] text-[var(--color-text-faint)]">
                {request.company.publicId}
              </code>
            </>
          ) : (
            <p className="mt-1 text-sm">Not provisioned</p>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
            Invitation delivery
          </p>
          {request.ownerOnboardingDelivery ? (
            <>
              <Badge
                variant={
                  request.ownerOnboardingDelivery.status === "SUCCEEDED"
                    ? "success"
                    : request.ownerOnboardingDelivery.status === "EXHAUSTED"
                      ? "danger"
                      : "warning"
                }
              >
                {request.ownerOnboardingDelivery.status.toLowerCase().replace(/_/g, " ")}
              </Badge>
              <code className="block text-[11px] text-[var(--color-text-faint)]">
                {request.ownerOnboardingDelivery.publicId}
              </code>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                Attempts: {request.ownerOnboardingDelivery.attemptCount} /{" "}
                {request.ownerOnboardingDelivery.maxAttempts}
              </p>
              {request.ownerOnboardingDelivery.lastError && (
                <p className="mt-1 text-xs text-[var(--color-danger)]">
                  {request.ownerOnboardingDelivery.lastError}
                </p>
              )}
            </>
          ) : (
            <p className="mt-1 text-sm">No delivery record</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminConversionRequestDetailPage() {
  const { publicId } = useParams({ from: "/admin/conversion-requests/$publicId" });
  const navigate = useNavigate();
  const requestQuery = useConversionRequest(publicId);
  const plansQuery = usePlans({ isActive: true });
  const changePlan = useChangeConversionPlan();
  const approveRequest = useApproveConversionRequest();
  const rejectRequest = useRejectConversionRequest();
  const [selectedPlanPublicId, setSelectedPlanPublicId] = useState("");
  const [templateKey, setTemplateKey] = useState("1");
  const [trialEndDate, setTrialEndDate] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [customSteps, setCustomSteps] = useState<CustomStepDraft[]>([
    { stepType: "SET_COMPANY_PROFILE", isRequired: true, sequence: "1", dependencies: "" },
  ]);
  const [stepToAdd, setStepToAdd] = useState<SetupStepType>("SET_BRANCHES");
  const [message, setMessage] = useState("");
  const isDeciding = approveRequest.isPending || rejectRequest.isPending;
  const isMutating = isDeciding || changePlan.isPending;
  const request = requestQuery.data;

  function updateCustomStep(index: number, update: Partial<CustomStepDraft>) {
    setCustomSteps((current) =>
      current.map((step, stepIndex) => (stepIndex === index ? { ...step, ...update } : step)),
    );
  }

  function addCustomStep() {
    if (customSteps.some((step) => step.stepType === stepToAdd)) {
      setMessage("That setup step is already included.");
      return;
    }
    setCustomSteps((current) => [
      ...current,
      {
        stepType: stepToAdd,
        isRequired: false,
        sequence: String(current.length + 1),
        dependencies: "",
      },
    ]);
  }

  function buildApprovalInput(): ApprovalInput | null {
    let trialEnd: string | undefined;
    try {
      trialEnd = trialEndDate ? new Date(trialEndDate).toISOString() : undefined;
    } catch {
      setMessage("Trial end date must be a valid timezone-qualified instant.");
      return null;
    }
    if (templateKey !== "custom") {
      const numericTemplate = Number(templateKey);
      const result = approvalInputSchema.safeParse({
        templateKey: numericTemplate,
        ...(trialEnd ? { trialEndDate: trialEnd } : {}),
      });
      if (!result.success) {
        setMessage(result.error.issues[0]?.message ?? "Check the approval setup.");
        return null;
      }
      return result.data;
    }
    const setupSteps = customSteps.map((step) => ({
      stepType: step.stepType,
      isRequired: step.isRequired,
      sequence: Number(step.sequence),
      dependencies: parseDependencies(step.dependencies),
    }));
    if (setupSteps.some((step) => step.dependencies === null)) {
      setMessage(`Dependencies must use supported values: ${SETUP_STEP_TYPES.join(", ")}.`);
      return null;
    }
    const result = approvalInputSchema.safeParse({
      templateKey: -1,
      setupSteps,
      ...(trialEnd ? { trialEndDate: trialEnd } : {}),
    });
    if (!result.success) {
      setMessage(result.error.issues[0]?.message ?? "Check the custom setup.");
      return null;
    }
    return result.data;
  }

  async function savePlan() {
    if (!selectedPlanPublicId) return;
    setMessage("");
    try {
      await changePlan.mutateAsync({ publicId, planPublicId: selectedPlanPublicId });
      setMessage("Selected plan updated from authoritative request state.");
    } catch (error) {
      await requestQuery.refetch();
      setMessage(await getErrorMessage(error));
    }
  }

  async function approve() {
    const input = buildApprovalInput();
    if (!input) return;
    setMessage("");
    try {
      await approveRequest.mutateAsync({ publicId, input });
      setMessage("Conversion approved and company provisioning completed.");
    } catch (error) {
      await requestQuery.refetch();
      setMessage(`${await getErrorMessage(error)} The authoritative request state was reloaded.`);
    }
  }

  async function reject() {
    const input = rejectionInputSchema.safeParse({ reason: rejectionReason });
    if (!input.success) {
      setMessage(input.error.issues[0]?.message ?? "Rejection reason is required.");
      return;
    }
    setMessage("");
    try {
      await rejectRequest.mutateAsync({ publicId, reason: input.data.reason });
      setMessage("Conversion request rejected. The lead can be corrected and submitted again.");
    } catch (error) {
      await requestQuery.refetch();
      setMessage(`${await getErrorMessage(error)} The authoritative request state was reloaded.`);
    }
  }

  if (requestQuery.isPending)
    return (
      <Card>
        <EmptyState
          icon={RefreshCw}
          title="Loading request"
          description="Fetching current review state."
        />
      </Card>
    );
  if (requestQuery.isError || !request)
    return (
      <Card>
        <EmptyState
          icon={RefreshCw}
          title="Couldn't load request"
          description="It may have been removed or your reviewer access changed."
        />
      </Card>
    );
  const isPending = request.status === "PENDING";

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <Button
        intent="navigation"
        leadingIcon={<ArrowLeft size={14} />}
        onClick={() =>
          void navigate({
            to: "/admin/conversion-requests",
            search: { status: "PENDING", page: 1, pageSize: 10 },
          })
        }
      >
        Back to requests
      </Button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-bold text-[var(--color-text)]">Conversion request</h1>
            <Badge
              variant={
                request.status === "APPROVED"
                  ? "success"
                  : request.status === "REJECTED"
                    ? "danger"
                    : "warning"
              }
            >
              {request.status.toLowerCase()}
            </Badge>
          </div>
          <code className="text-xs text-[var(--color-text-muted)]">{request.publicId}</code>
        </div>
        <Button
          intent="utility"
          leadingIcon={<RefreshCw size={13} />}
          onClick={() => void requestQuery.refetch()}
          isLoading={requestQuery.isFetching}
        >
          Reload request
        </Button>
      </div>

      <DetailsCard request={request} />
      <ProvisioningCard request={request} />

      {isPending ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Correct request data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <p className="text-sm text-[var(--color-text-muted)]">
                Lead and contact corrections belong in the lead workflow. Return here and reload
                before deciding.
              </p>
              <Button
                intent="action"
                onClick={() =>
                  void navigate({
                    to: "/admin/leads/$publicId",
                    params: { publicId: request.lead.publicId },
                  })
                }
              >
                Correct lead or contact
              </Button>
              <div>
                <Label htmlFor="replacement-plan">Replacement plan</Label>
                <Select
                  value={selectedPlanPublicId || request.plan.publicId}
                  onValueChange={setSelectedPlanPublicId}
                  disabled={isMutating}
                >
                  <SelectTrigger id="replacement-plan" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(plansQuery.data?.data ?? [])
                      .filter((plan) => plan.isActive)
                      .map((plan) => (
                        <SelectItem key={plan.publicId} value={plan.publicId}>
                          {plan.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                intent="action"
                disabled={
                  !selectedPlanPublicId ||
                  selectedPlanPublicId === request.plan.publicId ||
                  isMutating
                }
                isLoading={changePlan.isPending}
                onClick={() => void savePlan()}
              >
                Update selected plan
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approval setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div>
                <Label htmlFor="approval-template">Setup selection</Label>
                <Select value={templateKey} onValueChange={setTemplateKey} disabled={isMutating}>
                  <SelectTrigger id="approval-template" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Preset 1</SelectItem>
                    <SelectItem value="2">Preset 2</SelectItem>
                    <SelectItem value="3">Preset 3</SelectItem>
                    <SelectItem value="custom">Custom setup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {templateKey === "custom" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Select
                      value={stepToAdd}
                      onValueChange={(value) => {
                        const step = SETUP_STEP_TYPES.find((item) => item === value);
                        if (step) setStepToAdd(step);
                      }}
                    >
                      <SelectTrigger aria-label="Setup step to add">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SETUP_STEP_TYPES.map((step) => (
                          <SelectItem key={step} value={step}>
                            {STEP_LABEL[step]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      intent="action"
                      leadingIcon={<Plus size={13} />}
                      onClick={addCustomStep}
                    >
                      Add step
                    </Button>
                  </div>
                  {customSteps.map((step, index) => (
                    <div
                      key={step.stepType}
                      className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 sm:grid-cols-[1fr_110px_1fr_auto]"
                    >
                      <div>
                        <p className="text-sm font-medium">{STEP_LABEL[step.stepType]}</p>
                        <label className="mt-2 flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={step.isRequired}
                            onChange={(event) =>
                              updateCustomStep(index, { isRequired: event.target.checked })
                            }
                          />
                          Required
                        </label>
                      </div>
                      <div>
                        <Label htmlFor={`sequence-${step.stepType}`}>Sequence</Label>
                        <Input
                          id={`sequence-${step.stepType}`}
                          type="number"
                          min="1"
                          value={step.sequence}
                          onChange={(event) =>
                            updateCustomStep(index, { sequence: event.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor={`dependencies-${step.stepType}`}>Dependencies</Label>
                        <Input
                          id={`dependencies-${step.stepType}`}
                          placeholder="SET_COMPANY_PROFILE"
                          value={step.dependencies}
                          onChange={(event) =>
                            updateCustomStep(index, { dependencies: event.target.value })
                          }
                        />
                      </div>
                      <Button
                        intent="utility"
                        aria-label={`Remove ${STEP_LABEL[step.stepType]}`}
                        onClick={() =>
                          setCustomSteps((current) =>
                            current.filter((item) => item.stepType !== step.stepType),
                          )
                        }
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <Label htmlFor="approval-trial-end">Trial end date (optional)</Label>
                <Input
                  id="approval-trial-end"
                  type="datetime-local"
                  value={trialEndDate}
                  onChange={(event) => setTrialEndDate(event.target.value)}
                  disabled={isMutating}
                />
              </div>
              <Button
                intent="cta"
                disabled={isMutating}
                isLoading={approveRequest.isPending}
                onClick={() => void approve()}
              >
                Approve and provision
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reject request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              <div>
                <Label htmlFor="rejection-reason">Rejection reason</Label>
                <Textarea
                  id="rejection-reason"
                  maxLength={1000}
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  disabled={isMutating}
                />
              </div>
              <Button
                intent="destructive"
                disabled={isMutating}
                isLoading={rejectRequest.isPending}
                onClick={() => void reject()}
              >
                Reject request
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-4">
            <p className="font-medium">This request is terminal and cannot be changed.</p>
            {request.rejectionReason && (
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Reason: {request.rejectionReason}
              </p>
            )}
          </CardContent>
        </Card>
      )}

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
