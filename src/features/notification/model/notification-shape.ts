import type { RefObject } from "react";
import type { NotificationCenter } from "../lib/use-notification-center";

/** Whether the open shape is showing the feed or the style picker swapped in over it. */
export type NotificationCenterView = "feed" | "settings";

/** What the bell hands whichever shape the reader chose; every shape reads the same props. */
export interface NotificationShapeProps {
  open: boolean;
  /**
   * Owned by the bell, not by the shape: switching style unmounts one shape and mounts the
   * next with the center already open, and a per-shape center would re-run its seen-on-open
   * write for rows the reader has already been shown.
   */
  center: NotificationCenter;
  overlayId: string;
  overlayRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  view: NotificationCenterView;
  onClose: () => void;
  onViewChange: (view: NotificationCenterView) => void;
}
