import { RotateCcw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { platformLeadOperations as operations } from "@/shared/api";
import { usePreferencesStore } from "@/shared/config";
import { getDateEdgeDate, getDateEdgeType } from "@/shared/lib/date-edge";
import { Button } from "@/shared/ui/button";
import { DatePicker, type DatePickerText } from "@/shared/ui/date-picker";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import type { LeadsSearch } from "../model/page-search";

const ALL = "ALL";
const TYPING_DELAY_MS = 300;
const statuses = operations.lead.responses["200"].shape.lead.shape.status.options.map(
  ({ value }) => value,
);
const sources = operations.create.requestSchema.shape.body.shape.source.options.map(
  ({ value }) => value,
);
const sorts = ["createdAtDesc", "createdAtAsc", "lastAttemptAtDesc", "lastAttemptAtAsc"] as const;

interface Props {
  search: LeadsSearch;
  change: (update: Partial<LeadsSearch>) => void;
  reset: () => void;
}

function useTypedFilter(value: string | undefined, apply: (next: string | undefined) => void) {
  const [draft, setDraft] = useState(value ?? "");
  const [applied, setApplied] = useState(value);
  if (value !== applied) {
    setApplied(value);
    setDraft(value ?? "");
  }
  useEffect(() => {
    if (draft === (value ?? "")) return;
    const timer = window.setTimeout(() => apply(draft.trim() || undefined), TYPING_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [draft, value, apply]);
  return [draft, setDraft] as const;
}

export function LeadFilters({ search, change, reset }: Props) {
  const { t } = useTranslation(["platform-leads", "common"]);
  const locale = usePreferencesStore((state) => state.locale);
  const [query, setQuery] = useTypedFilter(search.q, (q) => change({ q, page: 1 }));
  const [country, setCountry] = useTypedFilter(search.country, (next) =>
    change({ country: next, page: 1 }),
  );
  const pickerText: DatePickerText = {
    description: t("common:datePicker.description"),
    placeholder: t("common:datePicker.placeholder"),
    edge: t("common:datePicker.edge"),
    inclusive: t("common:datePicker.inclusive"),
    exclusive: t("common:datePicker.exclusive"),
    previousMonth: t("common:datePicker.previousMonth"),
    nextMonth: t("common:datePicker.nextMonth"),
    clear: t("common:datePicker.clear"),
    cancel: t("common:datePicker.cancel"),
    apply: t("common:datePicker.apply"),
  };
  const narrow = "min-w-0 lg:w-40";

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:flex lg:flex-wrap lg:items-center">
      <div className="relative min-w-0 lg:w-56">
        <Search
          size={14}
          aria-hidden="true"
          className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
        />
        <Input
          type="search"
          aria-label={t("search")}
          placeholder={t("leads.searchPlaceholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="ps-8"
        />
      </div>
      <div className={narrow}>
        <Select
          value={search.status ?? ALL}
          onValueChange={(value) =>
            change({ status: statuses.find((status) => status === value), page: 1 })
          }
        >
          <SelectTrigger aria-label={t("leads.statusLabel")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("requests.allStatuses")}</SelectItem>
            {statuses.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`enum.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className={narrow}>
        <Select
          value={search.source ?? ALL}
          onValueChange={(value) =>
            change({ source: sources.find((source) => source === value), page: 1 })
          }
        >
          <SelectTrigger aria-label={t("leads.sourceLabel")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("leads.allSources")}</SelectItem>
            {sources.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`enum.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className={narrow}>
        <Input
          aria-label={t("field.country")}
          placeholder={t("leads.countryPlaceholder")}
          value={country}
          onChange={(event) => setCountry(event.target.value)}
        />
      </div>
      {(["createdFrom", "createdTo"] as const).map((field) => (
        <div key={field} className={`${narrow} [&_button]:h-[34px]`}>
          <DatePicker
            id={`lead-${field}`}
            value={getDateEdgeDate(search[field])}
            edgeDateType={getDateEdgeType(search[field])}
            locale={locale}
            text={{ ...pickerText, placeholder: t(field) }}
            onChange={(value) => change({ [field]: value ? search[field] : undefined, page: 1 })}
            onEdgeValueChange={(value) => change({ [field]: value, page: 1 })}
          />
        </div>
      ))}
      <div className={narrow}>
        <Select
          value={String(search.isArchived)}
          onValueChange={(value) => change({ isArchived: value === "true", page: 1 })}
        >
          <SelectTrigger aria-label={t("leads.archiveState")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="false">{t("leads.active")}</SelectItem>
            <SelectItem value="true">{t("archived")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-9 justify-self-start"
        leadingIcon={<RotateCcw size={13} aria-hidden="true" />}
        onClick={reset}
      >
        {t("requests.reset")}
      </Button>
      <div className="min-w-0 lg:ms-auto lg:w-48">
        <Select
          value={search.sort ?? "createdAtDesc"}
          onValueChange={(value) => {
            const sort = sorts.find((option) => option === value);
            if (sort) change({ sort, page: 1 });
          }}
        >
          <SelectTrigger aria-label={t("leads.sortLabel")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sorts.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`sort.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
