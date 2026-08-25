import type { TextDirection } from "@/shared/i18n";

/**
 * Where an arrow key lands in a group of choices, or `null` when the key is not one of them.
 * Vertical arrows walk the list; the horizontal pair follows reading order, so "next" is on
 * the left in Arabic.
 */
export function nextRovingChoice<T>(
  key: string,
  direction: TextDirection,
  options: readonly T[],
  current: T,
): T | null {
  const step = arrowStep(key, direction);
  if (step === 0) return null;

  const index = options.indexOf(current);
  return options[(index + step + options.length) % options.length] ?? null;
}

function arrowStep(key: string, direction: TextDirection): number {
  const forward = direction === "rtl" ? -1 : 1;

  if (key === "ArrowDown") return 1;
  if (key === "ArrowUp") return -1;
  if (key === "ArrowRight") return forward;
  if (key === "ArrowLeft") return -forward;
  return 0;
}
