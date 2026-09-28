import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  ContractViolation,
  isCompanyBlocked,
  loadCompanyIdentity,
  type OperationKey,
  OperationRefusal,
  useCompanyAccess,
} from "@/shared/api";
import { useCompanySession } from "@/shared/auth";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { CompanyAccessNotice } from "@/shared/ui/company-access-notice";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Skeleton } from "@/shared/ui/skeleton";
import { personQueries, personRoots } from "../api/person";
import { type PersonCommand, type PersonRecord, personTarget, targetFacts } from "../model/person";
import { useConfirmedCommand } from "../model/use-confirmed-command";
import { PersonAccessCard } from "./person-access-card";
import { PersonAccountCard } from "./person-account-card";
import { PersonProfileForm } from "./person-profile-form";
import { PersonSessionsCard } from "./person-sessions-card";

interface CompanyPersonPageProps {
  publicId: string;
}

export function CompanyPersonPage({ publicId }: CompanyPersonPageProps) {
  const { t } = useTranslation("people");
  const access = useCompanyAccess();
  const userPublicId = access.user?.publicId ?? "";
  const queries = personQueries(userPublicId, publicId);
  const can = (operation: OperationKey) => access.availability(operation).state !== "hidden";
  const {
    data: person,
    error,
    isPending,
    isError,
    refetch,
  } = useQuery({
    ...queries.person,
    enabled: access.user !== undefined,
  });

  if (isCompanyBlocked(error)) throw error;
  if (error instanceof OperationRefusal && [403, 404].includes(error.status)) throw error;
  if (!access.user) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        to="/company/people"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft aria-hidden="true" size={15} className="rtl:rotate-180" />
        {t("person.back")}
      </Link>
      {access.policy && <CompanyAccessNotice {...access.policy} />}
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
        <PersonWorkspace person={person} canReadRoles={can("GET /api/v1/company/roles")} />
      )}
    </div>
  );
}

function PersonWorkspace({
  person,
  canReadRoles,
}: {
  person: PersonRecord;
  canReadRoles: boolean;
}) {
  const { t } = useTranslation("people");
  const navigate = useNavigate();
  const access = useCompanyAccess();
  const actor = access.user;
  const userPublicId = actor?.publicId ?? "";
  const queries = personQueries(userPublicId, person.publicId);
  const canReadSessions = access.availability("GET /api/v1/company/users/{publicId}/sessions");
  const { data: assignment, isPending: assignmentPending } = useQuery(queries.role);
  const { data: roles } = useQuery({ ...queries.roles, enabled: canReadRoles });
  const commands = useConfirmedCommand(personRoots(userPublicId));
  if (!actor) return null;
  const target = personTarget(actor, person, assignment, roles?.items ?? []);
  const name = `${person.firstName} ${person.lastName}`;
  const availability = (operation: OperationKey, command: PersonCommand) =>
    access.availability(operation, targetFacts(target, command));

  return (
    <>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight">{name}</h1>
        <Badge variant={person.status === "ACTIVE" ? "success" : "default"}>
          {t(`status.${person.status}`)}
        </Badge>
        {target.owner && <Badge variant="primary">{t("person.owner")}</Badge>}
        {target.self && <Badge variant="default">{t("roster.you")}</Badge>}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <PersonProfileForm person={person} />
          {canReadSessions.state !== "hidden" && (
            <PersonSessionsCard
              person={person}
              revoke={availability(
                "DELETE /api/v1/company/users/{publicId}/sessions/{sessionPublicId}",
                "revoke-session",
              )}
              commands={commands}
            />
          )}
        </div>
        <div className="space-y-6">
          <PersonAccessCard
            person={person}
            assignment={assignment}
            assignmentPending={assignmentPending}
            roles={roles?.items}
            target={target}
            assign={availability("POST /api/v1/company/users/{publicId}/role", "assign-role")}
            revoke={availability("DELETE /api/v1/company/users/{publicId}/role", "revoke-role")}
            transfer={availability("POST /api/v1/company/roles/transfer-ownership", "transfer")}
            commands={commands}
            onTransferred={() =>
              // The actor gives up Owner authority: re-read it before rendering any control again.
              useCompanySession.getState().revalidate(loadCompanyIdentity)
            }
          />
          <PersonAccountCard
            person={person}
            invitation={availability(
              "POST /api/v1/company/users/{publicId}/invitation",
              "invitation",
            )}
            passwordReset={availability(
              "POST /api/v1/company/users/{publicId}/password-reset",
              "password-reset",
            )}
            remove={availability("DELETE /api/v1/company/users/{publicId}", "delete")}
            commands={commands}
            onDeleted={() => navigate({ to: "/company/people" })}
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
