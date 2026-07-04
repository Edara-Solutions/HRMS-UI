import { zodResolver } from "@hookform/resolvers/zod";
import { HTTPError } from "ky";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { readBackendErrorMessage } from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { Form } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import type { ConvertLeadResult, LeadContact, LeadWithContacts } from "./api";
import { useConvertLead } from "./api";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

async function readConvertErrorMessage(error: unknown): Promise<string> {
  if (error instanceof HTTPError) {
    const backendMessage = await readBackendErrorMessage(error.response);
    if (backendMessage) return backendMessage;
  }
  return GENERIC_ERROR_MESSAGE;
}

function primaryContactOf(contacts: LeadContact[]): LeadContact | null {
  return contacts.find((contact) => contact.isPrimary) ?? contacts[0] ?? null;
}

function splitContactName(name: string | null): { firstName: string; lastName: string } {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return { firstName: "", lastName: "" };
  const [firstName, ...rest] = trimmed.split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

const convertLeadFormSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  country: z.string().min(1, "Country is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  ownerFirstName: z.string().min(1, "Owner first name is required"),
  ownerLastName: z.string().min(1, "Owner last name is required"),
  ownerEmail: z.string().min(1, "Owner email is required").email("Enter a valid email address"),
});

type ConvertLeadFormData = z.infer<typeof convertLeadFormSchema>;

interface ConvertLeadModalProps {
  leadWithContacts: LeadWithContacts | null;
  onClose: () => void;
  onConverted: (company: ConvertLeadResult) => void;
}

export function ConvertLeadModal({
  leadWithContacts,
  onClose,
  onConverted,
}: ConvertLeadModalProps) {
  const { titleId, descriptionId } = useDialogIds();

  return (
    <Dialog
      open={leadWithContacts !== null}
      onClose={onClose}
      titleId={titleId}
      descriptionId={descriptionId}
      className="max-w-lg"
    >
      {leadWithContacts && (
        <ConvertLeadModalContent
          key={leadWithContacts.lead.publicId}
          leadWithContacts={leadWithContacts}
          onClose={onClose}
          onConverted={onConverted}
          titleId={titleId}
          descriptionId={descriptionId}
        />
      )}
    </Dialog>
  );
}

interface ConvertLeadModalContentProps {
  leadWithContacts: LeadWithContacts;
  onClose: () => void;
  onConverted: (company: ConvertLeadResult) => void;
  titleId: string;
  descriptionId: string;
}

function ConvertLeadModalContent({
  leadWithContacts,
  onClose,
  onConverted,
  titleId,
  descriptionId,
}: ConvertLeadModalContentProps) {
  const { lead, contacts } = leadWithContacts;
  const primaryContact = primaryContactOf(contacts);
  const { firstName, lastName } = splitContactName(primaryContact?.name ?? null);

  const convertLead = useConvertLead();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<{ company: ConvertLeadResult; ownerEmail: string } | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConvertLeadFormData>({
    resolver: zodResolver(convertLeadFormSchema),
    defaultValues: {
      name: lead.companyName ?? "",
      country: lead.country ?? "",
      phoneNumber: "",
      ownerFirstName: firstName,
      ownerLastName: lastName,
      ownerEmail: primaryContact?.email ?? "",
    },
  });

  async function onSubmit(data: ConvertLeadFormData) {
    setSubmitError(null);

    try {
      const company = await convertLead.mutateAsync({
        publicId: lead.publicId,
        input: data,
      });
      setResult({ company, ownerEmail: data.ownerEmail });
    } catch (error) {
      setSubmitError(await readConvertErrorMessage(error));
    }
  }

  if (result) {
    return (
      <div>
        <div className="flex items-start gap-3">
          <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
          <div>
            <DialogTitle id={titleId}>{result.company.name} is now a company</DialogTitle>
            <DialogDescription id={descriptionId}>
              An invitation was sent to the Owner at{" "}
              <span className="font-medium text-[var(--color-text)]">{result.ownerEmail}</span> to
              set a password and log in.
            </DialogDescription>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Company code</span>
          <Badge variant="success">{result.company.companyCode}</Badge>
        </div>

        <Button
          intent="cta"
          size="block"
          className="mt-6"
          onClick={() => onConverted(result.company)}
        >
          View company
        </Button>
      </div>
    );
  }

  return (
    <div>
      <DialogTitle id={titleId}>Convert lead to company</DialogTitle>
      <DialogDescription id={descriptionId}>
        This provisions a real, working tenant: the Owner below will receive an invitation email to
        log into their Company Portal.
      </DialogDescription>

      <Form onSubmit={handleSubmit(onSubmit)} className="mt-6">
        {submitError && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {submitError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="convert-name">Company name</Label>
            <Input id="convert-name" aria-invalid={!!errors.name} {...register("name")} />
            {errors.name && (
              <p className="text-xs text-[var(--color-danger)]">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="convert-country">Country</Label>
            <Input id="convert-country" aria-invalid={!!errors.country} {...register("country")} />
            {errors.country && (
              <p className="text-xs text-[var(--color-danger)]">{errors.country.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="convert-phone">Phone number</Label>
          <Input
            id="convert-phone"
            aria-invalid={!!errors.phoneNumber}
            {...register("phoneNumber")}
          />
          {errors.phoneNumber && (
            <p className="text-xs text-[var(--color-danger)]">{errors.phoneNumber.message}</p>
          )}
        </div>

        <div className="border-t border-[var(--color-border)] pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Owner
          </p>

          <div className="mt-3 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="convert-owner-first-name">First name</Label>
              <Input
                id="convert-owner-first-name"
                aria-invalid={!!errors.ownerFirstName}
                {...register("ownerFirstName")}
              />
              {errors.ownerFirstName && (
                <p className="text-xs text-[var(--color-danger)]">
                  {errors.ownerFirstName.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="convert-owner-last-name">Last name</Label>
              <Input
                id="convert-owner-last-name"
                aria-invalid={!!errors.ownerLastName}
                {...register("ownerLastName")}
              />
              {errors.ownerLastName && (
                <p className="text-xs text-[var(--color-danger)]">{errors.ownerLastName.message}</p>
              )}
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <Label htmlFor="convert-owner-email">Email</Label>
            <Input
              id="convert-owner-email"
              type="email"
              aria-invalid={!!errors.ownerEmail}
              {...register("ownerEmail")}
            />
            {errors.ownerEmail && (
              <p className="text-xs text-[var(--color-danger)]">{errors.ownerEmail.message}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button intent="dismissive" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            intent="cta"
            type="submit"
            disabled={convertLead.isPending}
            isLoading={convertLead.isPending}
          >
            Convert to company
          </Button>
        </div>
      </Form>
    </div>
  );
}
