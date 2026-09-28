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
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Dialog, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import { companiesQuery } from "../api/companies";
import type { CompaniesSearch } from "../model/page-search";
import { RestoreCompany } from "./restore-company";

interface Props {
  search: CompaniesSearch;
}
export function PlatformCompaniesPage({ search }: Props) {
  const { t } = useTranslation("platform-companies");
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
            rows.map((company) => (
              <article
                key={company.publicId}
                className="space-y-3 border-b border-[var(--color-border)] pb-4"
              >
                <Link
                  to="/platform/companies/$publicId"
                  params={{ publicId: company.publicId }}
                  className="font-semibold underline-offset-4 hover:underline"
                >
                  {company.name}
                </Link>
                <dl className="grid gap-3 text-sm sm:grid-cols-4">
                  {[
                    [t("field.companyCode"), company.companyCode],
                    [t("field.country"), company.country],
                    [t("lifecycle.title"), t(`state.${company.lifecycleStatus}`)],
                    [t("registry.isActive"), t(company.isActive ? "yes" : "no")],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[var(--color-text-muted)]">{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))
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
