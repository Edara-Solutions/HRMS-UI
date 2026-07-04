import { zodResolver } from "@hookform/resolvers/zod";
import { HTTPError } from "ky";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { readBackendErrorMessage } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { Form } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import type { LeadContact } from "./api";
import { useAddLeadContact, useUpdateLeadContact } from "./api";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

async function readContactErrorMessage(error: unknown): Promise<string> {
  if (error instanceof HTTPError) {
    const backendMessage = await readBackendErrorMessage(error.response);
    if (backendMessage) return backendMessage;
  }
  return GENERIC_ERROR_MESSAGE;
}

const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  jobTitle: z.string().optional(),
  email: z.string().email("Enter a valid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

export type LeadContactModalState = { contact: LeadContact | null } | null;

interface LeadContactFormModalProps {
  leadPublicId: string;
  state: LeadContactModalState;
  onClose: () => void;
}

export function LeadContactFormModal({ leadPublicId, state, onClose }: LeadContactFormModalProps) {
  const { titleId, descriptionId } = useDialogIds();

  return (
    <Dialog
      open={state !== null}
      onClose={onClose}
      titleId={titleId}
      descriptionId={descriptionId}
      className="max-w-md"
    >
      {state && (
        <LeadContactFormModalContent
          key={state.contact?.publicId ?? "new"}
          leadPublicId={leadPublicId}
          contact={state.contact}
          onClose={onClose}
          titleId={titleId}
          descriptionId={descriptionId}
        />
      )}
    </Dialog>
  );
}

interface LeadContactFormModalContentProps {
  leadPublicId: string;
  contact: LeadContact | null;
  onClose: () => void;
  titleId: string;
  descriptionId: string;
}

function LeadContactFormModalContent({
  leadPublicId,
  contact,
  onClose,
  titleId,
  descriptionId,
}: LeadContactFormModalContentProps) {
  const addContact = useAddLeadContact();
  const updateContact = useUpdateLeadContact();
  const isPending = addContact.isPending || updateContact.isPending;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: contact?.name ?? "",
      jobTitle: contact?.jobTitle ?? "",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
    },
  });

  async function onSubmit(data: ContactFormData) {
    const input = {
      name: data.name,
      jobTitle: data.jobTitle || undefined,
      email: data.email || undefined,
      phone: data.phone || undefined,
    };

    try {
      if (contact) {
        await updateContact.mutateAsync({
          publicId: leadPublicId,
          contactPublicId: contact.publicId,
          input,
        });
      } else {
        await addContact.mutateAsync({ publicId: leadPublicId, input });
      }
      onClose();
    } catch (error) {
      setError("root", { message: await readContactErrorMessage(error) });
    }
  }

  return (
    <div>
      <DialogTitle id={titleId}>{contact ? "Edit contact" : "Add contact"}</DialogTitle>
      <DialogDescription id={descriptionId}>
        {contact ? "Update this contact's details." : "Add a new contact to this lead."}
      </DialogDescription>

      <Form onSubmit={handleSubmit(onSubmit)} className="mt-6">
        {errors.root?.message && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {errors.root.message}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="contact-name">Name</Label>
          <Input id="contact-name" aria-invalid={!!errors.name} {...register("name")} />
          {errors.name && (
            <p className="text-xs text-[var(--color-danger)]">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contact-job-title">Job title</Label>
          <Input id="contact-job-title" {...register("jobTitle")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            type="email"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-[var(--color-danger)]">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contact-phone">Phone</Label>
          <Input id="contact-phone" {...register("phone")} />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button intent="dismissive" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button intent="cta" type="submit" disabled={isPending} isLoading={isPending}>
            {contact ? "Save changes" : "Add contact"}
          </Button>
        </div>
      </Form>
    </div>
  );
}
