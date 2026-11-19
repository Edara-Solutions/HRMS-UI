import { useNavigate } from "@tanstack/react-router";
import { RotateCcw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import type { CatalogueFilters } from "../api/catalogue";

const ALL = "ALL";
const TYPING_DELAY_MS = 300;

interface Props {
  search: NonNullable<CatalogueFilters>;
}

const toBoolean = (value: string) => (value === ALL ? undefined : value === "true");
const fromBoolean = (value: boolean | undefined) => (value === undefined ? ALL : String(value));

export function CatalogueFilterForm({ search }: Props) {
  const { t } = useTranslation("platform-plans");
  const navigate = useNavigate();
  const apply = (next: NonNullable<CatalogueFilters>) =>
    void navigate({ to: "/platform/plans", search: next });
  const [name, setName] = useState(search.name ?? "");
  const [applied, setApplied] = useState(search.name);
  if (search.name !== applied) {
    setApplied(search.name);
    setName(search.name ?? "");
  }

  useEffect(() => {
    if (name.trim() === (search.name ?? "")) return;
    const timer = window.setTimeout(
      () =>
        void navigate({
          to: "/platform/plans",
          search: { ...search, name: name.trim() || undefined },
        }),
      TYPING_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [name, search, navigate]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:flex lg:flex-wrap lg:items-center">
      <div className="relative min-w-0 lg:w-64">
        <Search
          size={14}
          aria-hidden="true"
          className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
        />
        <Input
          type="search"
          aria-label={t("search")}
          placeholder={t("searchPlaceholder")}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="ps-8"
        />
      </div>
      <div className="min-w-0 lg:w-44">
        <Select
          value={fromBoolean(search.isPublic)}
          onValueChange={(value) => apply({ ...search, isPublic: toBoolean(value) })}
        >
          <SelectTrigger aria-label={t("visibilityLabel")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allVisibility")}</SelectItem>
            <SelectItem value="true">{t("public")}</SelectItem>
            <SelectItem value="false">{t("private")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0 lg:w-44">
        <Select
          value={fromBoolean(search.isActive)}
          onValueChange={(value) => apply({ ...search, isActive: toBoolean(value) })}
        >
          <SelectTrigger aria-label={t("statusLabel")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allStatuses")}</SelectItem>
            <SelectItem value="true">{t("active")}</SelectItem>
            <SelectItem value="false">{t("inactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-9 justify-self-start"
        leadingIcon={<RotateCcw size={13} aria-hidden="true" />}
        onClick={() => apply({})}
      >
        {t("reset")}
      </Button>
    </div>
  );
}
