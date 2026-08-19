import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { auditNamespace } from "@/shared/lib/audit-text";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { AuditFilterCombobox } from "./audit-filter-combobox";

export interface AuditActorMatch {
  publicId: string;
  name: string;
}

interface AuditActorFilterProps {
  id: string;
  actorPublicId?: string;
  /** Distinguishes the two audiences' result sets in the query cache. */
  searchKey: string;
  searchActors: (query: string) => Promise<AuditActorMatch[]>;
  onChange: (actorPublicId: string | undefined) => void;
}

/** The shortest fragment the search endpoints answer, so a stray keystroke is not a request. */
const minimumFragmentLength = 2;

/**
 * Resolves a name to the `actorPublicId` the trail actually filters by. Free text over the
 * payloads was ruled out — the catalog carries no human-readable strings — so a name only
 * ever enters the query as the identifier it resolves to.
 */
export function AuditActorFilter({
  id,
  actorPublicId,
  searchKey,
  searchActors,
  onChange,
}: AuditActorFilterProps) {
  const { t } = useTranslation(auditNamespace);
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState<string>();
  const fragment = useDebouncedValue(query.trim(), 250);
  const enabled = fragment.length >= minimumFragmentLength;

  const matches = useQuery({
    queryKey: ["audit-actor-search", searchKey, fragment],
    queryFn: () => searchActors(fragment),
    enabled,
  });

  return (
    <AuditFilterCombobox
      id={id}
      label={t("chrome.filterActor")}
      searchPlaceholder={t("chrome.filterActorSearch")}
      // A shared link carries the identifier alone; naming it again would need a lookup the
      // trail does not have, so the chip shows the identifier it is honestly filtering by.
      summary={actorPublicId ? (selectedName ?? shortIdentifier(actorPublicId)) : undefined}
      value={actorPublicId}
      state={comboboxState(enabled, matches.isPending, matches.isError)}
      options={(matches.data ?? []).map((actor) => ({
        value: actor.publicId,
        label: actor.name,
      }))}
      onQueryChange={setQuery}
      onSelect={(option) => {
        setSelectedName(option.label);
        onChange(option.value);
      }}
      onClear={() => {
        setSelectedName(undefined);
        onChange(undefined);
      }}
    />
  );
}

function comboboxState(enabled: boolean, pending: boolean, failed: boolean) {
  if (!enabled) return "prompt" as const;
  if (failed) return "error" as const;
  return pending ? ("loading" as const) : ("ready" as const);
}

function shortIdentifier(publicId: string): string {
  return `${publicId.slice(0, 8)}…`;
}
