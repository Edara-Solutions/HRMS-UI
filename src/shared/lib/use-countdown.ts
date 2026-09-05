import { useEffect, useState } from "react";

/**
 * Counts down from `seconds` to zero, one second at a time, and stops there.
 *
 * One interval runs for the whole count and is torn down when it reaches zero or the caller
 * unmounts, so nothing fires after the screen is gone. Callers watch the returned value for `0` to
 * act on the end.
 */
export function useCountdown(seconds: number): number {
  const [remaining, setRemaining] = useState(seconds);
  const finished = remaining <= 0;

  useEffect(() => {
    if (finished) return;
    const timer = setInterval(() => setRemaining((current) => Math.max(0, current - 1)), 1000);
    return () => clearInterval(timer);
  }, [finished]);

  return remaining;
}
