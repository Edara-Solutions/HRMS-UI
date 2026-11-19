import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCompanyAccess, useCompanyMutationRecovery } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { createPerson, employeeCodePreviewQuery, rosterRoot } from "../api/people";

const createSchema = z.object({
  firstName: z.string().trim().min(1, "required").max(120, "tooLong"),
  lastName: z.string().trim().min(1, "required").max(120, "tooLong"),
  email: z.string().trim().min(1, "required").max(255, "tooLong").email("email"),
  employeeCode: z.string().trim().max(50, "tooLong"),
  phone: z.string().trim().max(50, "tooLong"),
});

type CreateValues = z.infer<typeof createSchema>;
const fields = ["firstName", "lastName", "email", "employeeCode", "phone"] as const;
const ltrFields: readonly (keyof CreateValues)[] = ["email", "employeeCode", "phone"];

function isCreateField(name: string): name is (typeof fields)[number] {
  return fields.some((field) => field === name);
}

interface CreatePersonDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreatePersonDialog({ open, onClose }: CreatePersonDialogProps) {
  const { t } = useTranslation("people");
  const { titleId, descriptionId } = useDialogIds();
  const navigate = useNavigate();
  const access = useCompanyAccess();
  const recover = useCompanyMutationRecovery();
  const queryClient = useQueryClient();
  const userPublicId = access.user?.publicId ?? "";
  const [failure, setFailure] = useState<string | null>(null);
  const preview = useQuery({ ...employeeCodePreviewQuery(userPublicId), enabled: open });
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { firstName: "", lastName: "", email: "", employeeCode: "", phone: "" },
  });
  const create = useMutation({
    retry: false,
    mutationFn: createPerson,
    onSettled: () => queryClient.invalidateQueries({ queryKey: rosterRoot(userPublicId) }),
  });

  function close() {
    form.reset();
    setFailure(null);
    onClose();
  }

  async function submit(values: CreateValues) {
    setFailure(null);
    try {
      const created = await create.mutateAsync({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        employeeCode: values.employeeCode || preview.data?.employeeCode || undefined,
        phone: values.phone || undefined,
      });
      close();
      void navigate({ to: "/company/people/$publicId", params: { publicId: created.publicId } });
    } catch (error) {
      const outcome = await recover(error);
      if (outcome.kind === "invalid")
        for (const field of outcome.fields)
          if (isCreateField(field)) form.setError(field, { message: "rejected" });
      setFailure(t(`outcome.${outcome.kind}`));
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      dismissible={!create.isPending}
      titleId={titleId}
      descriptionId={descriptionId}
    >
      <DialogTitle id={titleId}>{t("create.title")}</DialogTitle>
      <DialogDescription id={descriptionId}>{t("create.description")}</DialogDescription>
      <form
        noValidate
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={form.handleSubmit(submit)}
      >
        {fields.map((name) => {
          const error = form.formState.errors[name]?.message;
          return (
            <div
              key={name}
              className={name === "email" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}
            >
              <Label htmlFor={`create-${name}`}>{t(`field.${name}`)}</Label>
              <Input
                id={`create-${name}`}
                dir={ltrFields.includes(name) ? "ltr" : undefined}
                placeholder={name === "employeeCode" ? preview.data?.employeeCode : undefined}
                aria-invalid={error !== undefined}
                aria-describedby={
                  error
                    ? `create-${name}-error`
                    : name === "employeeCode"
                      ? "create-code-hint"
                      : undefined
                }
                disabled={create.isPending}
                {...form.register(name)}
              />
              {name === "employeeCode" && (
                <p id="create-code-hint" className="text-xs text-[var(--color-text-muted)]">
                  {preview.data ? t("create.codeHint") : t("create.codeUnavailable")}
                </p>
              )}
              {error && (
                <p id={`create-${name}-error`} className="text-xs text-[var(--color-danger)]">
                  {t(`error.${error}`)}
                </p>
              )}
            </div>
          );
        })}
        {failure && (
          <p role="alert" className="text-sm sm:col-span-2">
            {failure}
          </p>
        )}
        <div className="mt-2 flex flex-wrap justify-end gap-2 sm:col-span-2">
          <Button intent="dismissive" onClick={close} disabled={create.isPending}>
            {t("state.cancel")}
          </Button>
          <Button
            type="submit"
            intent="cta"
            isLoading={create.isPending}
            disabled={create.isPending}
          >
            {t("create.submit")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
