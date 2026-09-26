import { zodResolver } from "@hookform/resolvers/zod";
import { HTTPError } from "ky";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ALL_KNOWN_PLAN_FEATURES,
  type CreatePlanInput,
  type KnownPlanFeature,
  type Plan,
  readBackendErrorMessage,
  useCreatePlan,
  useUpdatePlan,
} from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { Form } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { getFeatureLabel, getPlanUnknownFeatures, isSystemDefaultPlan } from "../api/plan-labels";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

const optionalNonNegativeIntegerSchema = z.string().refine((value) => {
  const trimmed = value.trim();
  if (!trimmed) return true;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= 0;
}, "Use a non-negative integer");

const planFormSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required").max(255, "Plan name is too long"),
  description: z.string().max(2000, "Description is too long"),
  duration: z.coerce.number().int().positive("Duration must be a positive integer"),
  isPublic: z.boolean(),
  isActive: z.boolean(),
  features: z.array(z.enum(ALL_KNOWN_PLAN_FEATURES)).min(1, "Select at least one feature"),
  maxUsers: optionalNonNegativeIntegerSchema,
  maxDepartments: optionalNonNegativeIntegerSchema,
  maxPositions: optionalNonNegativeIntegerSchema,
});

type PlanFormData = z.infer<typeof planFormSchema>;

interface PlanFormDialogProps {
  plan: Plan | null;
  open: boolean;
  onClose: () => void;
}

async function readPlanErrorMessage(error: unknown): Promise<string> {
  if (error instanceof HTTPError) {
    const backendMessage = await readBackendErrorMessage(error.response);
    if (backendMessage) return backendMessage;
  }
  return GENERIC_ERROR_MESSAGE;
}

function formatLimitValue(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

function parseOptionalLimit(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return Number(trimmed);
}

function buildLimits(data: PlanFormData) {
  const limits = {
    MAX_USERS: parseOptionalLimit(data.maxUsers),
    MAX_DEPARTMENTS: parseOptionalLimit(data.maxDepartments),
    MAX_POSITIONS: parseOptionalLimit(data.maxPositions),
  };

  return Object.values(limits).some((value) => value !== undefined) ? limits : {};
}

function getDefaultValues(plan: Plan | null): PlanFormData {
  const knownFeatures = plan?.features.filter((feature): feature is KnownPlanFeature =>
    ALL_KNOWN_PLAN_FEATURES.includes(feature as KnownPlanFeature),
  ) ?? ["OVERVIEW"];

  return {
    name: plan?.name ?? "",
    description: plan?.description ?? "",
    duration: plan?.duration ?? 30,
    isPublic: plan?.isPublic ?? true,
    isActive: plan?.isActive ?? true,
    features: knownFeatures,
    maxUsers: formatLimitValue(plan?.limits?.MAX_USERS),
    maxDepartments: formatLimitValue(plan?.limits?.MAX_DEPARTMENTS),
    maxPositions: formatLimitValue(plan?.limits?.MAX_POSITIONS),
  };
}

export function PlanFormDialog({ plan, open, onClose }: PlanFormDialogProps) {
  const { titleId, descriptionId } = useDialogIds();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      descriptionId={descriptionId}
      className="max-h-[90vh] max-w-2xl overflow-y-auto"
    >
      {open && (
        <PlanFormDialogContent
          key={plan?.publicId ?? "new-plan"}
          plan={plan}
          onClose={onClose}
          titleId={titleId}
          descriptionId={descriptionId}
        />
      )}
    </Dialog>
  );
}

interface PlanFormDialogContentProps {
  plan: Plan | null;
  onClose: () => void;
  titleId: string;
  descriptionId: string;
}

function PlanFormDialogContent({
  plan,
  onClose,
  titleId,
  descriptionId,
}: PlanFormDialogContentProps) {
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const isEditing = plan !== null;
  const isSystemPlan = plan ? isSystemDefaultPlan(plan) : false;
  const unknownFeatures = plan ? getPlanUnknownFeatures(plan) : [];

  const {
    handleSubmit,
    register,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PlanFormData>({
    resolver: zodResolver(planFormSchema),
    defaultValues: getDefaultValues(plan),
  });

  const selectedFeatures = watch("features");
  const isPublic = watch("isPublic");
  const isActive = watch("isActive");
  const isPending = createPlan.isPending || updatePlan.isPending;

  function toggleFeature(feature: KnownPlanFeature) {
    const nextFeatures = selectedFeatures.includes(feature)
      ? selectedFeatures.filter((item) => item !== feature)
      : [...selectedFeatures, feature];
    setValue("features", nextFeatures, { shouldValidate: true, shouldDirty: true });
  }

  function setVisibility(nextValue: boolean) {
    setValue("isPublic", nextValue, { shouldDirty: true });
  }

  function setActivity(nextValue: boolean) {
    setValue("isActive", nextValue, { shouldDirty: true });
  }

  async function onSubmit(data: PlanFormData) {
    const baseInput: CreatePlanInput = {
      name: data.name,
      description: data.description.trim() || null,
      duration: data.duration,
      isPublic: data.isPublic,
      isActive: data.isActive,
      features: [...data.features, ...unknownFeatures],
      limits: buildLimits(data),
    };

    try {
      if (!plan) {
        await createPlan.mutateAsync(baseInput);
      } else {
        await updatePlan.mutateAsync({
          publicId: plan.publicId,
          input: {
            description: baseInput.description,
            features: baseInput.features,
            isActive: baseInput.isActive,
            limits: baseInput.limits,
            ...(isSystemPlan ? {} : { name: baseInput.name, isPublic: baseInput.isPublic }),
          },
        });
      }
      onClose();
    } catch (error) {
      setError("root", { message: await readPlanErrorMessage(error) });
    }
  }

  return (
    <div>
      <DialogTitle id={titleId}>{plan ? `Edit ${plan.name}` : "Create plan"}</DialogTitle>
      <DialogDescription id={descriptionId}>
        {plan
          ? "Update plan details and keep duration read-only until the backend update contract supports it."
          : "Create a plan with features, limits, visibility, and activity settings."}
      </DialogDescription>

      <Form onSubmit={handleSubmit(onSubmit)} className="mt-6">
        {errors.root?.message && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {errors.root.message}
          </div>
        )}

        {isSystemPlan && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
            This is the system default plan used by company conversion. Its name and public
            visibility are locked.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2">
          <div className="space-y-1.5 min-[560px]:col-span-2">
            <Label htmlFor="plan-name">Plan name</Label>
            <Input
              id="plan-name"
              aria-invalid={!!errors.name}
              disabled={isSystemPlan}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-[var(--color-danger)]">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5 min-[560px]:col-span-2">
            <Label htmlFor="plan-description">Description</Label>
            <Textarea
              id="plan-description"
              rows={3}
              aria-invalid={!!errors.description}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-[var(--color-danger)]">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="plan-duration">Duration (days)</Label>
            <Input
              id="plan-duration"
              type="number"
              min={1}
              aria-invalid={!!errors.duration}
              readOnly={isEditing}
              {...register("duration")}
            />
            <p className="text-xs text-[var(--color-text-faint)]">
              {isEditing
                ? "Read-only for now because plan duration updates are not applied by the backend yet."
                : "Used when the plan is first created."}
            </p>
            {errors.duration && (
              <p className="text-xs text-[var(--color-danger)]">{errors.duration.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--color-text)]">Features</p>
          <div className="flex flex-wrap gap-2">
            {ALL_KNOWN_PLAN_FEATURES.map((feature) => (
              <Button
                key={feature}
                type="button"
                variant="ghost"
                size="sm"
                pressed={selectedFeatures.includes(feature)}
                onClick={() => toggleFeature(feature)}
              >
                {getFeatureLabel(feature)}
              </Button>
            ))}
          </div>
          {unknownFeatures.length > 0 && (
            <p className="text-xs text-[var(--color-text-faint)]">
              Preserving backend-only features: {unknownFeatures.join(", ")}
            </p>
          )}
          {errors.features && (
            <p className="text-xs text-[var(--color-danger)]">{errors.features.message}</p>
          )}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--color-text)]">Limits</p>
          <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="plan-max-users">Max users</Label>
              <Input
                id="plan-max-users"
                type="number"
                min={0}
                inputMode="numeric"
                {...register("maxUsers")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-max-departments">Max departments</Label>
              <Input
                id="plan-max-departments"
                type="number"
                min={0}
                inputMode="numeric"
                {...register("maxDepartments")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan-max-positions">Max positions</Label>
              <Input
                id="plan-max-positions"
                type="number"
                min={0}
                inputMode="numeric"
                {...register("maxPositions")}
              />
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-faint)]">
            Leave a limit blank when the plan should not define that limit.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-text)]">Visibility</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                pressed={isPublic}
                disabled={isSystemPlan}
                onClick={() => setVisibility(true)}
              >
                Public
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                pressed={!isPublic}
                disabled={isSystemPlan}
                onClick={() => setVisibility(false)}
              >
                Private
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--color-text)]">Status</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                pressed={isActive}
                onClick={() => setActivity(true)}
              >
                Active
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                pressed={!isActive}
                onClick={() => setActivity(false)}
              >
                Inactive
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button intent="dismissive" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button intent="cta" type="submit" disabled={isPending} isLoading={isPending}>
            {plan ? "Save changes" : "Create plan"}
          </Button>
        </div>
      </Form>
    </div>
  );
}
