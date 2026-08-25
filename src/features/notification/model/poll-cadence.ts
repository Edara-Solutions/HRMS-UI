/** Idle cadence from the polling contract (HRMS_Back_End#198 §5). */
export const IDLE_POLL_INTERVAL_MS = 30_000;

/** The server's `x-poll-interval` (seconds) overrides the idle cadence whenever it reads as a usable number. */
export function resolvePollIntervalMs(serverInterval: string | null): number {
  const seconds = Number(serverInterval);

  if (!serverInterval || !Number.isFinite(seconds) || seconds <= 0) {
    return IDLE_POLL_INTERVAL_MS;
  }

  return seconds * 1000;
}
