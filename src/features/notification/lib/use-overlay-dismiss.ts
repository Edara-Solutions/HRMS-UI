import { type RefObject, useEffect } from "react";

const FOCUSABLE_SELECTOR = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

interface OverlayDismissOptions {
  open: boolean;
  overlayRef: RefObject<HTMLElement | null>;
  triggerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
}

/**
 * The dismissal contract every notification shape shares: focus moves in on open, Tab cycles
 * inside, Escape closes and hands focus back to the trigger, and a pointer landing anywhere
 * else closes without taking focus with it. A shape that covers the page with a scrim gets
 * scrim-click from the same rule — the scrim is outside the overlay.
 */
export function useOverlayDismiss({
  open,
  overlayRef,
  triggerRef,
  onClose,
}: OverlayDismissOptions) {
  useEffect(() => {
    // Only when the overlay does not already hold focus: a shape that swaps in around an
    // already-focused control must not pull focus back out to itself.
    if (open && !overlayRef.current?.contains(document.activeElement)) {
      overlayRef.current?.focus();
    }
  }, [open, overlayRef]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        triggerRef.current?.focus();
        return;
      }

      if (event.key === "Tab") keepFocusInOverlay(event, overlayRef.current);
    }

    // Focus stays where the click landed; only Escape hands it back to the trigger.
    function onPointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) return;
      if (overlayRef.current?.contains(target) || triggerRef.current?.contains(target)) return;

      onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, overlayRef, triggerRef, onClose]);
}

/** Tab cycles inside the open dialog instead of walking off into the page behind it. */
function keepFocusInOverlay(event: KeyboardEvent, overlay: HTMLElement | null) {
  if (!overlay) return;

  const focusable = [...overlay.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)];

  if (focusable.length === 0) {
    event.preventDefault();
    overlay.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const atEdge = event.shiftKey
    ? document.activeElement === first
    : document.activeElement === last;

  if (!atEdge) return;

  event.preventDefault();
  (event.shiftKey ? last : first).focus();
}
