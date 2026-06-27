import type { HTMLAttributes, ReactNode } from "react";
import { useEffect, useEffectEvent, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/shared/lib/cn";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DialogProps {
  open: boolean;
  onClose?: () => void;
  /** When false, the dialog cannot be dismissed via backdrop click or Escape — use for flows that must run to completion. */
  dismissible?: boolean;
  titleId: string;
  descriptionId?: string;
  children: ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  dismissible = true,
  titleId,
  descriptionId,
  children,
  className,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const handleEscape = useEffectEvent(() => {
    if (dismissible) onClose?.();
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: handleEscape is a useEffectEvent — stable identity, always sees latest dismissible/onClose, intentionally omitted from deps
  useEffect(() => {
    if (!open) return;

    panelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleEscape();
        return;
      }

      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: decorative aria-hidden scrim — keyboard users dismiss via Escape (handled on the panel) */}
      <div
        className="fixed inset-0 bg-[var(--color-overlay)]"
        aria-hidden="true"
        onClick={dismissible ? onClose : undefined}
      />
      <div
        ref={panelRef}
        // biome-ignore lint/a11y/useSemanticElements: native <dialog> owns its own backdrop/show-modal lifecycle, which conflicts with this portal's declarative open/focus-trap model
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={cn(
          "relative w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)] outline-none",
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function DialogTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg font-semibold tracking-tight text-[var(--color-text)]", className)}
      {...props}
    >
      {children}
    </h2>
  );
}

export function DialogDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-1.5 text-sm text-[var(--color-text-muted)]", className)} {...props}>
      {children}
    </p>
  );
}

/** Generates a stable id pair for wiring `aria-labelledby`/`aria-describedby` to `DialogTitle`/`DialogDescription`. */
export function useDialogIds() {
  const base = useId();
  return { titleId: `${base}-title`, descriptionId: `${base}-description` };
}
