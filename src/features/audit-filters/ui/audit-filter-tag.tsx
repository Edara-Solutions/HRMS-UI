import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { TruncatedText } from "@/shared/ui/truncated-text";
import { auditChipActiveClassName, auditChipClassName } from "../model/audit-chip";
import { auditNamespace } from "../model/audit-text";

interface AuditFilterTagProps {
  label: string;
  /** The value in the reader's own words, or the identifier when that is all there is. */
  value: string;
  /** Renders the value as the identifier it is rather than as prose. */
  mono?: boolean;
  onClear: () => void;
}

/**
 * A filter with no picker behind it — one a reader arrived at by clicking a value in the
 * trail. It states what is narrowing the page and offers the one action that applies:
 * removing it. Shown only while the filter carries a value.
 */
export function AuditFilterTag({ label, value, mono = false, onClear }: AuditFilterTagProps) {
  const { t } = useTranslation(auditNamespace);

  return (
    <span className="inline-flex items-center">
      <span
        className={cn(
          auditChipClassName,
          auditChipActiveClassName,
          "inline-flex items-center rounded-s-[var(--radius-sm)] border-e-0 py-0",
        )}
      >
        {label}
        <TruncatedText
          text={value}
          focusable={false}
          className={cn("ms-1.5 max-w-52 font-semibold", mono && "font-mono text-[11px]")}
        />
      </span>
      <Button
        variant="secondary"
        size="sm"
        iconOnly
        className={cn(auditChipClassName, auditChipActiveClassName, "rounded-s-none px-1.5")}
        aria-label={t("chrome.clearNamedFilter", { filter: label })}
        title={t("chrome.clearNamedFilter", { filter: label })}
        onClick={onClear}
      >
        <X size={12} />
      </Button>
    </span>
  );
}
