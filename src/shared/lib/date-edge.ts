export const dateEdgeTypeValues = ["inclusive", "exclusive"] as const;

export type DateEdgeType = (typeof dateEdgeTypeValues)[number];

export interface DateEdgeValue {
  date: string;
  edgeDateType: DateEdgeType;
}

const DEFAULT_EDGE_DATE_TYPE: DateEdgeType = "inclusive";

export function allowEdgeDateChoice(): boolean {
  return (
    import.meta.env.VITE_ALLOW_EDGE_DATE_CHOISE === "true" ||
    import.meta.env.ALLOW_EDGE_DATE_CHOISE === "true"
  );
}

export function toDateEdgeValue(
  date: string | undefined,
  edgeDateType: DateEdgeType = DEFAULT_EDGE_DATE_TYPE,
): DateEdgeValue | undefined {
  if (!date) return undefined;
  return { date, edgeDateType };
}

export function getDateEdgeDate(value: DateEdgeValue | string | undefined): string | undefined {
  if (typeof value === "string") return value;
  return value?.date;
}

export function getDateEdgeType(value: DateEdgeValue | undefined): DateEdgeType {
  return value?.edgeDateType ?? DEFAULT_EDGE_DATE_TYPE;
}

export function serializeDateEdgeValue(
  value: DateEdgeValue | string | undefined,
): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function isDateEdgeType(value: unknown): value is DateEdgeType {
  return value === "inclusive" || value === "exclusive";
}

function parseDateEdgeObject(value: Record<string, unknown>): DateEdgeValue | undefined {
  return typeof value.date === "string" && isDateEdgeType(value.edgeDateType)
    ? { date: value.date, edgeDateType: value.edgeDateType }
    : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

export function parseDateEdgeSearchValue(value: unknown): DateEdgeValue | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (isRecord(parsed)) {
        const edgeValue = parseDateEdgeObject(parsed);
        if (edgeValue) return edgeValue;
      }
    } catch {
      return { date: value, edgeDateType: "inclusive" };
    }
    return { date: value, edgeDateType: "inclusive" };
  }
  if (isRecord(value)) return parseDateEdgeObject(value);
  return undefined;
}
