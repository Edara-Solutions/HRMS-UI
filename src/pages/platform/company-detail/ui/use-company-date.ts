import { useTranslation } from "react-i18next";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";

export function useCompanyDate() {
  const { t } = useTranslation("platform-companies");
  const locale = usePreferencesStore((state) => state.locale);
  return (value: string | null) => (value ? formatInstant(value, locale) : t("notProvided"));
}
