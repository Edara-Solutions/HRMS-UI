import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { ActionAvailability } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { type RoleUpdate, updateRole } from "../api/roles";
import { type PlatformRole, type RoleFormValues, roleFormSchema } from "../model/grants";
import { useRoleMutation } from "../model/use-role-mutation";
import { RoleOutcome, RoleRestriction } from "./role-feedback";

interface RoleDetailsCardProps {
  role: PlatformRole;
  update: ActionAvailability;
}

export function RoleDetailsCard({ role, update }: RoleDetailsCardProps) {
  const { t } = useTranslation("platform-people");
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    values: { name: role.name, description: role.description ?? "" },
    resetOptions: { keepDirtyValues: true },
  });
  const save = useRoleMutation({
    run: (body: RoleUpdate) => updateRole(role.publicId, body),
    success: t("role.saved.details"),
    onSuccess: (saved) => form.reset({ name: saved.name, description: saved.description ?? "" }),
    onFailure: (outcome) => {
      if (outcome.kind === "invalid" && outcome.fields.includes("name"))
        form.setError("name", { message: "rejected" });
    },
  });
  const editable = update.state === "enabled" && !save.isPending;
  const nameError = form.formState.errors.name?.message;

  function submit(values: RoleFormValues) {
    const body: RoleUpdate = {};
    if (form.formState.dirtyFields.name) body.name = values.name;
    if (form.formState.dirtyFields.description) body.description = values.description || null;
    if (Object.keys(body).length === 0)
      save.showFeedback({ tone: "status", message: t("person.noChanges") });
    else save.mutate(body);
  }

  return (
    <Card as="section" aria-labelledby="platform-role-details">
      <CardHeader>
        <CardTitle id="platform-role-details">{t("role.details")}</CardTitle>
      </CardHeader>
      <CardContent className="p-[18px]">
        {update.state === "hidden" ? (
          <p className="break-words text-sm text-[var(--color-text-muted)]">
            {role.description ?? t("state.notProvided")}
          </p>
        ) : (
          <form noValidate className="space-y-3" onSubmit={form.handleSubmit(submit)}>
            <RoleRestriction availability={update} />
            <div className="space-y-1.5">
              <Label htmlFor="platform-role-edit-name">{t("field.roleName")}</Label>
              <Input
                id="platform-role-edit-name"
                disabled={!editable}
                aria-invalid={nameError !== undefined}
                aria-describedby={nameError ? "platform-role-edit-name-error" : undefined}
                {...form.register("name")}
              />
              {nameError && (
                <p
                  id="platform-role-edit-name-error"
                  className="text-xs text-[var(--color-danger)]"
                >
                  {t(`error.${nameError}`)}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="platform-role-edit-description">{t("field.roleDescription")}</Label>
              <Textarea
                id="platform-role-edit-description"
                rows={3}
                disabled={!editable}
                {...form.register("description")}
              />
            </div>
            {update.state === "enabled" && (
              <Button
                type="submit"
                intent="action"
                size="sm"
                leadingIcon={<Save aria-hidden="true" size={15} />}
                disabled={save.isPending}
              >
                {t("role.saveDetails")}
              </Button>
            )}
            <RoleOutcome feedback={save.feedback} />
          </form>
        )}
      </CardContent>
    </Card>
  );
}
