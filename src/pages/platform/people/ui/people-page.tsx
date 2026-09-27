import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ContractViolation, OperationRefusal, usePlatformAccess } from "@/shared/api";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { DataTable } from "@/shared/ui/data-table";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import { Skeleton } from "@/shared/ui/skeleton";
import { rosterQuery } from "../api/people";
import type { PlatformPerson, RosterPage, RosterSearch } from "../model/roster";
import { InviteDialog } from "./invite-dialog";

interface PlatformPeoplePageProps {
  search: RosterSearch;
}

export function PlatformPeoplePage({ search }: PlatformPeoplePageProps) {
  const { t } = useTranslation("platform-people");
  const navigate = useNavigate();
  const access = usePlatformAccess();
  const page = search.page ?? 1;
  const roster = useQuery({
    ...rosterQuery(access.user?.publicId ?? "", page),
    enabled: access.user !== undefined,
  });
  const [inviting, setInviting] = useState(false);
  const invite = access.availability("POST /api/v1/platform/users");

  if (roster.error instanceof OperationRefusal && [403, 404].includes(roster.error.status))
    throw roster.error;
  if (!access.user) return null;
  const totalPages = roster.data?.meta.totalPages ?? 1;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={t("roster.title")}
        description={t("roster.description")}
        action={
          invite.state !== "hidden" && (
            <Button
              intent="cta"
              leadingIcon={<UserPlus aria-hidden="true" size={15} />}
              disabled={invite.state === "disabled"}
              onClick={() => setInviting(true)}
            >
              {t("invite.open")}
            </Button>
          )
        }
      />
      {invite.state === "disabled" && (
        <p className="text-xs text-[var(--color-text-muted)]">
          {t(`restriction.${invite.reason}`)}
        </p>
      )}

      <Card
        as="section"
        aria-labelledby="platform-roster-heading"
        aria-busy={roster.isFetching}
        className="min-w-0 overflow-hidden"
      >
        <h2 id="platform-roster-heading" className="sr-only">
          {t("roster.title")}
        </h2>
        <RosterContent roster={roster} self={access.user.publicId} />
      </Card>

      {totalPages > 1 && (
        <RosterPager
          page={page}
          totalPages={totalPages}
          onPage={(next) =>
            navigate({ to: "/platform/people", search: { page: next > 1 ? next : undefined } })
          }
        />
      )}

      <InviteDialog open={inviting} onClose={() => setInviting(false)} />
    </div>
  );
}

interface RosterContentProps {
  roster: UseQueryResult<RosterPage>;
  self: string;
}

function RosterContent({ roster, self }: RosterContentProps) {
  const { t } = useTranslation("platform-people");
  if (roster.isPending)
    return (
      <output className="block space-y-2 p-4" aria-label={t("state.loading")}>
        {[0, 1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-10 w-full" />
        ))}
      </output>
    );
  if (roster.isError)
    return (
      <div className="space-y-3 p-4 text-sm">
        {roster.error instanceof ContractViolation ? (
          <p>{t("state.contractUnavailable")}</p>
        ) : (
          <>
            <p>{t("state.loadFailed")}</p>
            <Button intent="action" size="sm" onClick={() => void roster.refetch()}>
              {t("state.retry")}
            </Button>
          </>
        )}
      </div>
    );
  if (roster.data.items.length === 0) return <EmptyState icon={Users} title={t("roster.empty")} />;
  return (
    <div className={roster.isPlaceholderData ? "opacity-60" : undefined}>
      <RosterTable people={roster.data.items} self={self} />
    </div>
  );
}

interface RosterTableProps {
  people: PlatformPerson[];
  self: string;
}

function RosterTable({ people, self }: RosterTableProps) {
  const { t } = useTranslation("platform-people");
  const locale = usePreferencesStore((state) => state.locale);
  return (
    <DataTable<PlatformPerson>
      items={people}
      getRowKey={(person) => person.publicId}
      minWidth="720px"
      columns={[
        {
          id: "name",
          header: t("roster.name"),
          cell: (person) => (
            <span className="flex flex-wrap items-center gap-2">
              <Link
                to="/platform/people/$publicId"
                params={{ publicId: person.publicId }}
                className="font-medium text-[var(--color-text)] underline-offset-4 hover:underline"
              >
                {person.firstName} {person.lastName}
              </Link>
              {person.publicId === self && <Badge variant="primary">{t("roster.you")}</Badge>}
            </span>
          ),
        },
        {
          id: "email",
          header: t("field.email"),
          cell: (person) => (
            <span dir="ltr" className="break-all">
              {person.email}
            </span>
          ),
        },
        {
          id: "team",
          header: t("field.team"),
          cell: (person) => person.team ?? t("state.notProvided"),
        },
        {
          id: "status",
          header: t("roster.status"),
          cell: (person) => (
            <Badge variant={person.status === "ACTIVE" ? "success" : "default"}>
              {t(`status.${person.status}`)}
            </Badge>
          ),
        },
        {
          id: "lastLogin",
          header: t("roster.lastLogin"),
          cell: (person) =>
            person.lastLoginAt
              ? formatInstant(person.lastLoginAt, locale)
              : t("roster.neverSignedIn"),
        },
      ]}
    />
  );
}

interface RosterPagerProps {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}

function RosterPager({ page, totalPages, onPage }: RosterPagerProps) {
  const { t } = useTranslation("platform-people");
  return (
    <nav
      aria-label={t("roster.pagination")}
      className="flex items-center justify-between gap-3 text-sm"
    >
      <Button
        intent="action"
        size="sm"
        leadingIcon={<ChevronLeft aria-hidden="true" size={15} className="rtl:rotate-180" />}
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        {t("roster.previous")}
      </Button>
      <span>{t("roster.pageOf", { page, total: totalPages })}</span>
      <Button
        intent="action"
        size="sm"
        leadingIcon={<ChevronRight aria-hidden="true" size={15} className="rtl:rotate-180" />}
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        {t("roster.next")}
      </Button>
    </nav>
  );
}
