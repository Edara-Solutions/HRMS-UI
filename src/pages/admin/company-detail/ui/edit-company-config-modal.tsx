import { zodResolver } from "@hookform/resolvers/zod";
import { HTTPError } from "ky";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { usePlans } from "@/shared/api";
import { readBackendErrorMessage } from "@/shared/api";
import { asZodEnumValues } from "@/shared/lib/zod-enum";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { Form } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import type { CompanyConfig } from "../api/company-detail";
import { useUpdateCompanyConfig } from "../api/company-detail";
import {
  ALL_SUBSCRIPTION_STATUSES,
  SITE_STATUS_FLAG_LABEL,
  SUBSCRIPTION_STATUS_BADGE,
} from "../api/company-labels";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

async function readUpdateErrorMessage(error: unknown): Promise<string> {
  if (error instanceof HTTPError) {
    const backendMessage = await readBackendErrorMessage(error.response);
    if (backendMessage) return backendMessage;
  }
  return GENERIC_ERROR_MESSAGE;
}

function toDateInputValue(value: string | null): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function toIsoDateTime(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

const siteStatusFlagKeys = Object.keys(SITE_STATUS_FLAG_LABEL) as Array<
  keyof typeof SITE_STATUS_FLAG_LABEL
>;

const editCompanyConfigFormSchema = z.object({
  planPublicId: z.string().min(1, "Plan is required"),
  subscriptionStatus: z.enum(asZodEnumValues(ALL_SUBSCRIPTION_STATUSES)),
  subscriptionStartDate: z.string(),
  subscriptionEndDate: z.string(),
  trialEndDate: z.string(),
  subscriptionNotes: z.string(),
  isFrozen: z.boolean(),
  isReadOnly: z.boolean(),
  isBlocked: z.boolean(),
  isUnderMaintenance: z.boolean(),
  siteStatusNote: z.string(),
});

type EditCompanyConfigFormData = z.infer<typeof editCompanyConfigFormSchema>;

interface EditCompanyConfigModalProps {
  config: CompanyConfig | null;
  onClose: () => void;
}

export function EditCompanyConfigModal({ config, onClose }: EditCompanyConfigModalProps) {
  const { titleId, descriptionId } = useDialogIds();

  return (
    <Dialog
      open={config !== null}
      onClose={onClose}
      titleId={titleId}
      descriptionId={descriptionId}
      className="max-h-[90vh] max-w-lg overflow-y-auto"
    >
      {config && (
        <EditCompanyConfigModalContent
          key={config.public_id}
          config={config}
          onClose={onClose}
          titleId={titleId}
          descriptionId={descriptionId}
        />
      )}
    </Dialog>
  );
}

interface EditCompanyConfigModalContentProps {
  config: CompanyConfig;
  onClose: () => void;
  titleId: string;
  descriptionId: string;
}

function EditCompanyConfigModalContent({
  config,
  onClose,
  titleId,
  descriptionId,
}: EditCompanyConfigModalContentProps) {
  const updateConfig = useUpdateCompanyConfig();
  const plansQuery = usePlans({ isActive: true });
  const plans = plansQuery.data?.data ?? [];

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EditCompanyConfigFormData>({
    resolver: zodResolver(editCompanyConfigFormSchema),
    defaultValues: {
      planPublicId: config.plan?.publicId ?? "",
      subscriptionStatus: config.subscriptionStatus,
      subscriptionStartDate: toDateInputValue(config.subscriptionStartDate),
      subscriptionEndDate: toDateInputValue(config.subscriptionEndDate),
      trialEndDate: toDateInputValue(config.trialEndDate),
      subscriptionNotes: config.subscriptionNotes ?? "",
      isFrozen: config.siteStatus.isFrozen,
      isReadOnly: config.siteStatus.isReadOnly,
      isBlocked: config.siteStatus.isBlocked,
      isUnderMaintenance: config.siteStatus.isUnderMaintenance,
      siteStatusNote: config.siteStatus.note ?? "",
    },
  });

  async function onSubmit(data: EditCompanyConfigFormData) {
    try {
      await updateConfig.mutateAsync({
        publicId: config.public_id,
        input: {
          planPublicId: data.planPublicId,
          subscriptionStatus: data.subscriptionStatus,
          subscriptionStartDate: toIsoDateTime(data.subscriptionStartDate),
          subscriptionEndDate: toIsoDateTime(data.subscriptionEndDate),
          trialEndDate: toIsoDateTime(data.trialEndDate),
          subscriptionNotes: data.subscriptionNotes || null,
          siteStatus: {
            isFrozen: data.isFrozen,
            isReadOnly: data.isReadOnly,
            isBlocked: data.isBlocked,
            isUnderMaintenance: data.isUnderMaintenance,
            note: data.siteStatusNote || null,
          },
        },
      });
      onClose();
    } catch (error) {
      setError("root", { message: await readUpdateErrorMessage(error) });
    }
  }

  return (
    <div>
      <DialogTitle id={titleId}>Edit subscription</DialogTitle>
      <DialogDescription id={descriptionId}>
        Change the plan, subscription status, dates, and site access for this company.
      </DialogDescription>

      <Form onSubmit={handleSubmit(onSubmit)} className="mt-6">
        {errors.root?.message && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {errors.root.message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-config-plan">Plan</Label>
            <Controller
              control={control}
              name="planPublicId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="edit-config-plan"
                    ref={field.ref}
                    onBlur={field.onBlur}
                    aria-invalid={!!errors.planPublicId}
                  >
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.publicId} value={plan.publicId}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.planPublicId && (
              <p className="text-xs text-[var(--color-danger)]">{errors.planPublicId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-config-status">Subscription status</Label>
            <Controller
              control={control}
              name="subscriptionStatus"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="edit-config-status" ref={field.ref} onBlur={field.onBlur}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_SUBSCRIPTION_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {SUBSCRIPTION_STATUS_BADGE[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-config-trial-end">Trial ends</Label>
            <Input id="edit-config-trial-end" type="date" {...register("trialEndDate")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-config-sub-start">Subscription starts</Label>
            <Input id="edit-config-sub-start" type="date" {...register("subscriptionStartDate")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-config-sub-end">Subscription ends</Label>
            <Input id="edit-config-sub-end" type="date" {...register("subscriptionEndDate")} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-config-notes">Notes</Label>
          <Textarea id="edit-config-notes" rows={2} {...register("subscriptionNotes")} />
        </div>

        <div className="border-t border-[var(--color-border)] pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Site access
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {siteStatusFlagKeys.map((key) => (
              <Controller
                key={key}
                control={control}
                name={key}
                render={({ field }) => (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    pressed={field.value}
                    onClick={() => field.onChange(!field.value)}
                  >
                    {SITE_STATUS_FLAG_LABEL[key]}
                  </Button>
                )}
              />
            ))}
          </div>

          <div className="mt-3 space-y-1.5">
            <Label htmlFor="edit-config-site-note">Site status note</Label>
            <Input id="edit-config-site-note" {...register("siteStatusNote")} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button intent="dismissive" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            intent="cta"
            type="submit"
            disabled={updateConfig.isPending}
            isLoading={updateConfig.isPending}
          >
            Save changes
          </Button>
        </div>
      </Form>
    </div>
  );
}

