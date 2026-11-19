import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { RegistryForm } from "@/features/platform-company-registry";
import {
  ContractViolation,
  OperationRefusal,
  platformCompanyOperations as operations,
  usePlatformAccess,
} from "@/shared/api";
import { RouteAccessRefusal } from "@/shared/auth";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { DataTable } from "@/shared/ui/data-table";
import { Dialog, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { companiesQuery } from "../api/companies";
import type { CompaniesSearch } from "../model/page-search";
import { RestoreCompany } from "./restore-company";

interface Props {
  search: CompaniesSearch;
}
const companyLink = (publicId: string, label: string) => (
  <Link
    to="/platform/companies/$publicId"
    params={{ publicId }}
    className="font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
  >
    <bdi>{label}</bdi>
  </Link>
);
export function PlatformCompaniesPage({ search }: Props) {
  const { t, i18n } = useTranslation("platform-companies");
  const access = usePlatformAccess();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const { titleId } = useDialogIds();
  const { data, error, isPending, isFetching, isError, refetch } = useQuery({
    ...companiesQuery(access.user?.publicId ?? "", search.page),
    enabled: access.availability(operations.companies.key).state === "enabled",
  });
  if (error instanceof OperationRefusal && [403, 404].includes(error.status)) throw error;
  if (!access.user) return null;
  if (access.availability(operations.companies.key).state === "hidden")
    throw new RouteAccessRefusal("platform");
  const create = access.availability(operations.create.key);
  const formatCreated = (value: string) =>
    new Intl.DateTimeFormat(i18n.language === "ar" ? "ar-SA-u-ca-gregory" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  const rows =
    data?.data.filter((company) =>
      `${company.name} ${company.companyCode} ${company.country}`
        .toLowerCase()
        .includes((search.q ?? "").toLowerCase()),
    ) ?? [];
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={t("registry.title")}
        description={t("registry.description")}
        action={
          create.state !== "hidden" && (
            <Button
              intent="cta"
              disabled={create.state !== "enabled" || isError}
              onClick={() => setCreating(true)}
            >
              {t("create")}
            </Button>
          )
        }
      />
      <Input
        type="search"
        aria-label={t("search")}
        value={search.q ?? ""}
        onChange={(event) =>
          void navigate({
            to: "/platform/companies",
            search: { ...search, q: event.target.value || undefined, page: 1 },
          })
        }
      />
      <Card aria-busy={isFetching}>
        <CardContent className="space-y-4 p-4">
          {isPending ? (
            <output>{t("loading")}</output>
          ) : isError ? (
            <div role="alert">
              <p>{t(error instanceof ContractViolation ? "contract" : "loadFailed")}</p>
              {!(error instanceof ContractViolation) && (
                <Button intent="action" onClick={() => void refetch()}>
                  {t("retry")}
                </Button>
              )}
            </div>
          ) : rows.length === 0 ? (
            <p>{t(search.q ? "noMatches" : "empty")}</p>
          ) : (
            <DataTable
              items={rows}
              getRowKey={(company) => company.publicId}
              minWidth="860px"
              columns={[
                {
                  id: "name",
                  header: t("field.name"),
                  cell: (company) => companyLink(company.publicId, company.name),
                },
                {
                  id: "code",
                  header: t("field.companyCode"),
                  cell: (company) => <bdi>{company.companyCode}</bdi>,
                },
                { id: "country", header: t("field.country"), cell: (company) => company.country },
                {
                  id: "lifecycle",
                  header: t("lifecycle.title"),
                  cell: (company) => (
                    <Badge variant={company.lifecycleStatus === "ACTIVE" ? "success" : "default"}>
                      {t(`state.${company.lifecycleStatus}`)}
                    </Badge>
                  ),
                },
                {
                  id: "active",
                  header: t("registry.isActive"),
                  cell: (company) => t(company.isActive ? "yes" : "no"),
                },
                {
                  id: "created",
                  header: t("createdAt"),
                  cell: (company) => (
                    <time dateTime={company.createdAt}>{formatCreated(company.createdAt)}</time>
                  ),
                },
                {
                  id: "action",
                  header: t("registry.action"),
                  cell: (company) => companyLink(company.publicId, t("registry.view")),
                },
              ]}
              renderMobileItem={(company) => (
                <div className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {companyLink(company.publicId, company.name)}
                    <Badge variant={company.lifecycleStatus === "ACTIVE" ? "success" : "default"}>
                      {t(`state.${company.lifecycleStatus}`)}
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    <bdi>{company.companyCode}</bdi> · {company.country} ·{" "}
                    {t(company.isActive ? "yes" : "no")}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    <time dateTime={company.createdAt}>{formatCreated(company.createdAt)}</time>
                  </p>
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>
      <nav aria-label={t("pagination")} className="flex flex-wrap justify-between gap-3">
        <Button
          intent="action"
          disabled={search.page <= 1 || isFetching}
          onClick={() =>
            void navigate({
              to: "/platform/companies",
              search: { ...search, page: search.page - 1 },
            })
          }
        >
          {t("previous")}
        </Button>
        <span>{t("page", { page: search.page, total: data?.meta.totalPages ?? 1 })}</span>
        <Button
          intent="action"
          disabled={!data || search.page >= data.meta.totalPages || isFetching}
          onClick={() =>
            void navigate({
              to: "/platform/companies",
              search: { ...search, page: search.page + 1 },
            })
          }
        >
          {t("next")}
        </Button>
      </nav>
      <RestoreCompany />
      <Dialog open={creating} onClose={() => setCreating(false)} titleId={titleId}>
        <DialogTitle id={titleId}>{t("create")}</DialogTitle>
        <RegistryForm
          onSaved={async (publicId) => {
            setCreating(false);
            await navigate({ to: "/platform/companies/$publicId", params: { publicId } });
          }}
        />
      </Dialog>
    </div>
  );
}
