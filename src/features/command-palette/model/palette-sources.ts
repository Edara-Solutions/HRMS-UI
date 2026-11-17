import {
  companyPeopleOperations,
  companyQueryKey,
  platformCompanyOperations,
  platformLeadOperations,
  platformPeopleOperations,
  platformQueryKey,
  requestCompanyOperation,
  requestPlatformOperation,
} from "@/shared/api";

export const RESULTS_PER_GROUP = 5;
export const MIN_QUERY_LENGTH = 2;

export interface PaletteHit {
  id: string;
  label: string;
  detail?: string;
  href: string;
}

export interface PaletteSource {
  key: "people" | "staff" | "companies" | "leads";
  queryKey: (term: string) => readonly unknown[];
  search: (term: string, signal: AbortSignal) => Promise<PaletteHit[]>;
}

export interface PaletteIdentity {
  audience: "company" | "platform";
  userPublicId: string;
  permissions: readonly string[];
  owner?: boolean;
}

const fullName = (person: { firstName: string; lastName: string }) =>
  `${person.firstName} ${person.lastName}`.trim();

function companySources(identity: PaletteIdentity): PaletteSource[] {
  const reads = identity.owner === true || identity.permissions.includes("users:read");
  if (!reads) return [];
  return [
    {
      key: "people",
      queryKey: (term) =>
        companyQueryKey(identity.userPublicId, companyPeopleOperations.users, "palette", term),
      search: async (term, signal) => {
        const page = await requestCompanyOperation(
          companyPeopleOperations.users,
          { query: { search: term, pageSize: RESULTS_PER_GROUP, sort: "nameAsc" } },
          signal,
        );
        return page.items.map((person) => ({
          id: person.publicId,
          label: fullName(person),
          detail: person.employeeCode,
          href: `/company/people/${person.publicId}`,
        }));
      },
    },
  ];
}

function platformSources(identity: PaletteIdentity): PaletteSource[] {
  const held = new Set(identity.permissions);
  const key = (operation: { key: string }, term: string) =>
    platformQueryKey(identity.userPublicId, operation, "palette", term);
  const sources: PaletteSource[] = [];
  if (held.has("platform-users:read"))
    sources.push({
      key: "staff",
      queryKey: (term) => key(platformPeopleOperations.users, term),
      search: async (term, signal) => {
        const page = await requestPlatformOperation(
          platformPeopleOperations.users,
          { query: { search: term, pageSize: RESULTS_PER_GROUP } },
          signal,
        );
        return page.items.map((person) => ({
          id: person.publicId,
          label: fullName(person),
          detail: person.email,
          href: `/platform/people/${person.publicId}`,
        }));
      },
    });
  if (held.has("companies:read"))
    sources.push({
      key: "companies",
      queryKey: (term) => key(platformCompanyOperations.companies, term),
      search: async (term, signal) => {
        const page = await requestPlatformOperation(
          platformCompanyOperations.companies,
          { query: { search: term, limit: RESULTS_PER_GROUP } },
          signal,
        );
        return page.data.map((company) => ({
          id: company.publicId,
          label: company.name,
          detail: company.companyCode,
          href: `/platform/companies/${company.publicId}`,
        }));
      },
    });
  if (held.has("leads:read"))
    sources.push({
      key: "leads",
      queryKey: (term) => key(platformLeadOperations.leads, term),
      search: async (term, signal) => {
        const page = await requestPlatformOperation(
          platformLeadOperations.leads,
          { query: { search: term, pageSize: RESULTS_PER_GROUP } },
          signal,
        );
        return page.items.map(({ lead, contacts }) => ({
          id: lead.publicId,
          label: lead.companyName ?? contacts.find((contact) => contact.isPrimary)?.name ?? "—",
          detail: contacts.find((contact) => contact.isPrimary)?.email ?? undefined,
          href: `/platform/leads/${lead.publicId}`,
        }));
      },
    });
  return sources;
}

export function paletteSources(identity: PaletteIdentity): PaletteSource[] {
  return identity.audience === "company" ? companySources(identity) : platformSources(identity);
}

export interface PalettePage {
  label: string;
  href: string;
}

export function matchPages(pages: readonly PalettePage[], term: string): PaletteHit[] {
  const needle = term.trim().toLocaleLowerCase();
  const matches = needle
    ? pages.filter((page) => page.label.toLocaleLowerCase().includes(needle))
    : pages;
  return matches
    .slice(0, RESULTS_PER_GROUP)
    .map((page) => ({ id: page.href, label: page.label, href: page.href }));
}
