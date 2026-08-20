import { ChevronDown, X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { TruncatedText } from "@/shared/ui/truncated-text";
import { auditNamespace } from "../model/audit-text";

interface AuditFilterPopoverProps {
  id: string;
  label: string;
  /** The chosen value in words. Absent means the filter is unset, and the chip shows only its name. */
  summary?: string;
  /** The panel body; `close` lets a control that finishes on choice dismiss itself. */
  children: (close: () => void) => ReactNode;
  onClear?: () => void;
}

const chipBase =
  "h-8 border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-[12.5px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]";

const chipActive =
  "border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary-soft)_92%,var(--color-primary))] hover:text-[var(--color-primary)]";

/**
 * One filter, one object: a chip that names the filter, shows the value once it has one, and
 * opens its own panel. When it carries a value it grows a clear button along the same seam,
 * so removing a filter never means hunting for a second control.
 */
export function AuditFilterPopover({
  id,
  label,
  summary,
  children,
  onClear,
}: AuditFilterPopoverProps) {
  const { t } = useTranslation(auditNamespace);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const active = summary !== undefined;
  const clearable = active && onClear !== undefined;

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePointer(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      if (rootRef.current?.contains(event.target)) return;
      // A control inside the panel may open a dialog of its own, which renders in a portal
      // outside this subtree. Closing on that click would tear the dialog down mid-choice.
      if (event.target.closest('[role="dialog"]')) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsidePointer);
    return () => document.removeEventListener("mousedown", closeOnOutsidePointer);
  }, [open]);

  /** A choice made inside the panel returns the reader to the chip they opened. */
  function closeAndRestoreFocus() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div
      ref={rootRef}
      className="relative inline-flex items-center"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !open) return;
        closeAndRestoreFocus();
      }}
    >
      <Button
        id={id}
        ref={triggerRef}
        variant="secondary"
        size="sm"
        className={cn(chipBase, active && chipActive, clearable && "rounded-e-none border-e-0")}
        aria-expanded={open}
        aria-controls={panelId}
        trailingIcon={
          <ChevronDown
            size={12}
            className={cn(
              "transition-transform duration-[var(--motion-fast)] ease-[var(--motion-easing)]",
              open && "rotate-180",
            )}
          />
        }
        onClick={() => setOpen((current) => !current)}
      >
        <span>{label}</span>
        {active ? (
          // The chip is the trigger and already focusable, so the clipped summary inside it
          // offers its full value on hover without adding a second tab stop.
          <TruncatedText
            text={summary}
            focusable={false}
            className="ms-1.5 max-w-44 font-semibold text-[var(--color-text)]"
          />
        ) : null}
      </Button>

      {clearable ? (
        <Button
          variant="secondary"
          size="sm"
          iconOnly
          className={cn(chipBase, chipActive, "rounded-s-none px-1.5")}
          aria-label={t("chrome.clearNamedFilter", { filter: label })}
          title={t("chrome.clearNamedFilter", { filter: label })}
          onClick={onClear}
        >
          <X size={12} />
        </Button>
      ) : null}

      {open ? (
        <div
          id={panelId}
          role="group"
          aria-label={label}
          className="popover-panel absolute top-full z-20 mt-1.5 w-[min(20rem,calc(100vw-2rem))] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 start-0 shadow-[var(--shadow-md)] ltr:origin-top-left rtl:origin-top-right"
        >
          {children(closeAndRestoreFocus)}
        </div>
      ) : null}
    </div>
  );
}
