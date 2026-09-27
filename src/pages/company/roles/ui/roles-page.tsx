import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { KeyRound, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  ContractViolation,
  isCompanyBlocked,
  OperationRefusal,
  useCompanyAccess,
  useCompanyMutationRecovery,
} from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { CompanyAccessNotice } from "@/shared/ui/company-access-notice";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import { Textarea } from "@/shared/ui/textarea";
import { createRole, rolesQuery, rolesRoot } from "../api/roles";

const roleFormSchema = z.object({
  name: z.string().trim().min(1, "required").max(100, "tooLong"),
  description: z.string().trim().max(500, "tooLong"),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

export function CompanyRolesPage() {
  const { t } = useTranslation("people");
  const access = useCompanyAccess();
  const userPublicId = access.user?.publicId ?? "";
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const { data, error, isPending, isError, isFetching, refetch } = useQuery({
    ...rolesQuery(userPublicId, page, ""),
    enabled: access.user !== undefined,
  });
  const canCreate = access.availability("POST /api/v1/company/roles");

  if (isCompanyBlocked(error)) throw error;
  if (error instanceof OperationRefusal && [403, 404].includes(error.status)) throw error;
  if (!access.user) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{t("roles.title")}</h1>
          <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
            {t("roles.description")}
          </p>
        </div>
        {canCreate.state !== "hidden" && (
          <Button
            intent="cta"
            leadingIcon={<Plus aria-hidden="true" size={15} />}
            disabled={canCreate.state === "disabled"}
            onClick={() => setCreating(true)}
          >
            {t("roles.create")}
          </Button>
        )}
      </header>
      {access.policy && <CompanyAccessNotice {...access.policy} />}
      {canCreate.state === "disabled" && (
        <p className="text-sm text-[var(--color-text-muted)]">
          {t(`restriction.${canCreate.reason}`)}
        </p>
      )}

      <Card as="section" aria-labelledby="roles-heading" aria-busy={isFetching} className="min-w-0">
        <h2 id="roles-heading" className="sr-only">
          {t("roles.title")}
        </h2>
        {isPending ? (
          <output className="block space-y-2 p-4" aria-label={t("state.loading")}>
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-12 w-full" />
            ))}
          </output>
        ) : isError ? (
          <div className="space-y-3 p-4 text-sm">
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
        ) : data.items.length === 0 ? (
          <EmptyState icon={KeyRound} title={t("roles.empty")} />
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {data.items.map((role) => (
              <li key={role.publicId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="me-auto min-w-0 space-y-0.5">
                  <Link
                    to="/company/roles/$publicId"
                    params={{ publicId: role.publicId }}
                    className="break-words text-sm font-medium underline-offset-4 hover:underline"
                  >
                    {role.name}
                  </Link>
                  {role.description && (
                    <p className="break-words text-xs text-[var(--color-text-muted)]">
                      {role.description}
                    </p>
                  )}
                </div>
                {role.isOwner && <Badge variant="primary">{t("roles.owner")}</Badge>}
                {role.isSystem && !role.isOwner && (
                  <Badge variant="default">{t("roles.system")}</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {data && data.meta.totalPages > 1 && (
        <nav
          aria-label={t("roster.pagination")}
          className="flex items-center justify-between gap-3 text-sm"
        >
          <Button intent="action" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {t("roster.previous")}
          </Button>
          <span>{t("roster.pageOf", { page, total: data.meta.totalPages })}</span>
          <Button
            intent="action"
            size="sm"
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            {t("roster.next")}
          </Button>
        </nav>
      )}

      <CreateRoleDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function CreateRoleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation("people");
  const { titleId, descriptionId } = useDialogIds();
  const navigate = useNavigate();
  const access = useCompanyAccess();
  const recover = useCompanyMutationRecovery();
  const queryClient = useQueryClient();
  const userPublicId = access.user?.publicId ?? "";
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: { name: "", description: "" },
  });
  const create = useMutation({
    retry: false,
    mutationFn: createRole,
    onSettled: () => queryClient.invalidateQueries({ queryKey: rolesRoot(userPublicId) }),
  });

  function close() {
    form.reset();
    setFailure(null);
    onClose();
  }

  async function submit(values: RoleFormValues) {
    setFailure(null);
    try {
      const role = await create.mutateAsync({
        name: values.name,
        description: values.description || undefined,
      });
      close();
      void navigate({ to: "/company/roles/$publicId", params: { publicId: role.publicId } });
    } catch (error) {
      const outcome = await recover(error);
      if (outcome.kind === "invalid" && outcome.fields.includes("name"))
        form.setError("name", { message: "rejected" });
      setFailure(t(`outcome.${outcome.kind}`));
    }
  }

  const nameError = form.formState.errors.name?.message;
  const descriptionError = form.formState.errors.description?.message;
  return (
    <Dialog
      open={open}
      onClose={close}
      dismissible={!create.isPending}
      titleId={titleId}
      descriptionId={descriptionId}
    >
      <DialogTitle id={titleId}>{t("roles.createTitle")}</DialogTitle>
      <DialogDescription id={descriptionId}>{t("roles.createDescription")}</DialogDescription>
      <form noValidate className="mt-4 space-y-3" onSubmit={form.handleSubmit(submit)}>
        <div className="space-y-1.5">
          <Label htmlFor="role-name">{t("field.roleName")}</Label>
          <Input
            id="role-name"
            aria-invalid={nameError !== undefined}
            aria-describedby={nameError ? "role-name-error" : undefined}
            disabled={create.isPending}
            {...form.register("name")}
          />
          {nameError && (
            <p id="role-name-error" className="text-xs text-[var(--color-danger)]">
              {t(`error.${nameError}`)}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role-description">{t("field.roleDescription")}</Label>
          <Textarea
            id="role-description"
            rows={3}
            aria-invalid={descriptionError !== undefined}
            disabled={create.isPending}
            {...form.register("description")}
          />
          {descriptionError && (
            <p className="text-xs text-[var(--color-danger)]">{t(`error.${descriptionError}`)}</p>
          )}
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
            {t("roles.createSubmit")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
