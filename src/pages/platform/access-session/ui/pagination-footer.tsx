import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";

interface PaginationFooterProps {
  summary: string;
  page: number;
  totalPages: number;
  busy: boolean;
  onPageChange: (page: number) => void;
}

export function PaginationFooter({
  summary,
  page,
  totalPages,
  busy,
  onPageChange,
}: PaginationFooterProps) {
  const { t } = useTranslation("platform-access-session");
  return (
    <nav
      aria-label={t("pagination")}
      className="flex items-center justify-between border-t border-[var(--color-border)] pt-3"
    >
      <span className="text-[12px] text-[var(--color-text-muted)]">{summary}</span>
      <div className="flex items-center">
        <Button
          variant="nav"
          size="iconXs"
          iconOnly
          aria-label={t("previous")}
          title={t("previous")}
          disabled={page <= 1 || busy}
          onClick={() => onPageChange(page - 1)}
          leadingIcon={
            <ChevronLeft
              size={14}
              className="transition-transform duration-[120ms] ease-[var(--motion-easing)] group-hover:-translate-x-0.5 rtl:rotate-180"
            />
          }
        />
        <span className="select-none px-2 text-[12px] tabular-nums text-[var(--color-text-muted)]">
          {page} / {totalPages}
        </span>
        <Button
          variant="nav"
          size="iconXs"
          iconOnly
          aria-label={t("next")}
          title={t("next")}
          disabled={page >= totalPages || busy}
          onClick={() => onPageChange(page + 1)}
          leadingIcon={
            <ChevronRight
              size={14}
              className="transition-transform duration-[120ms] ease-[var(--motion-easing)] group-hover:translate-x-0.5 rtl:rotate-180"
            />
          }
        />
      </div>
    </nav>
  );
}
