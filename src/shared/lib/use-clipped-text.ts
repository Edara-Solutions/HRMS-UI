import { type RefObject, useCallback, useEffect, useState } from "react";

/**
 * Sub-pixel rounding makes `scrollWidth` overshoot `clientWidth` by a fraction on text that
 * fits perfectly well, so a bare comparison would tooltip half the table.
 */
const OVERFLOW_TOLERANCE_PX = 1;

function isTextClipped(element: HTMLElement): boolean {
  return element.scrollWidth - element.clientWidth > OVERFLOW_TOLERANCE_PX;
}

/**
 * Whether the line inside `ref` was cut to fit its container — the one thing worth offering
 * a tooltip for. The same text clips or fits depending on where it lands, and containers
 * resize with the window, the sidebar, and a density control, so this re-measures on both.
 */
export function useClippedText(ref: RefObject<HTMLElement | null>, text: string): boolean {
  const [clipped, setClipped] = useState(false);

  const measure = useCallback(() => {
    const element = ref.current;
    if (element) setClipped(isTextClipped(element));
  }, [ref]);

  useEffect(() => {
    measure();
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure, ref]);

  useEffect(measure, [measure, text]);

  return clipped;
}
