import { useRef } from "react";
import { cn } from "@/shared/lib/cn";
import { useClippedText } from "@/shared/lib/use-clipped-text";
import { Tooltip, type TooltipPlacement } from "@/shared/ui/tooltip";

interface TruncatedTextProps {
  text: string;
  /** Adds a tab stop when the text is clipped. Leave off inside an already-focusable parent. */
  focusable?: boolean;
  placement?: TooltipPlacement;
  className?: string;
}

/**
 * Truncates to its container and offers the whole value on hover or focus — but only when
 * truncation actually happened. A tooltip that repeats text already fully on screen is noise,
 * and noise is what stops people reading tooltips at all.
 */
export function TruncatedText({
  text,
  focusable = true,
  placement,
  className,
}: TruncatedTextProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const clipped = useClippedText(textRef, text);

  return (
    <Tooltip
      content={text}
      disabled={!clipped}
      focusable={focusable && clipped}
      placement={placement}
    >
      <span ref={textRef} className={cn("block truncate", className)}>
        {text}
      </span>
    </Tooltip>
  );
}
