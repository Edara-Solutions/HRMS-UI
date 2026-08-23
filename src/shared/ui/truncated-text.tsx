import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { Tooltip } from "@/shared/ui/tooltip";

interface TruncatedTextProps {
  text: string;
  /** Adds a tab stop when the text is clipped. Leave off inside an already-focusable parent. */
  focusable?: boolean;
  className?: string;
}

/**
 * A single line that may not fit, and says so only when it doesn't.
 *
 * Sub-pixel rounding makes `scrollWidth` overshoot `clientWidth` by a fraction on text that
 * fits perfectly well, so a bare comparison would tooltip half the table.
 */
const OVERFLOW_TOLERANCE_PX = 1;

function isTextClipped(element: HTMLElement): boolean {
  return element.scrollWidth - element.clientWidth > OVERFLOW_TOLERANCE_PX;
}

/**
 * Truncates to its container and offers the whole value on hover or focus — but only when
 * truncation actually happened. A tooltip that repeats text already fully on screen is noise,
 * and noise is what stops people reading tooltips at all.
 */
export function TruncatedText({ text, focusable = true, className }: TruncatedTextProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [clipped, setClipped] = useState(false);

  const measure = useCallback(() => {
    const element = textRef.current;
    if (element) setClipped(isTextClipped(element));
  }, []);

  // The same text clips or fits depending on the column it lands in, and columns resize with
  // the window, the sidebar, and the density control.
  useEffect(() => {
    measure();
    const element = textRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure]);

  useEffect(measure, [measure, text]);

  return (
    <Tooltip content={text} disabled={!clipped} focusable={focusable && clipped}>
      <span ref={textRef} className={cn("block truncate", className)}>
        {text}
      </span>
    </Tooltip>
  );
}
