import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ContractViolation, usePlatformAccess } from "@/shared/api";
import { usePreferencesStore } from "@/shared/config";
import { Button } from "@/shared/ui/button";
import { EmailPreviewFrame } from "@/shared/ui/email-preview-frame";
import { Skeleton } from "@/shared/ui/skeleton";
import { emailQueries } from "../api/emails";
import { type PlatformEmailType, type PlatformPreviewLocale, previewLocale } from "../model/emails";

export function TemplatePreview({ type }: { type: PlatformEmailType }) {
  const { t } = useTranslation("platform-emails");
  const interfaceLocale = usePreferencesStore((state) => state.locale);
  const access = usePlatformAccess();
  const [locale, setLocale] = useState<PlatformPreviewLocale>(() =>
    previewLocale(type, interfaceLocale),
  );
  const [view, setView] = useState<"html" | "text">("html");
  const { data, error, isPending, isError, refetch } = useQuery({
    ...emailQueries(access.user?.publicId ?? "").preview(type.key, locale),
    enabled:
      type.context === "EDARA" &&
      access.availability("GET /api/v1/platform/email-types/{key}/preview").state === "enabled",
    retry: false,
  });

  return (
    <section aria-labelledby="template-preview" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="template-preview" className="text-sm font-semibold">
          {t("preview.title")}
        </h3>
        <div className="flex flex-wrap gap-2">
          <fieldset className="flex gap-1">
            <legend className="sr-only">{t("preview.locale")}</legend>
            {type.supportedLocales.map((option) => (
              <Button
                key={option}
                intent="toggle"
                size="sm"
                pressed={locale === option}
                onClick={() => setLocale(option)}
              >
                {t(`locale.${option}`)}
              </Button>
            ))}
          </fieldset>
          <fieldset className="flex gap-1">
            <legend className="sr-only">{t("preview.format")}</legend>
            {(["html", "text"] as const).map((option) => (
              <Button
                key={option}
                intent="toggle"
                size="sm"
                pressed={view === option}
                onClick={() => setView(option)}
              >
                {t(`preview.format.${option}`)}
              </Button>
            ))}
          </fieldset>
        </div>
      </div>
      {isPending ? (
        <Skeleton className="h-72 w-full" />
      ) : isError ? (
        <div className="space-y-2 text-sm">
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
      ) : (
        <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 text-sm">
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
            <dt className="text-[var(--color-text-muted)]">{t("preview.subject")}</dt>
            <dd className="break-words" dir={data.locale === "ar" ? "rtl" : "ltr"}>
              {data.subject}
            </dd>
            <dt className="text-[var(--color-text-muted)]">{t("preview.preheader")}</dt>
            <dd className="break-words" dir={data.locale === "ar" ? "rtl" : "ltr"}>
              {data.preheader}
            </dd>
          </dl>
          {view === "html" ? (
            <EmailPreviewFrame
              title={t("preview.frameTitle", { subject: data.subject })}
              html={data.html}
              className="h-96 w-full rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)]"
            />
          ) : (
            <pre
              className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] p-3 text-xs"
              dir={data.locale === "ar" ? "rtl" : "ltr"}
            >
              {data.text}
            </pre>
          )}
          <p className="text-xs text-[var(--color-text-muted)]">{t("preview.syntheticNote")}</p>
        </div>
      )}
    </section>
  );
}
