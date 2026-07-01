import type { ReactNode } from "react";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/shared/lib/cn";

export { DialogDescription } from "./dialog-description";
export { DialogTitle } from "./dialog-title";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Matches --motion-base in globals.css: the exit runs snappier than the --motion-slow entry. */
const EXIT_DURATION_MS = 180;

type Phase = "closed" | "entering" | "open" | "closing";

/** Pure transition table for the `open` prop flipping — kept outside the component to keep its cognitive complexity low. */
function nextPhaseOnOpenChange(open: boolean, currentPhase: Phase): Phase {
  if (open) return "entering";
  return currentPhase === "closed" ? "closed" : "closing";
}

function trapTabFocus(panel: HTMLElement, event: KeyboardEvent) {
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
  const [phase, setPhase] = useState<Phase>(open ? "open" : "closed");
  // Keeps the last non-empty children on screen while the exit transition plays, since callers
  // gate their content on the same `open` flag and would otherwise unmount it mid-fade.
  const lastChildren = useRef(children);
  if (children) lastChildren.current = children;

  // Adjusted synchronously during render (not in an effect) so the very same commit that flips
  // `open` also mounts the panel DOM node — otherwise the focus-management effect below would run
  // one commit too early and find `panelRef.current` still null.
  const prevOpenRef = useRef(open);
  if (open !== prevOpenRef.current) {
    prevOpenRef.current = open;
    setPhase(nextPhaseOnOpenChange(open, phase));
  }

  const handleEscape = useEffectEvent(() => {
    if (dismissible) onClose?.();
  });

  useEffect(() => {
    if (phase !== "entering") return;
    const raf = requestAnimationFrame(() => setPhase("open"));
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    if (phase !== "closing") return;
    const timeout = setTimeout(() => setPhase("closed"), EXIT_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [phase]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleEscape();
        return;
      }

      const panel = panelRef.current;
      if (event.key === "Tab" && panel) trapTabFocus(panel, event);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [open]);

  if (phase === "closed") return null;

  const visible = phase === "open";
  const closing = phase === "closing";
  // Entry grows in from 95% (never from scale(0)) so it reads as arriving, not popping in.
  // Close is a plain, fast opacity fade with no shrink — a scale-down on exit reads as
  // decorative flourish, out of place for a calm, HR-native business tool.
  const panelScale = closing ? "scale-100" : visible ? "scale-100" : "scale-95";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Decorative aria-hidden scrim; keyboard users dismiss via Escape (handled on the panel). */}
      <div
        className={cn(
          "fixed inset-0 bg-[var(--color-overlay)] transition-opacity ease-[var(--motion-easing)]",
          closing ? "duration-[var(--motion-base)]" : "duration-[var(--motion-slow)]",
          visible ? "opacity-100" : "opacity-0",
        )}
        aria-hidden="true"
        onClick={dismissible ? onClose : undefined}
      />
      <div
        ref={panelRef}
        // Custom role over native <dialog>: native owns its own backdrop/show-modal lifecycle, which conflicts with this portal's declarative open/focus-trap model.
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={cn(
          "relative w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-md)] outline-none transition-[opacity,transform] ease-[var(--motion-easing)]",
          closing ? "duration-[var(--motion-base)]" : "duration-[var(--motion-slow)]",
          panelScale,
          visible ? "opacity-100" : "opacity-0",
          className,
        )}
      >
        {lastChildren.current}
      </div>
    </div>,
    document.body,
  );
}

/** Generates a stable id pair for wiring `aria-labelledby`/`aria-describedby` to `DialogTitle`/`DialogDescription`. */
export function useDialogIds() {
  const base = useId();
  return { titleId: `${base}-title`, descriptionId: `${base}-description` };
}
