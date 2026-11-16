import { useEffect, useRef, useState } from "react";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
const easeOut = (progress: number) => 1 - (1 - progress) ** 3;

export function useEasedNumber(target: number, durationMs = 200) {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    const from = shownRef.current;
    if (from === target) return;
    const settle = (value: number) => {
      shownRef.current = value;
      setShown(value);
    };
    if (window.matchMedia(reducedMotionQuery).matches) {
      settle(target);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      settle(Math.round(from + (target - from) * easeOut(progress)));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return shown;
}
