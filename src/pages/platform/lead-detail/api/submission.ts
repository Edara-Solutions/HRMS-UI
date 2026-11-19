import {
  ContractViolation,
  platformLeadOperations as operations,
  requestPlatformOperation,
} from "@/shared/api";
/** Complete page scan. A first-page miss never proves that no durable request exists. */
export async function findPendingRequest(leadPublicId: string) {
  let page = 1;
  for (;;) {
    const result = await requestPlatformOperation(operations.requests, {
      query: { status: "PENDING", page, pageSize: 100 },
    });
    if (result.meta.page !== page)
      throw new ContractViolation({
        audience: "platform",
        key: operations.requests.key,
        phase: "response",
        status: 200,
      });
    const found = result.items.find(
      (item) => item.lead.publicId === leadPublicId && item.status === "PENDING",
    );
    if (found) return { publicId: found.publicId, plan: found.plan.name };
    if (page >= result.meta.totalPages) return null;
    page += 1;
  }
}
