import { useEffect, useRef } from "react";

/**
 * Runs `onExpire` once the toast has been on screen for `durationMs`, pausing whenever the pointer
 * rests on the stack. The remaining time is carried across pauses, so hovering a toast at 4.9s and
 * leaving again still gives it the last 100ms rather than a fresh clock.
 *
 * @param durationMs `null` for a sticky toast — it never expires on its own.
 */
export function useAutoDismiss(durationMs: number | null, paused: boolean, onExpire: () => void) {
  const remainingMs = useRef(durationMs);
  const expire = useRef(onExpire);

  useEffect(() => {
    expire.current = onExpire;
  });

  useEffect(() => {
    if (remainingMs.current === null || paused) {
      return;
    }

    const startedAt = Date.now();
    const timer = setTimeout(() => expire.current(), remainingMs.current);

    return () => {
      clearTimeout(timer);
      remainingMs.current = Math.max(0, (remainingMs.current ?? 0) - (Date.now() - startedAt));
    };
  }, [paused]);
}
