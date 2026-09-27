import { useQuery } from "@tanstack/react-query";
import { Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ContractViolation, OperationRefusal, usePlatformAccess } from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";
import { rolesQuery } from "../api/roles";
import { isSelfHeld, type PlatformRole } from "../model/grants";
import { RoleDeleteCard } from "./role-delete-card";
import { RoleDetailsCard } from "./role-details-card";
import { RoleGrantsCard } from "./role-grants-card";

interface PlatformRolePageProps {
  publicId: string;
}

export function PlatformRolePage({ publicId }: PlatformRolePageProps) {
  const { t } = useTranslation("platform-people");
  const access = usePlatformAccess();
  const { data, error, isPending, refetch } = useQuery({
    ...rolesQuery(access.user?.publicId ?? ""),
    enabled: access.user !== undefined,
  });

  if (error instanceof OperationRefusal && [403, 404].includes(error.status)) throw error;
  const role = data?.items.find((candidate) => candidate.publicId === publicId);
  // A role missing from the catalogue is concealed exactly like an unknown route.
  if (data && !role) throw notFound();
  if (!access.user) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        to="/platform/roles"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft aria-hidden="true" size={15} className="rtl:rotate-180" />
        {t("role.back")}
      </Link>
      {role ? (
        <RoleWorkspace key={role.publicId} role={role} />
      ) : isPending ? (
        <output className="block space-y-3" aria-label={t("state.loading")}>
          <Skeleton className="h-9 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </output>
      ) : (
        <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 text-sm">
          {error instanceof ContractViolation ? (
            <p>{t("state.contractUnavailable")}</p>
          ) : (
            <>
              <p>{t("state.loadFailed")}</p>
              <Button intent="action" size="sm" onClick={() => void refetch()}>
                {t("state.retry")}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface RoleWorkspaceProps {
  role: PlatformRole;
}

function RoleWorkspace({ role }: RoleWorkspaceProps) {
  const { t } = useTranslation("platform-people");
  const access = usePlatformAccess();
  const selfHeld = isSelfHeld(role, access.user?.roleNames ?? []);
  // The root role is immutable to runtime CRUD; a role the actor holds keeps its grants.
  const protectedRole = { systemRole: role.isSystem, selfHeldRole: selfHeld };
  const update = access.availability("PATCH /api/v1/platform/roles/{rolePublicId}", {
    target: { systemRole: role.isSystem },
  });
  const grant = access.availability("PATCH /api/v1/platform/roles/{rolePublicId}", {
    target: protectedRole,
  });
  const remove = access.availability("DELETE /api/v1/platform/roles/{rolePublicId}", {
    target: protectedRole,
  });

  return (
    <>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight">{role.name}</h1>
        {role.isSystem && <Badge variant="primary">{t("roles.root")}</Badge>}
        {selfHeld && <Badge variant="default">{t("role.youHold")}</Badge>}
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <RoleGrantsCard role={role} grant={grant} />
        <div className="space-y-6">
          <RoleDetailsCard role={role} update={update} />
          {remove.state !== "hidden" && <RoleDeleteCard role={role} remove={remove} />}
        </div>
      </div>
    </>
  );
}
