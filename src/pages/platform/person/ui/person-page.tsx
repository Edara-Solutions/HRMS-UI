import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  ContractViolation,
  type OperationKey,
  OperationRefusal,
  usePlatformAccess,
} from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Skeleton } from "@/shared/ui/skeleton";
import { personQueries, personRoots } from "../api/person";
import { type PersonCommand, type PersonRecord, personTarget, targetFacts } from "../model/person";
import { useConfirmedCommand } from "../model/use-confirmed-command";
import { PersonAccountCard } from "./person-account-card";
import { PersonProfileForm } from "./person-profile-form";
import { PersonRolesCard } from "./person-roles-card";
import { PersonSessionsCard } from "./person-sessions-card";

interface PlatformPersonPageProps {
  publicId: string;
}

export function PlatformPersonPage({ publicId }: PlatformPersonPageProps) {
  const { t } = useTranslation("platform-people");
  const access = usePlatformAccess();
  const {
    data: person,
    error,
    isPending,
    isError,
    refetch,
  } = useQuery({
    ...personQueries(access.user?.publicId ?? "", publicId).person,
    enabled: access.user !== undefined,
  });

  if (error instanceof OperationRefusal && [403, 404].includes(error.status)) throw error;
  if (!access.user) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        to="/platform/people"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft aria-hidden="true" size={15} className="rtl:rotate-180" />
        {t("person.back")}
      </Link>
      {isPending ? (
        <output className="block space-y-3" aria-label={t("state.loading")}>
          <Skeleton className="h-9 w-1/2" />
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
        <PersonWorkspace person={person} />
      )}
    </div>
  );
}

interface PersonWorkspaceProps {
  person: PersonRecord;
}

function PersonWorkspace({ person }: PersonWorkspaceProps) {
  const { t } = useTranslation("platform-people");
  const navigate = useNavigate();
  const access = usePlatformAccess();
  const actor = access.user;
  const userPublicId = actor?.publicId ?? "";
  const queries = personQueries(userPublicId, person.publicId);
  const canReadAuthority =
    access.availability("GET /api/v1/platform/role-assignments").state !== "hidden";
  const canReadSessions =
    access.availability("GET /api/v1/platform/users/{publicId}/sessions").state !== "hidden";
  const assignments = useQuery({ ...queries.assignments, enabled: canReadAuthority });
  const roles = useQuery({ ...queries.roles, enabled: canReadAuthority });
  const commands = useConfirmedCommand(personRoots(userPublicId));
  if (!actor) return null;
  const target = personTarget(actor, person, assignments.data?.items, roles.data?.items);
  const name = `${person.firstName} ${person.lastName}`;
  const availability = (operation: OperationKey, command: PersonCommand) =>
    access.availability(
      operation,
      targetFacts(target, access.facts.root ?? false, person.status, command),
    );

  return (
    <>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight">{name}</h1>
        <Badge variant={person.status === "ACTIVE" ? "success" : "default"}>
          {t(`status.${person.status}`)}
        </Badge>
        {target.root && <Badge variant="primary">{t("roles.root")}</Badge>}
        {target.self && <Badge variant="default">{t("roster.you")}</Badge>}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <PersonProfileForm person={person} />
          {canReadSessions && (
            <PersonSessionsCard
              person={person}
              revoke={availability(
                "DELETE /api/v1/platform/users/{publicId}/sessions/{sessionPublicId}",
                "revoke-sessions",
              )}
              revokeAll={availability(
                "DELETE /api/v1/platform/users/{publicId}/sessions",
                "revoke-sessions",
              )}
              commands={commands}
            />
          )}
        </div>
        <div className="space-y-6">
          {canReadAuthority && (
            <PersonRolesCard
              person={person}
              assignments={assignments}
              roles={roles.data?.items}
              assign={availability("POST /api/v1/platform/role-assignments", "assign-role")}
              revoke={availability(
                "DELETE /api/v1/platform/role-assignments/{assignmentPublicId}",
                "revoke-assignment",
              )}
              commands={commands}
            />
          )}
          <PersonAccountCard
            person={person}
            invitation={availability(
              "POST /api/v1/platform/users/{publicId}/invitation",
              "invitation",
            )}
            recovery={availability(
              "POST /api/v1/platform/users/{publicId}/password-reset",
              "password-reset",
            )}
            suspend={availability("POST /api/v1/platform/users/{publicId}/suspend", "suspend")}
            unsuspend={availability(
              "POST /api/v1/platform/users/{publicId}/unsuspend",
              "unsuspend",
            )}
            remove={availability("DELETE /api/v1/platform/users/{publicId}", "delete")}
            commands={commands}
            onDeleted={() => navigate({ to: "/platform/people" })}
          />
        </div>
      </div>

      {commands.feedback && (
        <p role={commands.feedback.tone === "alert" ? "alert" : "status"} className="text-sm">
          {commands.feedback.message}
        </p>
      )}

      <ConfirmDialog
        open={commands.pending !== null}
        title={commands.pending?.title ?? ""}
        description={commands.pending?.description ?? ""}
        confirmLabel={commands.pending?.confirmLabel ?? ""}
        cancelLabel={t("state.cancel")}
        tone={commands.pending?.tone}
        typedConfirmation={commands.pending?.typedTarget}
        isLoading={commands.busy}
        onClose={commands.cancel}
        onConfirm={commands.confirm}
      />
    </>
  );
}
