import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { KeyRound, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ContractViolation, OperationRefusal, usePlatformAccess } from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { DataTable } from "@/shared/ui/data-table";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";
import { rolesQuery } from "../api/roles";
import type { PlatformRole } from "../model/grants";
import { CreateRoleDialog } from "./create-role-dialog";

export function PlatformRolesPage() {
  const { t } = useTranslation("platform-people");
  const access = usePlatformAccess();
  const roles = useQuery({
    ...rolesQuery(access.user?.publicId ?? ""),
    enabled: access.user !== undefined,
  });
  const [creating, setCreating] = useState(false);
  const create = access.availability("POST /api/v1/platform/roles");

  if (roles.error instanceof OperationRefusal && [403, 404].includes(roles.error.status))
    throw roles.error;
  if (!access.user) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("roles.title")}
        description={t("roles.description")}
        action={
          create.state !== "hidden" && (
            <Button
              intent="cta"
              leadingIcon={<Plus aria-hidden="true" size={15} />}
              disabled={create.state === "disabled"}
              onClick={() => setCreating(true)}
            >
              {t("roles.create.open")}
            </Button>
          )
        }
      />
      {create.state === "disabled" && (
        <p className="text-xs text-[var(--color-text-muted)]">
          {t(`restriction.${create.reason}`)}
        </p>
      )}

      <Card
        as="section"
        aria-labelledby="platform-roles-heading"
        className="min-w-0 overflow-hidden"
      >
        <h2 id="platform-roles-heading" className="sr-only">
          {t("roles.title")}
        </h2>
        <RolesContent roles={roles} />
      </Card>

      <CreateRoleDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

interface RolesContentProps {
  roles: UseQueryResult<{ items: PlatformRole[] }>;
}

function RolesContent({ roles }: RolesContentProps) {
  const { t } = useTranslation("platform-people");
  if (roles.isPending)
    return (
      <output className="block space-y-2 p-4" aria-label={t("state.loading")}>
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-10 w-full" />
        ))}
      </output>
    );
  if (roles.isError)
    return (
      <div className="space-y-3 p-4 text-sm">
        {roles.error instanceof ContractViolation ? (
          <p>{t("state.contractUnavailable")}</p>
        ) : (
          <>
            <p>{t("state.loadFailed")}</p>
            <Button intent="action" size="sm" onClick={() => void roles.refetch()}>
              {t("state.retry")}
            </Button>
          </>
        )}
      </div>
    );
  if (roles.data.items.length === 0) return <EmptyState icon={KeyRound} title={t("roles.empty")} />;
  return (
    <DataTable<PlatformRole>
      items={roles.data.items}
      getRowKey={(role) => role.publicId}
      minWidth="560px"
      columns={[
        {
          id: "name",
          header: t("field.roleName"),
          cell: (role) => (
            <span className="flex flex-wrap items-center gap-2">
              <Link
                to="/platform/roles/$publicId"
                params={{ publicId: role.publicId }}
                className="font-medium text-[var(--color-text)] underline-offset-4 hover:underline"
              >
                {role.name}
              </Link>
              {role.isSystem && <Badge variant="primary">{t("roles.root")}</Badge>}
            </span>
          ),
        },
        {
          id: "description",
          header: t("field.roleDescription"),
          cell: (role) => role.description ?? t("state.notProvided"),
        },
        {
          id: "grants",
          header: t("roles.grantCount"),
          cell: (role) => t("roles.grants", { count: role.actions.length }),
        },
      ]}
    />
  );
}
