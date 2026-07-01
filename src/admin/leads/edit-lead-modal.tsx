import { zodResolver } from "@hookform/resolvers/zod";
import { HTTPError } from "ky";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { readBackendErrorMessage } from "@/api/error-mapper";
import { asZodEnumValues } from "@/shared/lib/zod-enum";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { Form } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select } from "@/shared/ui/select";
import type { Lead } from "./api";
import { useUpdateLead } from "./api";
import {
  ALL_LOST_REASONS,
  ALL_SIZES,
  ALL_SOURCES,
  EDITABLE_STATUSES,
  LOST_REASON_LABEL,
  SIZE_LABEL,
  SOURCE_LABEL,
  STATUS_BADGE,
} from "./labels";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

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
    status: z.enum(asZodEnumValues(EDITABLE_STATUSES)),
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

  const {
    register,
    handleSubmit,
    watch,
    setError,
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
      status: lead.status === "REJOINED" ? "NEW" : lead.status,
      lostReason: lead.lostReason ?? "",
    },
  });

  const status = watch("status");

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
          allowStatusOverride: true,
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
            <Input id="edit-lead-country" {...register("country")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-lead-city">City</Label>
            <Input id="edit-lead-city" {...register("city")} />
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
            <Select id="edit-lead-size" {...register("companySizeRange")}>
              {ALL_SIZES.map((size) => (
                <option key={size} value={size}>
                  {SIZE_LABEL[size]}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-lead-source">Source</Label>
            <Select id="edit-lead-source" {...register("source")}>
              {ALL_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {SOURCE_LABEL[source]}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-lead-status">Status</Label>
            <Select id="edit-lead-status" {...register("status")}>
              {EDITABLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_BADGE[s].label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {status === "LOST" && (
          <div className="space-y-1.5">
            <Label htmlFor="edit-lead-lost-reason">Lost reason</Label>
            <Select
              id="edit-lead-lost-reason"
              aria-invalid={!!errors.lostReason}
              {...register("lostReason")}
            >
              <option value="">Select a reason</option>
              {ALL_LOST_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {LOST_REASON_LABEL[reason]}
                </option>
              ))}
            </Select>
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
            {!updateLead.isPending && "Save changes"}
          </Button>
        </div>
      </Form>
    </div>
  );
}
