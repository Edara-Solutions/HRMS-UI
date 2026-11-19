import { z } from "zod";
import { companyPeopleOperations as operations } from "@/shared/api";

type Operations = typeof operations;
export type Person = z.output<Operations["users"]["responses"]["200"]>["items"][number];
export type PersonStatus = Person["status"];
export type BulkOutcome = z.output<Operations["deleteUsers"]["responses"]["200"]>;
export type NewPerson = z.input<Operations["createUser"]["requestSchema"]>["body"];

export const personStatuses = [
  "ACTIVE",
  "ONBOARDING",
  "PROBATION",
  "SUSPENDED",
  "TERMINATED",
  "RESIGNED",
] as const satisfies readonly PersonStatus[];

export const rosterPageSize = 20;

/** Roster search is URL state: validated, bounded, and falling back instead of failing. */
export const rosterSearchSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  status: z.enum(personStatuses).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
});

export type RosterSearch = z.infer<typeof rosterSearchSchema>;

export interface BulkSummary {
  succeeded: number;
  /** Submitted positions (1-based) the server declared failed; its message text is never shown. */
  failedPositions: number[];
  /** Submitted items the response accounts for neither way: their outcome is unknown. */
  unaccounted: number;
}

/** Reads a bulk result without assuming all-or-nothing: each submitted item is success, failure or unknown. */
export function summarizeBulk(
  outcome: { success: unknown[]; errors: { index: number }[] },
  submitted: number,
): BulkSummary {
  const failedPositions = [...new Set(outcome.errors.map((error) => error.index))]
    .filter((index) => index >= 0 && index < submitted)
    .sort((left, right) => left - right)
    .map((index) => index + 1);
  return {
    succeeded: outcome.success.length,
    failedPositions,
    unaccounted: Math.max(0, submitted - outcome.success.length - failedPositions.length),
  };
}

const bulkRowSchema = operations.createUsers.requestSchema.shape.body.element;

export interface ParsedRows {
  rows: NewPerson[];
  /** 1-based line numbers that are not `First, Last, Email`. */
  invalidLines: number[];
}

/** One person per non-empty line as `First name, Last name, Email`, validated by the generated item schema. */
export function parseBulkRows(text: string): ParsedRows {
  const rows: NewPerson[] = [];
  const invalidLines: number[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (line.trim() === "") return;
    const [firstName = "", lastName = "", email = "", ...rest] = line
      .split(",")
      .map((cell) => cell.trim());
    const parsed = bulkRowSchema.safeParse({ firstName, lastName, email });
    if (rest.length > 0 || !parsed.success) invalidLines.push(index + 1);
    else rows.push(parsed.data);
  });
  return { rows, invalidLines };
}
