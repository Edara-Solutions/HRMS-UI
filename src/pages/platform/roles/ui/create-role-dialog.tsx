import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { usePlatformAccess, usePlatformMutationRecovery } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { createRole, roleRoots } from "../api/roles";
import { grantableActions, type RoleFormValues, roleFormSchema } from "../model/grants";
import { GrantPicker } from "./grant-picker";

interface CreateRoleDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateRoleDialog({ open, onClose }: CreateRoleDialogProps) {
  const { t } = useTranslation("platform-people");
  const { titleId, descriptionId } = useDialogIds();
  const navigate = useNavigate();
  const access = usePlatformAccess();
  const recover = usePlatformMutationRecovery();
  const queryClient = useQueryClient();
  const userPublicId = access.user?.publicId ?? "";
  const grantable = grantableActions();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: "", description: "" },
  });
  const create = useMutation({
    retry: false,
    mutationFn: createRole,
    onSettled: () =>
      Promise.all(
        roleRoots(userPublicId).map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
  });
  const nameError = form.formState.errors.name?.message;

  function close() {
    form.reset({ name: "", description: "" });
    setSelected(new Set());
    setFailure(null);
    onClose();
  }

  async function submit(values: RoleFormValues) {
    setFailure(null);
    if (selected.size === 0) {
      setFailure(t("grants.required"));
      return;
    }
    try {
      const created = await create.mutateAsync({
        name: values.name,
        description: values.description || null,
        actions: grantable.filter((action) => selected.has(action)),
      });
      close();
      void navigate({ to: "/platform/roles/$publicId", params: { publicId: created.publicId } });
    } catch (error) {
      const outcome = await recover(error);
      if (outcome.kind === "invalid" && outcome.fields.includes("name"))
        form.setError("name", { message: "rejected" });
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
      <DialogTitle id={titleId}>{t("roles.create.title")}</DialogTitle>
      <DialogDescription id={descriptionId}>{t("roles.create.description")}</DialogDescription>
      <form noValidate className="mt-4 space-y-4" onSubmit={form.handleSubmit(submit)}>
        <div className="space-y-1.5">
          <Label htmlFor="platform-role-name">{t("field.roleName")}</Label>
          <Input
            id="platform-role-name"
            aria-invalid={nameError !== undefined}
            aria-describedby={nameError ? "platform-role-name-error" : undefined}
            disabled={create.isPending}
            {...form.register("name")}
          />
          {nameError && (
            <p id="platform-role-name-error" className="text-xs text-[var(--color-danger)]">
              {t(`error.${nameError}`)}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="platform-role-description">{t("field.roleDescription")}</Label>
          <Textarea
            id="platform-role-description"
            rows={2}
            disabled={create.isPending}
            {...form.register("description")}
          />
        </div>
        <div className="max-h-72 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 text-sm">
          <GrantPicker
            grantable={grantable}
            selected={selected}
            disabled={create.isPending}
            onChange={setSelected}
          />
        </div>
        {failure && (
          <p role="alert" className="text-sm">
            {failure}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button intent="dismissive" onClick={close} disabled={create.isPending}>
            {t("state.cancel")}
          </Button>
          <Button
            type="submit"
            intent="cta"
            isLoading={create.isPending}
            disabled={create.isPending}
          >
            {t("roles.create.submit")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
