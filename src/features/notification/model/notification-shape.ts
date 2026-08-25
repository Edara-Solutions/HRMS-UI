import type { RefObject } from "react";

/** Whether the open shape is showing the feed or the style picker swapped in over it. */
export type NotificationCenterView = "feed" | "settings";

/** What the bell hands whichever shape the reader chose; every shape reads the same props. */
export interface NotificationShapeProps {
  open: boolean;
  overlayId: string;
  overlayRef: RefObject<HTMLDivElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  view: NotificationCenterView;
  onClose: () => void;
  onViewChange: (view: NotificationCenterView) => void;
}
