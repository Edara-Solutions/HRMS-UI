import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { delegatedCompanyOperations as operations } from "@/shared/api";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { QueryPanel } from "@/shared/ui/query-panel";
import { usersPageSize } from "../api/access-session";
import type { DelegatedEmployee } from "../model/employee-correction";
import type { AccessSessionWorkspace } from "../model/use-access-session-workspace";
import { EmployeeCorrectionDialog } from "./employee-correction-dialog";
import { PaginationFooter } from "./pagination-footer";

const knownEmployeeStatuses = [
  "ACTIVE",
  "ONBOARDING",
  "PROBATION",
  "SUSPENDED",
  "TERMINATED",
  "RESIGNED",
];

export function EmployeesPanel({ workspace }: { workspace: AccessSessionWorkspace }) {
  const { t } = useTranslation("platform-access-session");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<DelegatedEmployee | null>(null);
  const term = useDebouncedValue(search.trim(), 300);
  const query = { page, pageSize: usersPageSize, search: term || undefined };
  const readable = workspace.availability(operations.users).state === "enabled";
  const { data, error, isPending, isFetching, refetch } = useQuery({
    ...workspace.delegated.users(query),
    enabled: readable,
    placeholderData: keepPreviousData,
  });
  const correction = workspace.availability(operations.updateUser);

  if (!readable) return <p className="text-sm">{t("area.notGranted")}</p>;

  return (
    <QueryPanel
      title={t("employees.title")}
      pending={isPending}
      error={error}
      retry={() => void refetch()}
    >
      <div className="max-w-sm space-y-1.5">
        <Label htmlFor="delegated-employee-search">{t("employees.search")}</Label>
        <Input
          id="delegated-employee-search"
          type="search"
          maxLength={100}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </div>
      {data && data.items.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">
          {term ? t("employees.noMatches") : t("employees.empty")}
        </p>
      ) : (
        data && (
          <div className="scrollbar-calm overflow-x-auto" aria-busy={isFetching}>
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="sticky top-0 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">
                  <th scope="col" className="px-3 py-2 text-start font-semibold">
                    {t("employees.name")}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start font-semibold">
                    {t("employees.code")}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start font-semibold">
                    {t("employees.email")}
                  </th>
                  <th scope="col" className="px-3 py-2 text-start font-semibold">
                    {t("employees.status")}
                  </th>
                  {correction.state !== "hidden" && (
                    <th scope="col" className="px-3 py-2 text-end font-semibold">
                      <span className="sr-only">{t("employees.actions")}</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.items.map((employee) => (
                  <tr key={employee.publicId} className="border-b border-[var(--color-border)]">
                    <td className="px-3 py-2.5">
                      {employee.firstName} {employee.lastName}
                    </td>
                    <td className="px-3 py-2.5" dir="ltr">
                      {employee.employeeCode}
                    </td>
                    <td className="px-3 py-2.5" dir="ltr">
                      {employee.email}
                    </td>
                    <td className="px-3 py-2.5">
                      {knownEmployeeStatuses.includes(employee.status)
                        ? t(`employeeStatus.${employee.status}`)
                        : t("employeeStatus.unknown")}
                    </td>
                    {correction.state !== "hidden" && (
                      <td className="px-3 py-2.5 text-end">
                        <Button
                          intent="utility"
                          disabled={correction.state !== "enabled"}
                          aria-label={t("employees.correctNamed", {
                            name: `${employee.firstName} ${employee.lastName}`,
                          })}
                          onClick={() => setSelected(employee)}
                        >
                          {t("employees.correct")}
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
      {data && data.meta.totalPages > 1 && (
        <PaginationFooter
          summary={t("employees.count", { shown: data.items.length, total: data.meta.totalItems })}
          page={data.meta.page}
          totalPages={data.meta.totalPages}
          busy={isFetching}
          onPageChange={setPage}
        />
      )}
      <EmployeeCorrectionDialog
        employee={selected}
        workspace={workspace}
        onClose={() => setSelected(null)}
      />
    </QueryPanel>
  );
}
