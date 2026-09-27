import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Save } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  ContractViolation,
  isCompanyBlocked,
  OperationRefusal,
  useCompanyAccess,
  useCompanyMutationRecovery,
} from "@/shared/api";
import type { ActionAvailability } from "@/shared/auth";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { CompanyAccessNotice } from "@/shared/ui/company-access-notice";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import { Textarea } from "@/shared/ui/textarea";
import {
  deleteRole,
  replaceRolePermissions,
  roleQueries,
  roleRoots,
  updateRole,
} from "../api/role";
import {
  grantablePermissionIds,
  permissionChange,
  type RoleDetail,
  type RoleFormValues,
  roleFormSchema,
} from "../model/role";

interface Feedback {
  tone: "status" | "alert";
  message: string;
}

export function CompanyRolePage({ publicId }: { publicId: string }) {
  const { t } = useTranslation("people");
  const access = useCompanyAccess();
  const {
    data: role,
    error,
    isPending,
    isError,
    refetch,
  } = useQuery({
    ...roleQueries(access.user?.publicId ?? "", publicId).role,
    enabled: access.user !== undefined,
  });

  if (isCompanyBlocked(error)) throw error;
  if (error instanceof OperationRefusal && [403, 404].includes(error.status)) throw error;
  if (!access.user) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        to="/company/roles"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft aria-hidden="true" size={15} className="rtl:rotate-180" />
        {t("role.back")}
      </Link>
      {access.policy && <CompanyAccessNotice {...access.policy} />}
      {isPending ? (
        <output className="block space-y-3" aria-label={t("state.loading")}>
          <Skeleton className="h-9 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </output>
      ) : isError ? (
        <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 text-sm">
          <p>
            {error instanceof ContractViolation
              ? t("state.contractUnavailable")
              : t("state.loadFailed")}
          </p>
          {!(error instanceof ContractViolation) && (
            <Button intent="action" size="sm" onClick={() => void refetch()}>
              {t("state.retry")}
            </Button>
          )}
        </div>
      ) : (
        <RoleWorkspace role={role} />
      )}
    </div>
  );
}

function RoleWorkspace({ role }: { role: RoleDetail }) {
  const { t } = useTranslation("people");
  const navigate = useNavigate();
  const access = useCompanyAccess();
  const recover = useCompanyMutationRecovery();
  const queryClient = useQueryClient();
  const userPublicId = access.user?.publicId ?? "";
  const queries = roleQueries(userPublicId, role.publicId);
  const roots = roleRoots(userPublicId);
  // System roles (Owner, Employee) keep their name; the Owner role holds unconditional access.
  const update = access.availability("PATCH /api/v1/company/roles/{publicId}", {
    target: { systemRole: role.isSystem },
  });
  const grant = access.availability("PUT /api/v1/company/roles/{publicId}/permissions", {
    target: { systemRole: role.isOwner },
  });
  const remove = access.availability("DELETE /api/v1/company/roles/{publicId}", {
    target: { systemRole: role.isSystem },
  });
  const { data: catalogue, isPending: cataloguePending } = useQuery({
    ...queries.catalogue,
    enabled: grant.state !== "hidden" && !role.isOwner,
  });
  const [selected, setSelected] = useState<ReadonlySet<string>>(
    () => new Set(role.permissions.map((permission) => permission.publicId)),
  );
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [confirming, setConfirming] = useState<"permissions" | "delete" | null>(null);
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    values: { name: role.name, description: role.description ?? "" },
    resetOptions: { keepDirtyValues: true },
  });
  const invalidate = () =>
    Promise.all(roots.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  const command = useMutation({
    retry: false,
    mutationFn: async (
      action:
        | { kind: "rename"; body: { name?: string; description?: string | null } }
        | { kind: "permissions"; ids: string[] }
        | { kind: "delete" },
    ) => {
      if (action.kind === "rename") return updateRole(role.publicId, action.body);
      if (action.kind === "permissions") return replaceRolePermissions(role.publicId, action.ids);
      return deleteRole(role.publicId);
    },
    onSuccess: async (result, action) => {
      if (action.kind === "delete") {
        await navigate({ to: "/company/roles" });
        return;
      }
      if (result) {
        queryClient.setQueryData(queries.role.queryKey, result);
        if (action.kind === "rename")
          form.reset({ name: result.name, description: result.description ?? "" });
        else setSelected(new Set(result.permissions.map((permission) => permission.publicId)));
      }
      setFeedback({ tone: "status", message: t(`role.saved.${action.kind}`) });
    },
    onError: async (error, action) => {
      const outcome = await recover(error);
      if (outcome.kind === "invalid" && action.kind === "rename" && outcome.fields.includes("name"))
        form.setError("name", { message: "rejected" });
      if (action.kind === "permissions" && outcome.kind !== "invalid")
        setSelected(new Set(role.permissions.map((permission) => permission.publicId)));
      setFeedback({ tone: "alert", message: t(`outcome.${outcome.kind}`) });
    },
    onSettled: invalidate,
  });
  const change = permissionChange(role, catalogue ?? [], selected);
  const nameError = form.formState.errors.name?.message;

  function rename(values: RoleFormValues) {
    setFeedback(null);
    const body: { name?: string; description?: string | null } = {};
    if (form.formState.dirtyFields.name) body.name = values.name;
    if (form.formState.dirtyFields.description) body.description = values.description || null;
    if (Object.keys(body).length === 0) {
      setFeedback({ tone: "status", message: t("person.noChanges") });
      return;
    }
    command.mutate({ kind: "rename", body });
  }

  function toggle(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight">{role.name}</h1>
        {role.isOwner && <Badge variant="primary">{t("roles.owner")}</Badge>}
        {role.isSystem && !role.isOwner && <Badge variant="default">{t("roles.system")}</Badge>}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card as="section" aria-labelledby="role-permissions" className="min-w-0">
          <CardHeader>
            <CardTitle id="role-permissions">{t("role.permissions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-[18px] text-sm">
            {role.isOwner ? (
              <p className="text-[var(--color-text-muted)]">{t("role.ownerAccess")}</p>
            ) : grant.state === "hidden" ? (
              <ul className="space-y-1.5">
                {role.permissions.length === 0 ? (
                  <li className="text-[var(--color-text-muted)]">{t("role.noPermissions")}</li>
                ) : (
                  role.permissions.map((permission) => (
                    <li key={permission.publicId}>
                      {permission.description ?? <span dir="ltr">{permission.action}</span>}
                    </li>
                  ))
                )}
              </ul>
            ) : cataloguePending ? (
              <Skeleton className="h-40 w-full" />
            ) : !catalogue ? (
              <p>{t("state.loadFailed")}</p>
            ) : (
              <>
                <RestrictionReason availability={grant} />
                {catalogue.map((group) => (
                  <fieldset key={group.publicId} className="space-y-2">
                    <legend className="font-semibold">{group.name}</legend>
                    {group.permissions.map((permission) => (
                      <label key={permission.publicId} className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 accent-[var(--color-primary)]"
                          checked={selected.has(permission.publicId)}
                          disabled={grant.state === "disabled" || command.isPending}
                          onChange={(event) => toggle(permission.publicId, event.target.checked)}
                        />
                        <span className="min-w-0">
                          <span className="block">
                            {permission.description ?? permission.action}
                          </span>
                          <span className="block text-xs text-[var(--color-text-muted)]" dir="ltr">
                            {permission.action}
                          </span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                ))}
                {grant.state === "enabled" && (
                  <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--color-border)] pt-4">
                    <p className="me-auto text-xs text-[var(--color-text-muted)]">
                      {t("role.pendingChange", { added: change.added, removed: change.removed })}
                    </p>
                    <Button
                      intent="cta"
                      disabled={(change.added === 0 && change.removed === 0) || command.isPending}
                      isLoading={command.isPending && command.variables?.kind === "permissions"}
                      onClick={() => setConfirming("permissions")}
                    >
                      {t("role.savePermissions")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card as="section" aria-labelledby="role-details">
            <CardHeader>
              <CardTitle id="role-details">{t("role.details")}</CardTitle>
            </CardHeader>
            <CardContent className="p-[18px]">
              {update.state === "hidden" ? (
                <p className="break-words text-sm text-[var(--color-text-muted)]">
                  {role.description ?? t("role.noDescription")}
                </p>
              ) : (
                <form noValidate className="space-y-3" onSubmit={form.handleSubmit(rename)}>
                  <RestrictionReason availability={update} />
                  <div className="space-y-1.5">
                    <Label htmlFor="role-edit-name">{t("field.roleName")}</Label>
                    <Input
                      id="role-edit-name"
                      disabled={update.state !== "enabled" || command.isPending}
                      aria-invalid={nameError !== undefined}
                      aria-describedby={nameError ? "role-edit-name-error" : undefined}
                      {...form.register("name")}
                    />
                    {nameError && (
                      <p id="role-edit-name-error" className="text-xs text-[var(--color-danger)]">
                        {t(`error.${nameError}`)}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="role-edit-description">{t("field.roleDescription")}</Label>
                    <Textarea
                      id="role-edit-description"
                      rows={3}
                      disabled={update.state !== "enabled" || command.isPending}
                      {...form.register("description")}
                    />
                  </div>
                  {update.state === "enabled" && (
                    <Button
                      type="submit"
                      intent="action"
                      size="sm"
                      leadingIcon={<Save aria-hidden="true" size={15} />}
                      disabled={command.isPending}
                    >
                      {t("role.saveDetails")}
                    </Button>
                  )}
                </form>
              )}
            </CardContent>
          </Card>

          {remove.state !== "hidden" && (
            <Card as="section" aria-labelledby="role-delete">
              <CardHeader>
                <CardTitle id="role-delete">{t("role.deleteTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-[18px] text-sm">
                <p className="text-[var(--color-text-muted)]">{t("role.deleteHint")}</p>
                <RestrictionReason availability={remove} />
                <Button
                  intent="destructive-trigger"
                  size="sm"
                  disabled={remove.state === "disabled" || command.isPending}
                  onClick={() => setConfirming("delete")}
                >
                  {t("role.delete")}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <p role={feedback?.tone === "alert" ? "alert" : "status"} className="min-h-5 text-sm">
        {feedback?.message}
      </p>

      <ConfirmDialog
        open={confirming !== null}
        tone="destructive"
        title={
          confirming === "delete"
            ? t("role.deleteConfirm.title", { role: role.name })
            : t("role.permissionsConfirm.title", { role: role.name })
        }
        description={
          confirming === "delete"
            ? t("role.deleteConfirm.description", { role: role.name })
            : t("role.permissionsConfirm.description", { ...change, role: role.name })
        }
        confirmLabel={confirming === "delete" ? t("role.delete") : t("role.savePermissions")}
        cancelLabel={t("state.cancel")}
        isLoading={command.isPending}
        onClose={() => setConfirming(null)}
        onConfirm={() => {
          setFeedback(null);
          if (confirming === "delete") command.mutate({ kind: "delete" });
          else if (catalogue)
            command.mutate({
              kind: "permissions",
              ids: grantablePermissionIds(catalogue, selected),
            });
          setConfirming(null);
        }}
      />
    </>
  );
}

function RestrictionReason({ availability }: { availability: ActionAvailability }) {
  const { t } = useTranslation("people");
  if (availability.state !== "disabled") return null;
  return (
    <p className="text-xs text-[var(--color-text-muted)]">
      {t(`restriction.${availability.reason}`)}
    </p>
  );
}
