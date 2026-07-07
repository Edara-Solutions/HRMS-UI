import type { HTMLAttributes, ImgHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type AvatarSize = "sm" | "md" | "lg";

const sizeClassName: Record<AvatarSize, string> = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
};

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  initials?: string;
  size?: AvatarSize;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({ className, src, alt, initials, size = "md", ...props }: AvatarProps) {
  const fallback = initials ?? (alt ? getInitials(alt) : "?");

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] font-semibold text-[var(--color-primary)]",
        sizeClassName[size],
        className,
      )}
      {...props}
    >
      {src ? <AvatarImage src={src} alt={alt ?? ""} /> : <span aria-hidden="true">{fallback}</span>}
    </div>
  );
}

interface AvatarImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  alt: string;
}

function AvatarImage({ className, alt, ...props }: AvatarImageProps) {
  return (
    <img alt={alt} className={cn("aspect-square size-full object-cover", className)} {...props} />
  );
}
