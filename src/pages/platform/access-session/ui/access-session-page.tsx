import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ContractViolation,
  delegatedCompanyOperations,
  OperationRefusal,
  platformCompanyOperations,
} from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { PageTabs } from "@/shared/ui/page-tabs";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  type AccessSession,
  areaAlternativeReads,
  areaReadOperation,
  type WorkspaceArea,
  type WorkspaceSearch,
  workspaceAreas,
} from "../model/session";
import {
  type AccessSessionWorkspace,
  useAccessSessionWorkspace,
} from "../model/use-access-session-workspace";
import { EmailPanel } from "./email-panel";
import { EmployeesPanel } from "./employees-panel";
import { ProfileSetupPanel } from "./profile-setup-panel";
import { RolesPanel } from "./roles-panel";
import { ScopedAuditPanel } from "./scoped-audit-panel";
import { SessionRail } from "./session-rail";

interface AccessSessionPageProps {
  sessionPublicId: string;
  search: WorkspaceSearch;
}

export function AccessSessionPage({ sessionPublicId, search }: AccessSessionPageProps) {
  const { t } = useTranslation("platform-access-session");
  const workspace = useAccessSessionWorkspace(sessionPublicId);
  const { session, sessionError: error } = workspace;
  const companyReadable =
    workspace.access.availability(platformCompanyOperations.company.key).state === "enabled";
  const { data: company } = useQuery({
    ...workspace.queries.company(session?.companyPublicId ?? ""),
    enabled: session !== undefined && companyReadable,
  });
  const { data: profile } = useQuery({
    ...workspace.delegated.profile,
    enabled:
      !companyReadable &&
      workspace.state === "open" &&
      workspace.availability(delegatedCompanyOperations.profile).state === "enabled",
  });

  if (error instanceof OperationRefusal && [403, 404].includes(error.status)) throw error;
  if (!workspace.access.user) return null;

  if (!session)
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        {error ? (
          <Card>
            <CardContent className="space-y-3 p-4 text-sm" role="alert">
              <p>{error instanceof ContractViolation ? t("state.contract") : t("state.failed")}</p>
              {!(error instanceof ContractViolation) && (
                <Button intent="action" onClick={() => void workspace.refetchSession()}>
                  {t("retry")}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <output className="block space-y-3" aria-label={t("loading")}>
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-64 w-full" />
          </output>
        )}
      </div>
    );

  const companyName = company?.name ?? profile?.name ?? t("companyFallback");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link
        to="/platform/companies/$publicId"
        params={{ publicId: session.companyPublicId }}
        className="text-sm underline"
      >
        {t("back")}
      </Link>
      <PageHeader title={t("title", { company: companyName })} description={t("description")} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <main className="min-w-0" aria-label={t("workspaceLabel")}>
          <WorkspaceContent workspace={workspace} session={session} area={search.area} />
        </main>
        <SessionRail session={session} companyName={companyName} workspace={workspace} />
      </div>
    </div>
  );
}

interface WorkspaceContentProps {
  workspace: AccessSessionWorkspace;
  session: AccessSession;
  area: WorkspaceArea | undefined;
}

function WorkspaceContent({ workspace, session, area }: WorkspaceContentProps) {
  const { t } = useTranslation("platform-access-session");
  const navigate = useNavigate();

  if (workspace.state !== "open")
    return (
      <Card>
        <CardContent className="space-y-2 p-6" role="status">
          <h2 className="text-lg font-semibold">{t(`ended.${workspace.state}.title`)}</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            {t(`ended.${workspace.state}.description`)}
          </p>
        </CardContent>
      </Card>
    );

  const visible = workspaceAreas.filter((candidate) =>
    [areaReadOperation[candidate], ...(areaAlternativeReads[candidate] ?? [])].some(
      (name) => workspace.availability(delegatedCompanyOperations[name]).state === "enabled",
    ),
  );
  if (visible.length === 0)
    return (
      <Card>
        <CardContent className="p-6 text-sm" role="status">
          {t("area.none")}
        </CardContent>
      </Card>
    );
  const active = area && visible.includes(area) ? area : visible[0];

  return (
    <div>
      <PageTabs
        ariaLabel={t("areasLabel")}
        value={active}
        items={visible.map((value) => ({ value, label: t(`area.${value}`) }))}
        onValueChange={(value) =>
          void navigate({
            to: "/platform/access-sessions/$sessionPublicId",
            params: { sessionPublicId: session.publicId },
            search: { area: value },
          })
        }
      />
      {active === "employees" && <EmployeesPanel workspace={workspace} />}
      {active === "roles" && <RolesPanel workspace={workspace} />}
      {active === "profile" && <ProfileSetupPanel workspace={workspace} />}
      {active === "email" && <EmailPanel workspace={workspace} />}
      {active === "audit" && <ScopedAuditPanel workspace={workspace} />}
    </div>
  );
}
