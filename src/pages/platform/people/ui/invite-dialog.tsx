import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { usePlatformAccess, usePlatformMutationRecovery } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { invitePerson, rolesQuery, rosterRoot } from "../api/people";
import {
  buildInvitation,
  type InviteField,
  type InviteFormValues,
  inviteFormSchema,
  isInviteField,
} from "../model/roster";

const fields: readonly InviteField[] = [
  "firstName",
  "lastName",
  "email",
  "staffCode",
  "jobTitle",
  "team",
];
const ltrFields: readonly InviteField[] = ["email", "staffCode"];
const emptyForm: InviteFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  staffCode: "",
  jobTitle: "",
  team: "",
};

interface InviteDialogProps {
  open: boolean;
  onClose: () => void;
}

export function InviteDialog({ open, onClose }: InviteDialogProps) {
  const { t } = useTranslation("platform-people");
  const { titleId, descriptionId } = useDialogIds();
  const navigate = useNavigate();
  const access = usePlatformAccess();
  const recover = usePlatformMutationRecovery();
  const queryClient = useQueryClient();
  const userPublicId = access.user?.publicId ?? "";
  // Initial roles are offered only to a current root holder with the reserved assign action.
  const canAssign =
    access.availability("POST /api/v1/platform/role-assignments").state === "enabled" &&
    access.availability("GET /api/v1/platform/roles").state === "enabled";
  const roles = useQuery({ ...rolesQuery(userPublicId), enabled: open && canAssign });
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: emptyForm,
  });
  const invite = useMutation({
    retry: false,
    mutationFn: invitePerson,
    onSettled: () => queryClient.invalidateQueries({ queryKey: rosterRoot(userPublicId) }),
  });

  function close() {
    form.reset(emptyForm);
    setChosen(new Set());
    setFailure(null);
    onClose();
  }

  function toggle(rolePublicId: string, checked: boolean) {
    setChosen((current) => {
      const next = new Set(current);
      if (checked) next.add(rolePublicId);
      else next.delete(rolePublicId);
      return next;
    });
  }

  async function submit(values: InviteFormValues) {
    setFailure(null);
    try {
      const created = await invite.mutateAsync(buildInvitation(values, [...chosen], canAssign));
      close();
      void navigate({ to: "/platform/people/$publicId", params: { publicId: created.publicId } });
    } catch (error) {
      const outcome = await recover(error);
      if (outcome.kind === "invalid")
        for (const field of outcome.fields)
          if (isInviteField(field)) form.setError(field, { message: "rejected" });
      setFailure(t(`outcome.${outcome.kind}`));
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      dismissible={!invite.isPending}
      titleId={titleId}
      descriptionId={descriptionId}
    >
      <DialogTitle id={titleId}>{t("invite.title")}</DialogTitle>
      <DialogDescription id={descriptionId}>
        {canAssign ? t("invite.descriptionRoot") : t("invite.description")}
      </DialogDescription>
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
              <Label htmlFor={`invite-${name}`}>{t(`field.${name}`)}</Label>
              <Input
                id={`invite-${name}`}
                type={name === "email" ? "email" : "text"}
                dir={ltrFields.includes(name) ? "ltr" : undefined}
                aria-invalid={error !== undefined}
                aria-describedby={error ? `invite-${name}-error` : undefined}
                disabled={invite.isPending}
                {...form.register(name)}
              />
              {error && (
                <p id={`invite-${name}-error`} className="text-xs text-[var(--color-danger)]">
                  {t(`error.${error}`)}
                </p>
              )}
            </div>
          );
        })}
        {canAssign && (
          <fieldset className="space-y-2 sm:col-span-2">
            <legend className="text-sm font-medium">{t("invite.roles")}</legend>
            {roles.isError ? (
              <p className="text-xs text-[var(--color-text-muted)]">
                {t("invite.rolesUnavailable")}
              </p>
            ) : (
              roles.data?.items.map((role) => (
                <label key={role.publicId} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--color-primary)]"
                    checked={chosen.has(role.publicId)}
                    disabled={invite.isPending}
                    onChange={(event) => toggle(role.publicId, event.target.checked)}
                  />
                  <span className="min-w-0 break-words">{role.name}</span>
                  {role.isSystem && (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {t("roles.root")}
                    </span>
                  )}
                </label>
              ))
            )}
          </fieldset>
        )}
        {failure && (
          <p role="alert" className="text-sm sm:col-span-2">
            {failure}
          </p>
        )}
        <div className="mt-2 flex flex-wrap justify-end gap-2 sm:col-span-2">
          <Button intent="dismissive" onClick={close} disabled={invite.isPending}>
            {t("state.cancel")}
          </Button>
          <Button
            type="submit"
            intent="cta"
            isLoading={invite.isPending}
            disabled={invite.isPending}
          >
            {t("invite.submit")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
