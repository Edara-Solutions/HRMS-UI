import { KeyRound } from "lucide-react";
import { useEffect } from "react";
import { type CompanyDelegation, endSupportAccess } from "@/shared/auth";
import { usePreferencesStore } from "@/shared/config";
import { formatInstant } from "@/shared/lib/format-instant";
import { Button } from "@/shared/ui/button";

const copy = {
  en: {
    title: "Edara support access",
    READ: "Read only",
    CHANGE: "Read and change",
    ends: "Ends",
    leave: "Leave",
  },
  ar: {
    title: "وصول دعم إدارة",
    READ: "قراءة فقط",
    CHANGE: "قراءة وتعديل",
    ends: "ينتهي",
    leave: "مغادرة",
  },
} as const;

interface SupportAccessBannerProps {
  delegation: CompanyDelegation;
}

export function SupportAccessBanner({ delegation }: SupportAccessBannerProps) {
  const locale = usePreferencesStore((state) => state.locale);
  useEffect(() => {
    const remaining = Date.parse(delegation.expiresAt) - Date.now();
    const timer = setTimeout(endSupportAccess, Math.min(Math.max(remaining, 0), 2_147_483_647));
    return () => clearTimeout(timer);
  }, [delegation.expiresAt]);
  const text = copy[locale];
  return (
    <section
      aria-label={text.title}
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 text-sm"
    >
      <KeyRound size={16} aria-hidden="true" className="shrink-0 text-[var(--color-text-muted)]" />
      <p className="me-auto min-w-0">
        <span className="font-semibold">{text.title}</span>
        <span className="text-[var(--color-text-muted)]">
          {" · "}
          <bdi>{delegation.companyName}</bdi>
          {" · "}
          {text[delegation.scope]}
          {" · "}
          <span className="tabular-nums">
            {text.ends} {formatInstant(delegation.expiresAt, locale)}
          </span>
        </span>
      </p>
      <Button size="sm" variant="secondary" onClick={endSupportAccess}>
        {text.leave}
      </Button>
    </section>
  );
}
