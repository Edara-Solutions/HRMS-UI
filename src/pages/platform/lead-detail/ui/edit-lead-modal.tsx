import { zodResolver } from "@hookform/resolvers/zod";
import { HTTPError } from "ky";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { readBackendErrorMessage } from "@/shared/api";
import { asZodEnumValues } from "@/shared/lib/zod-enum";
import { Button } from "@/shared/ui/button";
import { CountrySelect } from "@/shared/ui/country-select";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { Form } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { StateSelect } from "@/shared/ui/state-select";
import type { Lead, LeadStatus, UpdateLeadInput } from "../api/lead-detail";
import { useUpdateLead } from "../api/lead-detail";
import {
  ALL_LOST_REASONS,
  ALL_SIZES,
  ALL_SOURCES,
  EDITABLE_STATUSES,
  LOST_REASON_LABEL,
  SIZE_LABEL,
  SOURCE_LABEL,
  STATUS_BADGE,
} from "../api/lead-labels";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

type ClientLeadStatus = NonNullable<UpdateLeadInput["status"]>;

const statusTransitions: Record<LeadStatus, ClientLeadStatus[]> = {
  NEW: ["CONTACTED", "WRONG_NUMBER", "NO_ANSWER", "FOLLOWING_UP"],
  REJOINED: ["CONTACTED", "WRONG_NUMBER", "NO_ANSWER", "FOLLOWING_UP"],
  WRONG_NUMBER: ["CONTACTED", "LOST"],
  NO_ANSWER: ["FOLLOWING_UP", "LOST"],
  FOLLOWING_UP: ["CONTACTED", "LOST"],
  CONTACTED: ["QUALIFIED", "NOT_QUALIFIED", "NOT_INTERESTED", "DEMO_SCHEDULED", "LOST"],
  QUALIFIED: ["DEMO_SCHEDULED", "TRIAL_STARTED", "NEGOTIATION", "LOST"],
  NOT_QUALIFIED: ["LOST"],
  NOT_INTERESTED: ["LOST"],
  DEMO_SCHEDULED: ["WAITING_QUOTATION", "TRIAL_STARTED", "LOST"],
  WAITING_QUOTATION: ["QUOTATION_SENT", "NEGOTIATION", "LOST"],
  QUOTATION_SENT: ["NEGOTIATION", "LOST"],
  TRIAL_STARTED: ["NEGOTIATION", "LOST"],
  NEGOTIATION: ["LOST"],
  WON_CONVERTED: [],
  LOST: [],
};

function isClientLeadStatus(status: LeadStatus): status is ClientLeadStatus {
  return status !== "REJOINED" && status !== "WON_CONVERTED";
}

const CLIENT_EDITABLE_STATUSES = EDITABLE_STATUSES.filter(isClientLeadStatus);

function getEditableStatusOptions(leadStatus: LeadStatus): ClientLeadStatus[] {
  const currentStatus = isClientLeadStatus(leadStatus) ? leadStatus : "NEW";
  return Array.from(new Set([currentStatus, ...statusTransitions[leadStatus]]));
}

async function readUpdateErrorMessage(error: unknown): Promise<string> {
  if (error instanceof HTTPError) {
    const backendMessage = await readBackendErrorMessage(error.response);
    if (backendMessage) return backendMessage;
  }
  return GENERIC_ERROR_MESSAGE;
}

const editLeadFormSchema = z
  .object({
    companyName: z.string().optional(),
    website: z.string().optional(),
    industry: z.string().optional(),
    companySizeRange: z.enum(asZodEnumValues(ALL_SIZES)),
    country: z.string().optional(),
    city: z.string().optional(),
    source: z.enum(asZodEnumValues(ALL_SOURCES)),
    status: z.enum(asZodEnumValues(CLIENT_EDITABLE_STATUSES)),
    lostReason: z.union([z.enum(asZodEnumValues(ALL_LOST_REASONS)), z.literal("")]),
  })
  .refine((data) => data.status !== "LOST" || data.lostReason !== "", {
    message: "Lost reason is required when status is Lost",
    path: ["lostReason"],
  });

type EditLeadFormData = z.infer<typeof editLeadFormSchema>;

interface EditLeadModalProps {
  lead: Lead | null;
  onClose: () => void;
}

export function EditLeadModal({ lead, onClose }: EditLeadModalProps) {
  const { titleId, descriptionId } = useDialogIds();

  return (
    <Dialog
      open={lead !== null}
      onClose={onClose}
      titleId={titleId}
      descriptionId={descriptionId}
      className="max-w-lg"
    >
      {lead && (
        <EditLeadModalContent
          key={lead.publicId}
          lead={lead}
          onClose={onClose}
          titleId={titleId}
          descriptionId={descriptionId}
        />
      )}
    </Dialog>
  );
}

interface EditLeadModalContentProps {
  lead: Lead;
  onClose: () => void;
  titleId: string;
  descriptionId: string;
}

function EditLeadModalContent({
  lead,
  onClose,
  titleId,
  descriptionId,
}: EditLeadModalContentProps) {
  const updateLead = useUpdateLead();
  const editableStatusOptions = getEditableStatusOptions(lead.status);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    setValue,
    formState: { errors },
  } = useForm<EditLeadFormData>({
    resolver: zodResolver(editLeadFormSchema),
    defaultValues: {
      companyName: lead.companyName ?? "",
      website: lead.website ?? "",
      industry: lead.industry ?? "",
      companySizeRange: lead.companySizeRange,
      country: lead.country ?? "",
      city: lead.city ?? "",
      source: lead.source,
      status: isClientLeadStatus(lead.status) ? lead.status : "NEW",
      lostReason: lead.lostReason ?? "",
    },
  });

  const status = watch("status");
  const selectedCountry = watch("country");

  async function onSubmit(data: EditLeadFormData) {
    try {
      await updateLead.mutateAsync({
        publicId: lead.publicId,
        input: {
          companyName: data.companyName || undefined,
          website: data.website || undefined,
          industry: data.industry || undefined,
          companySizeRange: data.companySizeRange,
          country: data.country || undefined,
          city: data.city || undefined,
          source: data.source,
          status: data.status,
          lostReason: data.status === "LOST" ? data.lostReason || undefined : undefined,
        },
      });
      onClose();
    } catch (error) {
      setError("root", { message: await readUpdateErrorMessage(error) });
    }
  }

  return (
    <div>
      <DialogTitle id={titleId}>Edit lead</DialogTitle>
      <DialogDescription id={descriptionId}>
        Update this lead's profile, pipeline status, and lost reason.
      </DialogDescription>

      <Form onSubmit={handleSubmit(onSubmit)} className="mt-6">
        {errors.root?.message && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {errors.root.message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-lead-company-name">Company name</Label>
            <Input id="edit-lead-company-name" {...register("companyName")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-lead-country">Country</Label>
            <Controller
              control={control}
              name="country"
              render={({ field }) => (
                <CountrySelect
                  value={field.value ?? ""}
                  onValueChange={(nextCountry) => {
                    field.onChange(nextCountry);
                    setValue("city", "");
                  }}
                  id="edit-lead-country"
                  ref={field.ref}
                  onBlur={field.onBlur}
                />
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-lead-city">State</Label>
            <Controller
              control={control}
              name="city"
              render={({ field }) => (
                <StateSelect
                  country={selectedCountry ?? ""}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  id="edit-lead-city"
                  ref={field.ref}
                  onBlur={field.onBlur}
                />
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-lead-industry">Industry</Label>
            <Input id="edit-lead-industry" {...register("industry")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-lead-website">Website</Label>
            <Input id="edit-lead-website" {...register("website")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-lead-size">Company size</Label>
            <Controller
              control={control}
              name="companySizeRange"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="edit-lead-size" ref={field.ref} onBlur={field.onBlur}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {SIZE_LABEL[size]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-lead-source">Source</Label>
            <Controller
              control={control}
              name="source"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="edit-lead-source" ref={field.ref} onBlur={field.onBlur}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_SOURCES.map((source) => (
                      <SelectItem key={source} value={source}>
                        {SOURCE_LABEL[source]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-lead-status">Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="edit-lead-status" ref={field.ref} onBlur={field.onBlur}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {editableStatusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_BADGE[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        {status === "LOST" && (
          <div className="space-y-1.5">
            <Label htmlFor="edit-lead-lost-reason">Lost reason</Label>
            <Controller
              control={control}
              name="lostReason"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="edit-lead-lost-reason"
                    ref={field.ref}
                    onBlur={field.onBlur}
                    aria-invalid={!!errors.lostReason}
                  >
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_LOST_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {LOST_REASON_LABEL[reason]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.lostReason && (
              <p className="text-xs text-[var(--color-danger)]">{errors.lostReason.message}</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button intent="dismissive" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            intent="cta"
            type="submit"
            disabled={updateLead.isPending}
            isLoading={updateLead.isPending}
          >
            Save changes
          </Button>
        </div>
      </Form>
    </div>
  );
}
