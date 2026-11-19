import { queryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import {
  platformCompanyOperations as companyOps,
  platformCommunicationsOperations as operations,
  platformQueryKey,
  platformReadQuery,
  requestPlatformOperation,
} from "@/shared/api";

export type Announcement = z.output<
  (typeof operations.announcements.responses)["200"]
>["items"][number];
export type Company = z.output<(typeof companyOps.companies.responses)["200"]>["data"][number];

export function announcementsQuery(identity: string) {
  return platformReadQuery(identity, operations.announcements);
}

export function companyOptionsQuery(identity: string, page: number, limit = 100) {
  return queryOptions({
    queryKey: platformQueryKey(identity, companyOps.companies, JSON.stringify({ page, limit })),
    queryFn: ({ signal }) =>
      requestPlatformOperation(companyOps.companies, { query: { page, limit } }, signal),
  });
}

export async function createAnnouncement(
  body: z.input<typeof operations.createAnnouncement.requestSchema.shape.body>,
) {
  const result = await requestPlatformOperation(operations.createAnnouncement, { body });
  return result;
}
