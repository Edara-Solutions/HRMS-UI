import { zodResolver } from "@hookform/resolvers/zod";
import { HTTPError } from "ky";
import { useState } from "react";
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
import { ALL_SIZES, ALL_SOURCES, SIZE_LABEL, SOURCE_LABEL } from "../api/lead-labels";
import type { LeadCreateResult } from "../api/leads";
import { useCreateLead } from "../api/leads";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

async function readCreateErrorMessage(error: unknown): Promise<string> {
  if (error instanceof HTTPError) {
    const backendMessage = await readBackendErrorMessage(error.response);
    if (backendMessage) return backendMessage;
  }
  return GENERIC_ERROR_MESSAGE;
}

const createLeadFormSchema = z.object({
  companyName: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  companySizeRange: z.enum(asZodEnumValues(ALL_SIZES)),
  country: z.string().optional(),
  state: z.string().optional(),
  source: z.enum(asZodEnumValues(ALL_SOURCES)),
  contactName: z.string().min(1, "Primary contact name is required"),
  contactEmail: z.string().email("Enter a valid email address").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  contactJobTitle: z.string().optional(),
});

type CreateLeadFormData = z.infer<typeof createLeadFormSchema>;

interface CreateLeadModalProps {
  open: boolean;
  onClose: () => void;
  onViewLead: (publicId: string) => void;
}

export function CreateLeadModal({ open, onClose, onViewLead }: CreateLeadModalProps) {
  const { titleId, descriptionId } = useDialogIds();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      descriptionId={descriptionId}
      className="max-w-lg"
    >
      {open && (
        <CreateLeadModalContent
          onClose={onClose}
          onViewLead={onViewLead}
          titleId={titleId}
          descriptionId={descriptionId}
        />
      )}
    </Dialog>
  );
}

interface CreateLeadModalContentProps {
  onClose: () => void;
  onViewLead: (publicId: string) => void;
  titleId: string;
  descriptionId: string;
}

function CreateLeadModalContent({
  onClose,
  onViewLead,
  titleId,
  descriptionId,
}: CreateLeadModalContentProps) {
  const createLead = useCreateLead();
  const [duplicateResult, setDuplicateResult] = useState<LeadCreateResult | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateLeadFormData>({
    resolver: zodResolver(createLeadFormSchema),
    defaultValues: {
      companyName: "",
      website: "",
      industry: "",
      companySizeRange: ALL_SIZES[0],
      country: "",
      state: "",
      source: ALL_SOURCES[0],
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      contactJobTitle: "",
    },
  });

  const selectedCountry = watch("country");

  async function onSubmit(data: CreateLeadFormData) {
    try {
      const result = await createLead.mutateAsync({
        companyName: data.companyName || undefined,
        website: data.website || undefined,
        industry: data.industry || undefined,
        companySizeRange: data.companySizeRange,
        country: data.country || undefined,
        city: data.state || undefined,
        source: data.source,
        status: "NEW",
        primaryContact: {
          name: data.contactName,
          email: data.contactEmail || undefined,
          phone: data.contactPhone || undefined,
          jobTitle: data.contactJobTitle || undefined,
          isPrimary: true,
        },
      });
      if (result.meta.duplicate) {
        setDuplicateResult(result);
        return;
      }
      onViewLead(result.lead.publicId);
    } catch (error) {
      setError("root", { message: await readCreateErrorMessage(error) });
    }
  }

  if (duplicateResult) {
    const primaryContact = duplicateResult.contacts.find((contact) => contact.isPrimary);
    return (
      <div>
        <DialogTitle id={titleId}>Existing lead updated</DialogTitle>
        <DialogDescription id={descriptionId}>
          This contact matches an active lead. The server updated that lead instead of creating a
          duplicate.
        </DialogDescription>
        <div
          className="mt-6 rounded-[var(--radius-md)] border border-[var(--color-success)] bg-[var(--color-success-soft)] p-4"
          aria-live="polite"
        >
          <p className="font-semibold text-[var(--color-text)]">
            {duplicateResult.lead.companyName ?? "Untitled lead"}
          </p>
          {primaryContact?.email && (
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{primaryContact.email}</p>
          )}
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Attempt {duplicateResult.lead.numberOfAttempts} recorded using normalized server data.
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button intent="dismissive" type="button" onClick={onClose}>
            Close
          </Button>
          <Button
            intent="cta"
            type="button"
            onClick={() => onViewLead(duplicateResult.lead.publicId)}
          >
            View existing lead
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <DialogTitle id={titleId}>Add lead</DialogTitle>
      <DialogDescription id={descriptionId}>
        Capture a new prospect and its primary contact.
      </DialogDescription>

      <Form onSubmit={handleSubmit(onSubmit)} className="mt-6">
        {errors.root?.message && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {errors.root.message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="create-lead-company-name">Company name</Label>
            <Input id="create-lead-company-name" {...register("companyName")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-lead-country">Country</Label>
            <Controller
              control={control}
              name="country"
              render={({ field }) => (
                <CountrySelect
                  value={field.value ?? ""}
                  onValueChange={(nextCountry) => {
                    field.onChange(nextCountry);
                    setValue("state", "");
                  }}
                  id="create-lead-country"
                  ref={field.ref}
                  onBlur={field.onBlur}
                />
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-lead-state">State</Label>
            <Controller
              control={control}
              name="state"
              render={({ field }) => (
                <StateSelect
                  country={selectedCountry ?? ""}
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  id="create-lead-state"
                  ref={field.ref}
                  onBlur={field.onBlur}
                />
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-lead-industry">Industry</Label>
            <Input id="create-lead-industry" {...register("industry")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-lead-size">Company size</Label>
            <Controller
              control={control}
              name="companySizeRange"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="create-lead-size" ref={field.ref} onBlur={field.onBlur}>
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
            <Label htmlFor="create-lead-source">Source</Label>
            <Controller
              control={control}
              name="source"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="create-lead-source" ref={field.ref} onBlur={field.onBlur}>
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
        </div>

        <div className="border-t border-[var(--color-border)] pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Primary contact
          </p>

          <div className="mt-3 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="create-lead-contact-name">Name</Label>
              <Input
                id="create-lead-contact-name"
                aria-invalid={!!errors.contactName}
                {...register("contactName")}
              />
              {errors.contactName && (
                <p className="text-xs text-[var(--color-danger)]">{errors.contactName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-lead-contact-job-title">Job title</Label>
              <Input id="create-lead-contact-job-title" {...register("contactJobTitle")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-lead-contact-email">Email</Label>
              <Input
                id="create-lead-contact-email"
                type="email"
                aria-invalid={!!errors.contactEmail}
                {...register("contactEmail")}
              />
              {errors.contactEmail && (
                <p className="text-xs text-[var(--color-danger)]">{errors.contactEmail.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-lead-contact-phone">Phone</Label>
              <Input id="create-lead-contact-phone" {...register("contactPhone")} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button intent="dismissive" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            intent="cta"
            type="submit"
            disabled={createLead.isPending}
            isLoading={createLead.isPending}
          >
            Add lead
          </Button>
        </div>
      </Form>
    </div>
  );
}
