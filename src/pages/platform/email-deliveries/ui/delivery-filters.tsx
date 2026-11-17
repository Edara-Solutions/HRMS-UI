import { useQuery } from "@tanstack/react-query";
import { Filter, RotateCcw, Search } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  platformCommunicationsOperations as operations,
  platformCompanyOperations,
  usePlatformAccess,
} from "@/shared/api";
import { usePreferencesStore } from "@/shared/config";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardTitle } from "@/shared/ui/card";
import { DateTimePicker, type DateTimePickerText } from "@/shared/ui/date-time-picker";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  companyFilterOptionsQuery,
  emailTypeFilterOptionsQuery,
} from "../api/delivery-filter-options";
import type { DeliveryFilters } from "../api/email-deliveries";
import { SearchableFilterSelect } from "./searchable-filter-select";

const STATUSES = [
  "QUEUED",
  "PROCESSING",
  "RETRY_SCHEDULED",
  "SENT",
  "FAILED",
  "CANCELLED",
] as const;
const ALL = "";

type Filters = Omit<NonNullable<DeliveryFilters>, "page" | "pageSize">;

interface DeliveryFiltersCardProps {
  filters: Filters;
  onSearch: (filters: Filters) => void;
  onReset: () => void;
}

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

export function DeliveryFiltersCard({ filters, onSearch, onReset }: DeliveryFiltersCardProps) {
  const { t } = useTranslation("platform-email-deliveries");
  const locale = usePreferencesStore((state) => state.locale);
  const access = usePlatformAccess();
  const identity = access.user?.publicId ?? "";
  const readsCompanies =
    access.availability(platformCompanyOperations.companies.key).state === "enabled";
  const readsTypes = access.availability(operations.emailTypes.key).state === "enabled";
  const companies = useQuery({
    ...companyFilterOptionsQuery(identity),
    enabled: readsCompanies,
    retry: false,
  });
  const emailTypes = useQuery({
    ...emailTypeFilterOptionsQuery(identity),
    enabled: readsTypes,
    retry: false,
  });
  const [context, setContext] = useState<string>(filters.context ?? ALL);
  const [status, setStatus] = useState<string>(filters.status ?? ALL);
  const [createdFrom, setCreatedFrom] = useState(filters.createdFrom);
  const [createdTo, setCreatedTo] = useState(filters.createdTo);
  const pickerText: DateTimePickerText = {
    description: t("picker.description"),
    placeholder: t("picker.placeholder"),
    hour: t("picker.hour"),
    minute: t("picker.minute"),
    minuteHint: t("picker.minuteHint"),
    period: t("picker.period"),
    previousMonth: t("picker.previousMonth"),
    nextMonth: t("picker.nextMonth"),
    clear: t("picker.clear"),
    cancel: t("picker.cancel"),
    apply: t("picker.apply"),
  };

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSearch({
      context: context === "EDARA" || context === "COMPANY" ? context : undefined,
      status: STATUSES.find((value) => value === status),
      companyPublicId: text(form, "companyPublicId"),
      emailTypeKey: text(form, "emailTypeKey"),
      recipientEmail: text(form, "recipientEmail"),
      businessReference: text(form, "businessReference"),
      createdFrom,
      createdTo,
    });
  }

  const optionCopy = {
    loadingLabel: t("filters.optionsLoading"),
    errorLabel: t("filters.optionsError"),
    emptyLabel: t("filters.optionsEmpty"),
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <form onSubmit={submit} aria-label={t("filters.title")}>
          <div className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
              >
                <Filter size={15} />
              </span>
              <div className="min-w-0">
                <CardTitle>{t("filters.title")}</CardTitle>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{t("filters.hint")}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto min-h-8 whitespace-normal py-1.5"
                onClick={onReset}
                leadingIcon={<RotateCcw size={13} aria-hidden="true" />}
              >
                {t("filters.reset")}
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-auto min-h-8 whitespace-normal py-1.5"
                leadingIcon={<Search size={14} aria-hidden="true" />}
              >
                {t("filters.search")}
              </Button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-[repeat(2,minmax(0,1fr))] xl:grid-cols-[repeat(4,minmax(0,1fr))]">
            <div>
              <Label htmlFor="delivery-context">{t("filters.context.label")}</Label>
              <Select value={context} onValueChange={setContext}>
                <SelectTrigger id="delivery-context" className="mt-1.5">
                  <SelectValue placeholder={t("filters.context.all")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("filters.context.all")}</SelectItem>
                  <SelectItem value="EDARA">{t("context.EDARA")}</SelectItem>
                  <SelectItem value="COMPANY">{t("context.COMPANY")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="delivery-status">{t("filters.status.label")}</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="delivery-status" className="mt-1.5">
                  <SelectValue placeholder={t("filters.status.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("filters.status.placeholder")}</SelectItem>
                  {STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`status.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {readsTypes && !emailTypes.isError ? (
              <SearchableFilterSelect
                id="delivery-email-type"
                name="emailTypeKey"
                label={t("filters.emailType.label")}
                initialValue={filters.emailTypeKey ?? ""}
                placeholder={t("filters.emailType.placeholder")}
                options={emailTypes.data}
                loading={emailTypes.isPending}
                error={emailTypes.isError}
                clearLabel={t("filters.emailType.clear")}
                {...optionCopy}
              />
            ) : (
              <TextFilter
                id="delivery-email-type"
                name="emailTypeKey"
                label={t("filters.emailType.label")}
                value={filters.emailTypeKey}
              />
            )}
            <TextFilter
              id="delivery-recipient"
              name="recipientEmail"
              type="search"
              label={t("filters.recipient.label")}
              placeholder={t("filters.recipient.placeholder")}
              value={filters.recipientEmail}
              dir="ltr"
            />
            {readsCompanies && !companies.isError ? (
              <SearchableFilterSelect
                id="delivery-company"
                name="companyPublicId"
                label={t("filters.company.label")}
                initialValue={filters.companyPublicId ?? ""}
                placeholder={t("filters.company.placeholder")}
                options={companies.data}
                loading={companies.isPending}
                error={companies.isError}
                clearLabel={t("filters.company.clear")}
                {...optionCopy}
              />
            ) : (
              <TextFilter
                id="delivery-company"
                name="companyPublicId"
                label={t("filters.company.label")}
                value={filters.companyPublicId}
                dir="ltr"
              />
            )}
            <TextFilter
              id="delivery-business-reference"
              name="businessReference"
              label={t("filters.businessReference.label")}
              placeholder={t("filters.businessReference.placeholder")}
              value={filters.businessReference}
              dir="ltr"
            />
            <DateTimePicker
              id="delivery-created-from"
              label={t("filters.createdFrom.label")}
              value={createdFrom}
              boundary="from"
              locale={locale}
              text={pickerText}
              onChange={setCreatedFrom}
            />
            <DateTimePicker
              id="delivery-created-to"
              label={t("filters.createdTo.label")}
              value={createdTo}
              boundary="to"
              locale={locale}
              text={pickerText}
              onChange={setCreatedTo}
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface TextFilterProps {
  id: string;
  name: string;
  label: string;
  value: string | undefined;
  placeholder?: string;
  type?: "text" | "search";
  dir?: "ltr";
}

function TextFilter({ id, name, label, value, placeholder, type = "text", dir }: TextFilterProps) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type={type}
        dir={dir}
        className="mt-1.5"
        defaultValue={value ?? ""}
        placeholder={placeholder}
      />
    </div>
  );
}
