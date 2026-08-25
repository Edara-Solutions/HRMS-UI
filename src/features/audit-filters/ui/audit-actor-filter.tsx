import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import type { AuditActorMatch } from "../model/audit-filters";
import { auditNamespace, shortAuditIdentifier } from "../model/audit-text";
import { AuditFilterCombobox, auditFilterComboboxState } from "./audit-filter-combobox";

interface AuditActorFilterProps {
  id: string;
  actorPublicId?: string;
  /** Distinguishes the two audiences' result sets in the query cache. */
  searchKey: string;
  searchActors: (query: string) => Promise<AuditActorMatch[]>;
  onChange: (actorPublicId: string | undefined) => void;
}

/** The shortest fragment the search endpoints answer, so a stray keystroke is not a request. */
const MINIMUM_FRAGMENT_LENGTH = 2;

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
  const [selected, setSelected] = useState<AuditActorMatch>();
  const fragment = useDebouncedValue(query.trim(), 250);
  const enabled = fragment.length >= MINIMUM_FRAGMENT_LENGTH;

  const matches = useQuery({
    queryKey: ["audit-actor-search", searchKey, fragment],
    queryFn: () => searchActors(fragment),
    enabled,
  });

  // Only the actor this picker resolved has a name to show; one arriving from a row click or
  // a shared link is an identifier, and last search's name would be the wrong words for it.
  function nameFor(publicId: string): string | undefined {
    return selected?.publicId === publicId ? selected.name : undefined;
  }

  return (
    <AuditFilterCombobox
      id={id}
      label={t("chrome.filterActor")}
      searchPlaceholder={t("chrome.filterActorSearch")}
      // A shared link carries the identifier alone; naming it again would need a lookup the
      // trail does not have, so the chip shows the identifier it is honestly filtering by.
      summary={
        actorPublicId ? (nameFor(actorPublicId) ?? shortAuditIdentifier(actorPublicId)) : undefined
      }
      value={actorPublicId}
      state={enabled ? auditFilterComboboxState(matches) : "prompt"}
      options={(matches.data ?? []).map((actor) => ({
        value: actor.publicId,
        label: actor.name,
      }))}
      onQueryChange={setQuery}
      onSelect={(option) => {
        setSelected({ publicId: option.value, name: option.label });
        onChange(option.value);
      }}
      onClear={() => onChange(undefined)}
    />
  );
}
