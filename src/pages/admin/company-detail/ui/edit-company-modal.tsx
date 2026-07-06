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
import type { Company } from "../api/company-detail";
import { useUpdateCompany } from "../api/company-detail";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

async function readUpdateErrorMessage(error: unknown): Promise<string> {
  if (error instanceof HTTPError) {
    const backendMessage = await readBackendErrorMessage(error.response);
    if (backendMessage) return backendMessage;
  }
  return GENERIC_ERROR_MESSAGE;
}

const editCompanyFormSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  country: z.string().min(1, "Country is required"),
  website: z.string().optional(),
  logo: z.string().optional(),
  addressLine: z.string().optional(),
});

type EditCompanyFormData = z.infer<typeof editCompanyFormSchema>;

interface EditCompanyModalProps {
  company: Company | null;
  onClose: () => void;
}

export function EditCompanyModal({ company, onClose }: EditCompanyModalProps) {
  const { titleId, descriptionId } = useDialogIds();

  return (
    <Dialog
      open={company !== null}
      onClose={onClose}
      titleId={titleId}
      descriptionId={descriptionId}
      className="max-w-lg"
    >
      {company && (
        <EditCompanyModalContent
          key={company.publicId}
          company={company}
          onClose={onClose}
          titleId={titleId}
          descriptionId={descriptionId}
        />
      )}
    </Dialog>
  );
}

interface EditCompanyModalContentProps {
  company: Company;
  onClose: () => void;
  titleId: string;
  descriptionId: string;
}

function EditCompanyModalContent({
  company,
  onClose,
  titleId,
  descriptionId,
}: EditCompanyModalContentProps) {
  const updateCompany = useUpdateCompany();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EditCompanyFormData>({
    resolver: zodResolver(editCompanyFormSchema),
    defaultValues: {
      name: company.name,
      phoneNumber: company.phoneNumber,
      country: company.country,
      website: company.website ?? "",
      logo: company.logo ?? "",
      addressLine: company.addressLine ?? "",
    },
  });

  async function onSubmit(data: EditCompanyFormData) {
    try {
      await updateCompany.mutateAsync({
        publicId: company.publicId,
        input: {
          name: data.name,
          phoneNumber: data.phoneNumber,
          country: data.country,
          website: data.website || null,
          logo: data.logo || null,
          addressLine: data.addressLine || null,
        },
      });
      onClose();
    } catch (error) {
      setError("root", { message: await readUpdateErrorMessage(error) });
    }
  }

  return (
    <div>
      <DialogTitle id={titleId}>Edit company</DialogTitle>
      <DialogDescription id={descriptionId}>
        Update this company's profile. The company code is fixed at creation and can't be changed.
      </DialogDescription>

      <Form onSubmit={handleSubmit(onSubmit)} className="mt-6">
        {errors.root?.message && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {errors.root.message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-company-name">Company name</Label>
            <Input id="edit-company-name" aria-invalid={!!errors.name} {...register("name")} />
            {errors.name && (
              <p className="text-xs text-[var(--color-danger)]">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-company-country">Country</Label>
            <Input
              id="edit-company-country"
              aria-invalid={!!errors.country}
              {...register("country")}
            />
            {errors.country && (
              <p className="text-xs text-[var(--color-danger)]">{errors.country.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-company-phone">Phone number</Label>
          <Input
            id="edit-company-phone"
            aria-invalid={!!errors.phoneNumber}
            {...register("phoneNumber")}
          />
          {errors.phoneNumber && (
            <p className="text-xs text-[var(--color-danger)]">{errors.phoneNumber.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-company-website">Website</Label>
          <Input id="edit-company-website" {...register("website")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-company-logo">Logo URL</Label>
          <Input id="edit-company-logo" {...register("logo")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-company-address">Address</Label>
          <Input id="edit-company-address" {...register("addressLine")} />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button intent="dismissive" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            intent="cta"
            type="submit"
            disabled={updateCompany.isPending}
            isLoading={updateCompany.isPending}
          >
            Save changes
          </Button>
        </div>
      </Form>
    </div>
  );
}
