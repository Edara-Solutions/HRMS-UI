import { useTranslation } from "react-i18next";
import { platformLeadOperations as operations } from "@/shared/api";
import { DateEdgeField } from "@/shared/ui/date-edge-field";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import type { LeadsSearch } from "../model/page-search";

interface Props {
  search: LeadsSearch;
  change: (update: Partial<LeadsSearch>) => void;
}
export function LeadFilters({ search, change }: Props) {
  const { t } = useTranslation("platform-leads");
  const selectClass =
    "w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2";
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div>
        <Label htmlFor="lead-status">{t("field.status")}</Label>
        <select
          id="lead-status"
          className={selectClass}
          value={search.status ?? ""}
          onChange={(event) => {
            const value = operations.lead.responses["200"].shape.lead.shape.status.safeParse(
              event.target.value,
            );
            change({ status: value.success ? value.data : undefined, page: 1 });
          }}
        >
          <option value="">{t("all")}</option>
          {operations.lead.responses["200"].shape.lead.shape.status.options.map(({ value }) => (
            <option key={value} value={value}>
              {t(`enum.${value}`)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="lead-source">{t("field.source")}</Label>
        <select
          id="lead-source"
          className={selectClass}
          value={search.source ?? ""}
          onChange={(event) => {
            const value = operations.create.requestSchema.shape.body.shape.source.safeParse(
              event.target.value,
            );
            change({ source: value.success ? value.data : undefined, page: 1 });
          }}
        >
          <option value="">{t("all")}</option>
          {operations.create.requestSchema.shape.body.shape.source.options.map(({ value }) => (
            <option key={value} value={value}>
              {t(`enum.${value}`)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="lead-country">{t("field.country")}</Label>
        <Input
          id="lead-country"
          value={search.country ?? ""}
          onChange={(event) => change({ country: event.target.value || undefined, page: 1 })}
        />
      </div>
      <div>
        <Label htmlFor="lead-sort">{t("sort")}</Label>
        <select
          id="lead-sort"
          className={selectClass}
          value={search.sort ?? "createdAtDesc"}
          onChange={(event) => {
            const value = operations.leads.requestSchema.shape.query.shape.sort.safeParse(
              event.target.value,
            );
            if (value.success) change({ sort: value.data, page: 1 });
          }}
        >
          {["createdAtAsc", "createdAtDesc", "lastAttemptAtAsc", "lastAttemptAtDesc"].map(
            (value) => (
              <option key={value} value={value}>
                {t(`sort.${value}`)}
              </option>
            ),
          )}
        </select>
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={search.isArchived}
          onChange={(event) => change({ isArchived: event.target.checked, page: 1 })}
        />
        {t("archived")}
      </label>
      <div>
        <Label htmlFor="page-size">{t("pageSize")}</Label>
        <select
          id="page-size"
          className={selectClass}
          value={search.pageSize}
          onChange={(event) => change({ pageSize: Number(event.target.value), page: 1 })}
        >
          {[10, 20, 50, 100].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <DateEdgeField
        label={t("createdFrom")}
        value={search.createdFrom}
        onChange={(value) => change({ createdFrom: value, page: 1 })}
      />
      <DateEdgeField
        label={t("createdTo")}
        value={search.createdTo}
        onChange={(value) => change({ createdTo: value, page: 1 })}
      />
    </div>
  );
}
