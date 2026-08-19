import { ChevronDown, X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { auditNamespace } from "../model/audit-text";

interface AuditFilterPopoverProps {
  id: string;
  label: string;
  /** The active value in words; absent reads as "Any", so no filter is ever hidden. */
  summary?: string;
  /** The panel body; `close` lets a control that finishes on choice dismiss itself. */
  children: (close: () => void) => ReactNode;
  onClear?: () => void;
}

/** The one filter affordance both trails use: a chip that opens its own narrow panel. */
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

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePointer(event: MouseEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
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
      className="relative inline-flex items-center gap-1"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !open) return;
        closeAndRestoreFocus();
      }}
    >
      <Button
        id={id}
        ref={triggerRef}
        variant={active ? "subtle" : "secondary"}
        size="sm"
        aria-expanded={open}
        aria-controls={panelId}
        trailingIcon={
          <ChevronDown
            size={13}
            className={cn(
              "transition-transform duration-[var(--motion-fast)] ease-[var(--motion-easing)]",
              open && "rotate-180",
            )}
          />
        }
        onClick={() => setOpen((current) => !current)}
      >
        <span className="text-[var(--color-text-muted)]">{label}</span>
        <span className="ms-1.5 max-w-44 truncate text-[var(--color-text)]">
          {summary ?? t("chrome.filterAny")}
        </span>
      </Button>

      {active && onClear ? (
        <Button
          variant="ghost"
          size="iconXs"
          iconOnly
          aria-label={t("chrome.clearNamedFilter", { filter: label })}
          onClick={onClear}
        >
          <X size={13} />
        </Button>
      ) : null}

      {open ? (
        <div
          id={panelId}
          role="group"
          aria-label={label}
          className="absolute top-full z-20 mt-1.5 w-[min(20rem,calc(100vw-2rem))] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 start-0 shadow-[var(--shadow-md)]"
        >
          {children(closeAndRestoreFocus)}
        </div>
      ) : null}
    </div>
  );
}
