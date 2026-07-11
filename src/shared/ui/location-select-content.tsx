import { type ReactNode, useState } from "react";
import { Input } from "@/shared/ui/input";
import { SelectContent, SelectItem } from "@/shared/ui/select";

export interface LocationSelectOption {
  value: string;
  label: ReactNode;
  searchText: string;
}

interface LocationSelectContentProps {
  options: LocationSelectOption[];
  searchPlaceholder: string;
  emptyMessage: string;
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

export function LocationSelectContent({
  options,
  searchPlaceholder,
  emptyMessage,
}: LocationSelectContentProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeSearchValue(query);
  const filteredOptions = normalizedQuery
    ? options.filter((option) => normalizeSearchValue(option.searchText).includes(normalizedQuery))
    : options;

  return (
    <SelectContent>
      <div className="sticky top-0 z-10 bg-[var(--color-surface)] p-1">
        <Input
          aria-label={searchPlaceholder}
          className="h-8"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          placeholder={searchPlaceholder}
        />
      </div>

      {filteredOptions.length > 0 ? (
        filteredOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))
      ) : (
        <div className="px-2.5 py-2 text-[13px] text-[var(--color-text-muted)]">{emptyMessage}</div>
      )}
    </SelectContent>
  );
}
