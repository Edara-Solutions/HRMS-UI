import { useQueries } from "@tanstack/react-query";
import { OperationRefusal } from "@/shared/api";
import { useDebouncedValue } from "../lib/use-debounced-value";
import { MIN_QUERY_LENGTH, type PaletteHit, type PaletteSource } from "../model/palette-sources";

export const SEARCH_DEBOUNCE_MS = 250;

export interface PaletteGroupState {
  key: PaletteSource["key"];
  hits: PaletteHit[];
  status: "idle" | "loading" | "ready" | "rate-limited" | "failed";
  retry: () => void;
}

export function usePaletteSearch(
  sources: readonly PaletteSource[],
  term: string,
  open: boolean,
): PaletteGroupState[] {
  const settled = useDebouncedValue(term.trim(), SEARCH_DEBOUNCE_MS);
  const active = open && settled.length >= MIN_QUERY_LENGTH;
  const results = useQueries({
    queries: sources.map((source) => ({
      queryKey: source.queryKey(settled),
      queryFn: ({ signal }: { signal: AbortSignal }) => source.search(settled, signal),
      enabled: active,
      staleTime: 30_000,
      gcTime: 60_000,
      retry: false,
      refetchOnWindowFocus: false,
    })),
  });
  return sources.map((source, index) => {
    const result = results[index];
    const refused = result?.error instanceof OperationRefusal ? result.error : undefined;
    const status: PaletteGroupState["status"] = !active
      ? "idle"
      : result?.isPending
        ? "loading"
        : refused?.status === 429
          ? "rate-limited"
          : result?.isError
            ? "failed"
            : "ready";
    return {
      key: source.key,
      hits: active ? (result?.data ?? []) : [],
      status,
      retry: () => void result?.refetch(),
    };
  });
}
