import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/shared/lib/cn";

/** `auto` sits above the trigger and drops below only when the top of the window is in the way. */
export type TooltipPlacement = "auto" | "below";

interface TooltipProps {
  /** The words the tooltip shows. Nothing renders when this is empty. */
  content: ReactNode;
  children: ReactNode;
  /** Skips the tooltip entirely — for text that turns out to fit, or a disabled trigger. */
  disabled?: boolean;
  /** Adds a tab stop so a keyboard reaches this tooltip. Leave off inside a focusable parent. */
  focusable?: boolean;
  placement?: TooltipPlacement;
  className?: string;
}

interface Position {
  top: number;
  left: number;
}

/** Long enough that crossing a row does not flash tooltips, short enough to feel immediate. */
const OPEN_DELAY_MS = 250;

/** Breathing room between the trigger and the tooltip, and from the viewport edge. */
const OFFSET = 6;
const VIEWPORT_MARGIN = 8;

/**
 * Says what a trigger cannot show — a clipped name, an identifier cut to fit its column.
 *
 * It renders in a portal and positions itself in viewport coordinates, because the places
 * that need it most are inside scroll containers: a tooltip absolutely positioned in the
 * audit table or a filter panel would be clipped by the very overflow that truncated the
 * text.
 */
export function Tooltip({
  content,
  children,
  disabled = false,
  focusable = false,
  placement = "auto",
  className,
}: TooltipProps) {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const openTimeout = useRef<number>(undefined);
  const [position, setPosition] = useState<Position>();
  const open = position !== undefined;
  const silent = disabled || !content;

  const place = useCallback(() => {
    const trigger = triggerRef.current?.getBoundingClientRect();
    if (!trigger) return;

    const tooltip = tooltipRef.current?.getBoundingClientRect();
    const width = tooltip?.width ?? 0;
    const height = tooltip?.height ?? 0;
    // Above the trigger unless the trigger sits too near the top of the window — or unless
    // the caller asked for below, which still flips up rather than run off the bottom.
    const above = trigger.top - height - OFFSET;
    const below = trigger.bottom + OFFSET;
    const fitsBelow = below + height <= window.innerHeight - VIEWPORT_MARGIN;
    const goesBelow = placement === "below" ? fitsBelow : above < VIEWPORT_MARGIN;
    const top = goesBelow ? below : above;
    const centered = trigger.left + trigger.width / 2 - width / 2;
    const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN;

    setPosition({
      top,
      left: Math.min(Math.max(centered, VIEWPORT_MARGIN), Math.max(maxLeft, VIEWPORT_MARGIN)),
    });
  }, [placement]);

  const hide = useCallback(() => {
    window.clearTimeout(openTimeout.current);
    setPosition(undefined);
  }, []);

  // A tooltip measured before paint has no size yet, so the first placement is a guess;
  // measuring again once it is on screen settles it before anyone can read it.
  useEffect(() => {
    if (!open) return;
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;

    function hideOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") hide();
    }

    // Scrolling any ancestor moves the trigger out from under its tooltip.
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    document.addEventListener("keydown", hideOnEscape);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      document.removeEventListener("keydown", hideOnEscape);
    };
  }, [open, hide]);

  useEffect(() => () => window.clearTimeout(openTimeout.current), []);

  if (silent) {
    return (
      <span ref={triggerRef} className={className}>
        {children}
      </span>
    );
  }

  return (
    <>
      <span
        ref={triggerRef}
        className={className}
        tabIndex={focusable ? 0 : undefined}
        aria-describedby={open ? tooltipId : undefined}
        onPointerEnter={() => {
          window.clearTimeout(openTimeout.current);
          openTimeout.current = window.setTimeout(place, OPEN_DELAY_MS);
        }}
        onPointerLeave={hide}
        onPointerDown={hide}
        // A keyboard reader has already committed to this element, so there is nothing to
        // wait out — the delay exists only to survive a pointer passing through.
        onFocus={place}
        onBlur={hide}
      >
        {children}
      </span>
      {open
        ? createPortal(
            <div
              ref={tooltipRef}
              id={tooltipId}
              role="tooltip"
              style={{ top: position.top, left: position.left }}
              className={cn(
                "pointer-events-none fixed z-50 max-w-[min(22rem,calc(100vw-1rem))] rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11.5px] font-medium leading-relaxed text-[var(--color-text)] shadow-[var(--shadow-md)]",
                "tooltip-panel break-words",
              )}
            >
              {content}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
