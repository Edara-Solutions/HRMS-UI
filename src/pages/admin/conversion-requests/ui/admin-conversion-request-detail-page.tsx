import { useNavigate, useParams } from "@tanstack/react-router";
import { HTTPError } from "ky";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { readBackendErrorMessage, usePlans } from "@/shared/api";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageTabs } from "@/shared/ui/page-tabs";
import {
  type ApprovalInput,
  approvalInputSchema,
  rejectionInputSchema,
  SETUP_STEP_TYPES,
  type SetupStepType,
  useApproveConversionRequest,
  useChangeConversionPlan,
  useConversionRequest,
  useOnboardingDelivery,
  useRejectConversionRequest,
  useRetryOnboardingDelivery,
} from "../api/conversion-requests";
import {
  type CustomStepDraft,
  parseSetupStepDependencies,
} from "../model/conversion-request-review";
import { ConversionRequestApprovalSetupCard } from "./conversion-request-approval-setup-card";
import { ConversionRequestCorrectionsCard } from "./conversion-request-corrections-card";
import { ConversionRequestDetailsCard } from "./conversion-request-details-card";
import { ConversionRequestHeader } from "./conversion-request-header";
import { ConversionRequestProvisioningCard } from "./conversion-request-provisioning-card";
import { ConversionRequestRejectCard } from "./conversion-request-reject-card";
import { ConversionRequestTerminalCard } from "./conversion-request-terminal-card";

type ConversionRequestDetailTab = "details" | "correct" | "actions";

const CONVERSION_REQUEST_DETAIL_TABS: Array<{ value: ConversionRequestDetailTab; label: string }> =
  [
    { value: "details", label: "Details" },
    { value: "correct", label: "Correct" },
    { value: "actions", label: "Actions" },
  ];

async function getErrorMessage(error: unknown) {
  if (error instanceof HTTPError) {
    return (await readBackendErrorMessage(error.response)) ?? "The request could not be updated.";
  }
  return error instanceof Error ? error.message : "The request could not be updated.";
}

export function AdminConversionRequestDetailPage() {
  const { publicId } = useParams({ from: "/admin/conversion-requests/$publicId" });
  const navigate = useNavigate();
  const requestQuery = useConversionRequest(publicId);
  const plansQuery = usePlans({ isActive: true });
  const changePlan = useChangeConversionPlan();
  const approveRequest = useApproveConversionRequest();
  const rejectRequest = useRejectConversionRequest();
  const retryDelivery = useRetryOnboardingDelivery();
  const [selectedPlanPublicId, setSelectedPlanPublicId] = useState("");
  const [templateKey, setTemplateKey] = useState("1");
  const [trialEndDate, setTrialEndDate] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [customSteps, setCustomSteps] = useState<CustomStepDraft[]>([
    { stepType: "SET_COMPANY_PROFILE", isRequired: true, sequence: "1", dependencies: "" },
  ]);
  const [stepToAdd, setStepToAdd] = useState<SetupStepType>("SET_BRANCHES");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<ConversionRequestDetailTab>("details");
  const isDeciding = approveRequest.isPending || rejectRequest.isPending;
  const isMutating = isDeciding || changePlan.isPending || retryDelivery.isPending;
  const request = requestQuery.data;
  const deliveryQuery = useOnboardingDelivery(publicId, request?.status === "APPROVED");
  const delivery = deliveryQuery.data ?? request?.ownerOnboardingDelivery ?? null;

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
      const result = approvalInputSchema.safeParse({
        templateKey: Number(templateKey),
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
      dependencies: parseSetupStepDependencies(step.dependencies),
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

  async function retryOnboardingDelivery() {
    setMessage("");
    try {
      await retryDelivery.mutateAsync({ publicId });
      setMessage("Delivery retry requested without reprovisioning the company.");
    } catch (error) {
      await deliveryQuery.refetch();
      await requestQuery.refetch();
      setMessage(`${await getErrorMessage(error)} The delivery state was reloaded.`);
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

  if (requestQuery.isPending) {
    return (
      <Card>
        <EmptyState
          icon={RefreshCw}
          title="Loading request"
          description="Fetching current review state."
        />
      </Card>
    );
  }
  if (requestQuery.isError || !request) {
    return (
      <Card>
        <EmptyState
          icon={RefreshCw}
          title="Couldn't load request"
          description="It may have been removed or your reviewer access changed."
        />
      </Card>
    );
  }

  const planOptions = (plansQuery.data?.data ?? [])
    .filter((plan) => plan.isActive)
    .map((plan) => ({ value: plan.publicId, label: plan.name }));

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <ConversionRequestHeader
        request={request}
        isReloading={requestQuery.isFetching}
        onBack={() =>
          void navigate({
            to: "/admin/conversion-requests",
            search: { status: "PENDING", page: 1, pageSize: 10 },
          })
        }
        onReload={() => void requestQuery.refetch()}
      />
      <PageTabs
        items={CONVERSION_REQUEST_DETAIL_TABS}
        value={activeTab}
        onValueChange={setActiveTab}
        ariaLabel="Conversion request sections"
      />

      {activeTab === "details" && (
        <div className="space-y-5">
          <ConversionRequestDetailsCard request={request} />
          <ConversionRequestProvisioningCard
            request={request}
            delivery={delivery}
            isDeliveryLoading={deliveryQuery.isFetching}
            isRetryingDelivery={retryDelivery.isPending}
            hasDeliveryLoadError={deliveryQuery.isError}
            onReloadDelivery={() => void deliveryQuery.refetch()}
            onRetryDelivery={() => void retryOnboardingDelivery()}
          />
        </div>
      )}

      {activeTab === "correct" &&
        (request.status === "PENDING" ? (
          <ConversionRequestCorrectionsCard
            request={request}
            planOptions={planOptions}
            selectedPlanPublicId={selectedPlanPublicId}
            isMutating={isMutating}
            isChangingPlan={changePlan.isPending}
            onCorrectLead={() =>
              void navigate({
                to: "/admin/leads/$publicId",
                params: { publicId: request.lead.publicId },
              })
            }
            onPlanChange={setSelectedPlanPublicId}
            onSavePlan={() => void savePlan()}
          />
        ) : (
          <ConversionRequestTerminalCard rejectionReason={request.rejectionReason} />
        ))}

      {activeTab === "actions" &&
        (request.status === "PENDING" ? (
          <div className="grid gap-5 xl:grid-cols-2">
            <ConversionRequestApprovalSetupCard
              templateKey={templateKey}
              stepToAdd={stepToAdd}
              customSteps={customSteps}
              trialEndDate={trialEndDate}
              isMutating={isMutating}
              isApproving={approveRequest.isPending}
              onTemplateChange={setTemplateKey}
              onStepToAddChange={setStepToAdd}
              onAddStep={addCustomStep}
              onUpdateStep={updateCustomStep}
              onRemoveStep={(stepType) =>
                setCustomSteps((current) => current.filter((item) => item.stepType !== stepType))
              }
              onTrialEndDateChange={setTrialEndDate}
              onApprove={() => void approve()}
            />
            <ConversionRequestRejectCard
              rejectionReason={rejectionReason}
              isMutating={isMutating}
              isRejecting={rejectRequest.isPending}
              onReasonChange={setRejectionReason}
              onReject={() => void reject()}
            />
          </div>
        ) : (
          <ConversionRequestTerminalCard rejectionReason={request.rejectionReason} />
        ))}
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
