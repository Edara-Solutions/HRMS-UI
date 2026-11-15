import { Link } from "@tanstack/react-router";
import { LockKeyhole, Shield } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { AudienceName } from "@/shared/auth";
import { LocaleSwitcher } from "@/shared/ui/locale-switcher";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

export interface CredentialLink {
  readonly to: string;
  readonly label: string;
}

interface CredentialFrameProps {
  audience: AudienceName;
  title: string;
  description: string;
  links?: readonly CredentialLink[];
  children: ReactNode;
}

export function CredentialFrame({
  audience,
  title,
  description,
  links,
  children,
}: CredentialFrameProps) {
  const { t } = useTranslation("auth");
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-sm font-bold text-[var(--color-on-primary)]"
          >
            {audience === "company" ? "E" : <Shield size={14} />}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold tracking-tight">
              {t(`frame.${audience}.brand`)}
            </p>
            <p className="truncate text-[11px] text-[var(--color-text-faint)]">
              {t(`frame.${audience}.tagline`)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <section aria-labelledby="credential-heading" className="w-full max-w-[400px]">
          <div className="rounded-[var(--radius-lg)] border border-t-2 border-[var(--color-border)] border-t-[var(--color-primary)] bg-[var(--color-surface)] p-6 sm:p-8">
            <p className="text-[11px] font-semibold text-[var(--color-text-faint)] ltr:uppercase ltr:tracking-widest">
              {t(`journey.${audience}`)}
            </p>
            <h1 id="credential-heading" className="mt-3 text-[26px] font-bold tracking-tight">
              {title}
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">{description}</p>
            <div className="mt-6 border-t border-[var(--color-border)] pt-6">{children}</div>
          </div>
          {links && links.length > 0 ? (
            <nav
              aria-label={t("journey.authNavigation")}
              className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm"
            >
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-[var(--color-primary)] hover:underline"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </section>
      </main>
      <footer className="flex shrink-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-6 text-xs text-[var(--color-text-faint)]">
        <span className="inline-flex items-center gap-1.5">
          <LockKeyhole size={12} aria-hidden="true" />
          {t("frame.secure")}
        </span>
        <span aria-hidden="true">·</span>
        <span dir="ltr">{t("frame.copyright", { year: new Date().getFullYear() })}</span>
      </footer>
    </div>
  );
}
