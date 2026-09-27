import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { delegatedCompanyOperations as operations } from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { QueryPanel } from "@/shared/ui/query-panel";
import type { AccessSessionWorkspace } from "../model/use-access-session-workspace";
import { PaginationFooter } from "./pagination-footer";

export function RolesPanel({ workspace }: { workspace: AccessSessionWorkspace }) {
  const { t } = useTranslation("platform-access-session");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const readable = workspace.availability(operations.roles).state === "enabled";
  const { data, error, isPending, isFetching, refetch } = useQuery({
    ...workspace.delegated.roles(page),
    enabled: readable,
    placeholderData: keepPreviousData,
  });

  if (!readable) return <p className="text-sm">{t("area.notGranted")}</p>;

  return (
    <QueryPanel
      title={t("roles.title")}
      pending={isPending}
      error={error}
      retry={() => void refetch()}
    >
      <p className="text-sm text-[var(--color-text-muted)]">{t("roles.readOnly")}</p>
      {data && data.items.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)]">{t("roles.empty")}</p>
      )}
      <ul className="divide-y divide-[var(--color-border)]" aria-busy={isFetching}>
        {data?.items.map((role) => {
          const open = expanded === role.publicId;
          const detailId = `delegated-role-${role.publicId}`;
          return (
            <li key={role.publicId} className="space-y-2 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {role.name}
                    {role.isOwner && <Badge variant="primary">{t("roles.owner")}</Badge>}
                    {role.isSystem && <Badge>{t("roles.system")}</Badge>}
                  </p>
                  {role.description && (
                    <p className="text-sm text-[var(--color-text-muted)]">{role.description}</p>
                  )}
                </div>
                <Button
                  intent="utility"
                  aria-expanded={open}
                  aria-controls={detailId}
                  onClick={() => setExpanded(open ? null : role.publicId)}
                >
                  {open ? t("roles.hidePermissions") : t("roles.showPermissions")}
                </Button>
              </div>
              {open && (
                <div id={detailId}>
                  <RolePermissions workspace={workspace} rolePublicId={role.publicId} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {data && data.meta.totalPages > 1 && (
        <PaginationFooter
          summary={t("roles.count", { shown: data.items.length, total: data.meta.totalItems })}
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          busy={isFetching}
          onPageChange={setPage}
        />
      )}
    </QueryPanel>
  );
}

interface RolePermissionsProps {
  workspace: AccessSessionWorkspace;
  rolePublicId: string;
}

function RolePermissions({ workspace, rolePublicId }: RolePermissionsProps) {
  const { t } = useTranslation("platform-access-session");
  const { data, isPending, isError } = useQuery(workspace.delegated.role(rolePublicId));
  if (isPending) return <p className="text-sm text-[var(--color-text-muted)]">{t("loading")}</p>;
  if (isError) return <p className="text-sm">{t("roles.permissionsUnavailable")}</p>;
  if (data.permissions.length === 0)
    return <p className="text-sm text-[var(--color-text-muted)]">{t("roles.noPermissions")}</p>;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={t("roles.permissions")}>
      {data.permissions.map((permission) => (
        <li key={permission.publicId}>
          <Badge dir="ltr" className="font-mono">
            {permission.action}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
