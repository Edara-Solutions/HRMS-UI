import type { NotificationListStyle } from "@/shared/config";
import { cn } from "@/shared/lib/cn";

interface NotificationStylePreviewProps {
  style: NotificationListStyle;
}

const stageClassName =
  "relative h-[68px] w-full overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)]";

const surfaceClassName =
  "rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)]";

/**
 * A miniature of the shape, drawn from the same tokens the shape itself uses, so what the
 * reader compares is the real thing in the current theme and direction rather than a picture
 * of it in someone else's.
 */
export function NotificationStylePreview({ style }: NotificationStylePreviewProps) {
  if (style === "sheet") {
    return (
      <div aria-hidden="true" className={stageClassName}>
        <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--color-text)_18%,transparent)]" />
        <div
          className={cn(
            "absolute inset-y-1.5 end-1.5 w-1/2 p-1.5",
            surfaceClassName,
            "flex flex-col gap-1.5",
          )}
        >
          <PreviewHeading />
          <PreviewRow lines={2} />
          <PreviewRow lines={2} muted />
        </div>
      </div>
    );
  }

  if (style === "flat") {
    return (
      <div aria-hidden="true" className={stageClassName}>
        <div className={cn("absolute inset-x-1.5 top-1.5 bottom-1.5 p-1.5", surfaceClassName)}>
          <div className="flex gap-1">
            <span className="h-2 w-6 rounded-full bg-[var(--color-primary-fill)]" />
            <span className="h-2 w-6 rounded-full bg-[var(--color-surface-2)]" />
          </div>
          <div className="mt-1.5 flex flex-col gap-1">
            <PreviewRow lines={1} />
            <PreviewRow lines={1} />
            <PreviewRow lines={1} muted />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div aria-hidden="true" className={stageClassName}>
      <span className="absolute top-1.5 end-1.5 size-1.5 rounded-full bg-[var(--color-primary)]" />
      <div
        className={cn(
          "absolute top-4 end-1.5 w-2/3 p-1.5",
          surfaceClassName,
          "flex flex-col gap-1.5 shadow-[var(--shadow-sm)]",
        )}
      >
        <PreviewHeading />
        <PreviewRow lines={2} />
        <PreviewRow lines={2} muted />
      </div>
    </div>
  );
}

function PreviewHeading() {
  return <span className="h-1.5 w-8 rounded-full bg-[var(--color-text-faint)]" />;
}

interface PreviewRowProps {
  lines: 1 | 2;
  muted?: boolean;
}

function PreviewRow({ lines, muted = false }: PreviewRowProps) {
  return (
    <span className="flex items-start gap-1">
      <span
        className={cn(
          "mt-px size-2 shrink-0 rounded-[2px]",
          muted ? "bg-[var(--color-surface-2)]" : "bg-[var(--color-primary-soft)]",
        )}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "h-1 w-full rounded-full",
            muted ? "bg-[var(--color-surface-2)]" : "bg-[var(--color-border)]",
          )}
        />
        {lines === 2 ? (
          <span className="h-1 w-2/3 rounded-full bg-[var(--color-surface-2)]" />
        ) : null}
      </span>
    </span>
  );
}
