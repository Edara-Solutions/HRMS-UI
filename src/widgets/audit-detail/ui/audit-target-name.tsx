import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { auditNamespace } from "@/features/audit-filters";
import { cn } from "@/shared/lib/cn";
import { TruncatedText } from "@/shared/ui/truncated-text";
import type { AuditTargetDestination, AuditTargetPresentation } from "../model/audit-identity";

interface AuditTargetNameProps {
  target: AuditTargetPresentation;
  /** Widths differ between the table cell and the expanded detail list. */
  className?: string;
}

const linkClassName =
  "min-w-0 rounded-[var(--radius-sm)] underline-offset-4 transition-colors hover:text-[var(--color-primary)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]";

/**
 * Each destination is written out rather than assembled from the map, so the router keeps
 * checking that the path and its params still exist — and the exhaustive check makes a
 * destination added later a type error here rather than a silent link to the wrong page.
 */
function TargetLink({
  target,
  children,
}: {
  target: AuditTargetPresentation & { destination: AuditTargetDestination };
  children: ReactNode;
}) {
  switch (target.destination) {
    case "admin-company":
      return (
        <Link
          to="/admin/companies/$publicId"
          params={{ publicId: target.publicId }}
          className={linkClassName}
        >
          {children}
        </Link>
      );
    case "admin-lead":
      return (
        <Link
          to="/admin/leads/$publicId"
          params={{ publicId: target.publicId }}
          className={linkClassName}
        >
          {children}
        </Link>
      );
    default:
      return assertNoDestinationLeft(target.destination);
  }
}

/** Reached only if a destination is added without a link above, which the types forbid. */
function assertNoDestinationLeft(destination: never): never {
  throw new Error(`Audit target destination has no link: ${String(destination)}`);
}

/**
 * The second line of a subject: its current name where one resolved, its identifier where one
 * did not, and the erased subject where the entity is gone. Only a name that resolved is ever
 * a link — an unresolved entity degrades to text rather than to a link that leads nowhere.
 */
export function AuditTargetName({ target, className }: AuditTargetNameProps) {
  const { t } = useTranslation(auditNamespace);

  if (target.erased) {
    return (
      <span className="text-[12px] text-[var(--color-text-faint)]">
        {t("chrome.erasedSubject")}
      </span>
    );
  }

  if (target.name === null) {
    return (
      <TruncatedText
        text={target.publicId}
        className={cn("max-w-52 font-mono text-[11px] text-[var(--color-text-faint)]", className)}
      />
    );
  }

  const name = (
    <TruncatedText
      text={target.name}
      focusable={target.destination === null}
      className={cn("max-w-52 text-[12px]", className)}
    />
  );

  if (target.destination === null) {
    return <span className="text-[var(--color-text-muted)]">{name}</span>;
  }

  return (
    <span className="text-[var(--color-text)]">
      <TargetLink target={{ ...target, destination: target.destination }}>{name}</TargetLink>
    </span>
  );
}
