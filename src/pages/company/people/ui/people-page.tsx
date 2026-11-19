import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus, Search, Upload, Users } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ContractViolation,
  isCompanyBlocked,
  OperationRefusal,
  useCompanyAccess,
  useCompanyMutationRecovery,
} from "@/shared/api";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { CompanyAccessNotice } from "@/shared/ui/company-access-notice";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { DataTable } from "@/shared/ui/data-table";
import { EmptyState } from "@/shared/ui/empty-state";
import { EnumSelect } from "@/shared/ui/enum-select";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import { changePeopleStatus, deletePeople, rosterQuery, rosterRoot } from "../api/people";
import {
  type BulkSummary,
  type Person,
  type PersonStatus,
  personStatuses,
  type RosterSearch,
  summarizeBulk,
} from "../model/roster";
import { BulkAddDialog } from "./bulk-add-dialog";
import { BulkSummaryNotice } from "./bulk-summary-notice";
import { CreatePersonDialog } from "./create-person-dialog";

interface CompanyPeoplePageProps {
  search: RosterSearch;
}

type PendingBulk = { kind: "status"; status: PersonStatus } | { kind: "delete" };

export function CompanyPeoplePage({ search }: CompanyPeoplePageProps) {
  const { t } = useTranslation("people");
  const locale = usePreferencesStore((state) => state.locale);
  const navigate = useNavigate();
  const access = useCompanyAccess();
  const recover = useCompanyMutationRecovery();
  const queryClient = useQueryClient();
  const userPublicId = access.user?.publicId ?? "";
  const { data, error, isPending, isError, isFetching, isPlaceholderData, refetch } = useQuery({
    ...rosterQuery(userPublicId, search),
    enabled: access.user !== undefined,
  });
  const [draft, setDraft] = useState(search.q ?? "");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<PersonStatus>();
  const [pendingBulk, setPendingBulk] = useState<PendingBulk | null>(null);
  const [summary, setSummary] = useState<{
    action: "status" | "delete";
    result: BulkSummary;
    labels: string[];
  } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [bulkAdding, setBulkAdding] = useState(false);
  const canCreate = access.availability("POST /api/v1/company/users");
  const canBulkCreate = access.availability("POST /api/v1/company/users/bulk");
  const canBulkUpdate = access.availability("PATCH /api/v1/company/users/bulk");
  const canBulkDelete = access.availability("DELETE /api/v1/company/users/bulk");
  const selectable = canBulkUpdate.state !== "hidden" || canBulkDelete.state !== "hidden";

  const bulk = useMutation({
    retry: false,
    mutationFn: async ({ action, targets }: { action: PendingBulk; targets: Person[] }) => {
      const ids = targets.map((person) => person.publicId);
      return action.kind === "status" ? changePeopleStatus(ids, action.status) : deletePeople(ids);
    },
    onSuccess: (result, { action, targets }) => {
      setSummary({
        action: action.kind,
        result: summarizeBulk(result, targets.length),
        labels: targets.map((person) => `${person.firstName} ${person.lastName}`),
      });
      setSelected(new Set());
    },
    onError: async (mutationError) => {
      const outcome = await recover(mutationError);
      setFailure(t(`outcome.${outcome.kind}`));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: rosterRoot(userPublicId) }),
  });

  if (isCompanyBlocked(error)) throw error;
  if (error instanceof OperationRefusal && [403, 404].includes(error.status)) throw error;
  if (!access.user) return null;
  const self = access.user.publicId;
  const people = data?.items ?? [];
  const page = data?.meta.page ?? search.page ?? 1;
  const totalPages = data?.meta.totalPages ?? 1;
  const filtered = Boolean(search.q || search.status);
  const selectedPeople = people.filter((person) => selected.has(person.publicId));

  function applySearch(next: RosterSearch) {
    setSelected(new Set());
    void navigate({ to: "/company/people", search: next });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    applySearch({ ...search, q: draft.trim() || undefined, page: undefined });
  }

  function toggle(publicId: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(publicId);
      else next.delete(publicId);
      return next;
    });
  }

  const statusOptions = personStatuses.map((status) => ({
    value: status,
    label: t(`status.${status}`),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">{t("roster.title")}</h1>
          <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-muted)]">
            {t("roster.description")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canBulkCreate.state !== "hidden" && (
            <Button
              intent="action"
              leadingIcon={<Upload aria-hidden="true" size={15} />}
              disabled={canBulkCreate.state === "disabled"}
              onClick={() => setBulkAdding(true)}
            >
              {t("bulkAdd.open")}
            </Button>
          )}
          {canCreate.state !== "hidden" && (
            <Button
              intent="cta"
              leadingIcon={<Plus aria-hidden="true" size={15} />}
              disabled={canCreate.state === "disabled"}
              onClick={() => setCreating(true)}
            >
              {t("create.open")}
            </Button>
          )}
        </div>
      </header>

      {access.policy && <CompanyAccessNotice {...access.policy} />}

      <form role="search" onSubmit={submitSearch} className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="roster-search">{t("roster.search")}</Label>
          <Input
            id="roster-search"
            type="search"
            maxLength={100}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </div>
        <div className="w-48 space-y-1.5">
          <Label htmlFor="roster-status">{t("roster.statusFilter")}</Label>
          <EnumSelect
            id="roster-status"
            value={search.status ?? "ALL"}
            options={[{ value: "ALL", label: t("roster.allStatuses") }, ...statusOptions]}
            onValueChange={(value) =>
              applySearch({
                ...search,
                status: value === "ALL" ? undefined : value,
                page: undefined,
              })
            }
          />
        </div>
        <Button type="submit" intent="action" leadingIcon={<Search aria-hidden="true" size={15} />}>
          {t("roster.searchAction")}
        </Button>
      </form>

      {summary && (
        <BulkSummaryNotice
          action={summary.action}
          summary={summary.result}
          labels={summary.labels}
          onDismiss={() => setSummary(null)}
        />
      )}
      {failure && (
        <p role="alert" className="text-sm">
          {failure}
        </p>
      )}

      {selectable && selectedPeople.length > 0 && (
        <section
          aria-label={t("bulk.toolbar")}
          className="flex flex-wrap items-end gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3"
        >
          <p className="me-auto self-center text-sm font-medium">
            {t("bulk.selected", { count: selectedPeople.length })}
          </p>
          {canBulkUpdate.state !== "hidden" && (
            <>
              <div className="w-44 space-y-1.5">
                <Label htmlFor="bulk-status">{t("bulk.newStatus")}</Label>
                <EnumSelect
                  id="bulk-status"
                  value={bulkStatus}
                  placeholder={t("bulk.chooseStatus")}
                  options={statusOptions}
                  disabled={canBulkUpdate.state === "disabled"}
                  onValueChange={setBulkStatus}
                />
              </div>
              <Button
                intent="action"
                disabled={canBulkUpdate.state === "disabled" || !bulkStatus || bulk.isPending}
                onClick={() => bulkStatus && setPendingBulk({ kind: "status", status: bulkStatus })}
              >
                {t("bulk.applyStatus")}
              </Button>
            </>
          )}
          {canBulkDelete.state !== "hidden" && (
            <Button
              intent="destructive-trigger"
              disabled={canBulkDelete.state === "disabled" || bulk.isPending}
              onClick={() => setPendingBulk({ kind: "delete" })}
            >
              {t("bulk.delete")}
            </Button>
          )}
          {[
            ...new Set(
              [canBulkUpdate, canBulkDelete].flatMap((availability) =>
                availability.state === "disabled" ? [availability.reason] : [],
              ),
            ),
          ].map((reason) => (
            <p key={reason} className="w-full text-xs text-[var(--color-text-muted)]">
              {t(`restriction.${reason}`)}
            </p>
          ))}
        </section>
      )}

      <Card
        as="section"
        aria-labelledby="roster-heading"
        aria-busy={isFetching}
        className="min-w-0 overflow-hidden"
      >
        <h2 id="roster-heading" className="sr-only">
          {t("roster.title")}
        </h2>
        {isPending ? (
          <output className="block space-y-2 p-4" aria-label={t("state.loading")}>
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-10 w-full" />
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
        ) : people.length === 0 ? (
          <EmptyState
            icon={Users}
            title={filtered ? t("roster.noMatches") : t("roster.empty")}
            action={
              filtered ? (
                <Button
                  intent="action"
                  size="sm"
                  onClick={() => {
                    setDraft("");
                    applySearch({});
                  }}
                >
                  {t("roster.clearFilters")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className={isPlaceholderData ? "opacity-60" : undefined}>
            <DataTable<Person>
              items={people}
              getRowKey={(person) => person.publicId}
              minWidth="720px"
              columns={[
                ...(selectable
                  ? [
                      {
                        id: "select",
                        header: <span className="sr-only">{t("bulk.select")}</span>,
                        cell: (person: Person) => (
                          <input
                            type="checkbox"
                            className="size-4 accent-[var(--color-primary)]"
                            aria-label={t("bulk.selectPerson", {
                              name: `${person.firstName} ${person.lastName}`,
                            })}
                            checked={selected.has(person.publicId)}
                            disabled={person.publicId === self}
                            onChange={(event) => toggle(person.publicId, event.target.checked)}
                          />
                        ),
                      },
                    ]
                  : []),
                {
                  id: "name",
                  header: t("roster.name"),
                  cell: (person) => (
                    <span className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/company/people/$publicId"
                        params={{ publicId: person.publicId }}
                        className="font-medium text-[var(--color-text)] underline-offset-4 hover:underline"
                      >
                        {person.firstName} {person.lastName}
                      </Link>
                      {person.publicId === self && (
                        <Badge variant="primary">{t("roster.you")}</Badge>
                      )}
                    </span>
                  ),
                },
                {
                  id: "email",
                  header: t("roster.email"),
                  cell: (person) => (
                    <span dir="ltr" className="break-all">
                      {person.email}
                    </span>
                  ),
                },
                {
                  id: "code",
                  header: t("roster.code"),
                  cell: (person) => <span dir="ltr">{person.employeeCode}</span>,
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
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <nav
          aria-label={t("roster.pagination")}
          className="flex items-center justify-between gap-3 text-sm"
        >
          <Button
            intent="action"
            size="sm"
            leadingIcon={<ChevronLeft aria-hidden="true" size={15} className="rtl:rotate-180" />}
            disabled={page <= 1}
            onClick={() => applySearch({ ...search, page: page - 1 })}
          >
            {t("roster.previous")}
          </Button>
          <span>{t("roster.pageOf", { page, total: totalPages })}</span>
          <Button
            intent="action"
            size="sm"
            leadingIcon={<ChevronRight aria-hidden="true" size={15} className="rtl:rotate-180" />}
            disabled={page >= totalPages}
            onClick={() => applySearch({ ...search, page: page + 1 })}
          >
            {t("roster.next")}
          </Button>
        </nav>
      )}

      <CreatePersonDialog open={creating} onClose={() => setCreating(false)} />
      <BulkAddDialog open={bulkAdding} onClose={() => setBulkAdding(false)} />

      <ConfirmDialog
        open={pendingBulk !== null}
        tone={pendingBulk?.kind === "delete" ? "destructive" : "consequential"}
        title={
          pendingBulk?.kind === "delete"
            ? t("bulk.deleteConfirm.title", { count: selectedPeople.length })
            : t("bulk.statusConfirm.title", { count: selectedPeople.length })
        }
        description={
          pendingBulk?.kind === "delete"
            ? t("bulk.deleteConfirm.description")
            : t("bulk.statusConfirm.description", {
                status: pendingBulk?.kind === "status" ? t(`status.${pendingBulk.status}`) : "",
              })
        }
        typedConfirmation={
          pendingBulk?.kind === "delete"
            ? {
                label: t("bulk.deleteConfirm.typed", { count: selectedPeople.length }),
                target: String(selectedPeople.length),
              }
            : undefined
        }
        confirmLabel={pendingBulk?.kind === "delete" ? t("bulk.delete") : t("bulk.applyStatus")}
        cancelLabel={t("state.cancel")}
        isLoading={bulk.isPending}
        onClose={() => setPendingBulk(null)}
        onConfirm={() => {
          if (!pendingBulk) return;
          setSummary(null);
          setFailure(null);
          bulk.mutate({ action: pendingBulk, targets: selectedPeople });
          setPendingBulk(null);
        }}
      />
    </div>
  );
}
