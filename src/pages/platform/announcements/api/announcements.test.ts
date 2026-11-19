import { expect, it } from "vitest";
import { ContractViolation, platformCommunicationsOperations as operations } from "@/shared/api";
import { problemBody } from "../../../../test/operation-fakes";
import {
  announcementBody,
  announcementCreateBody,
  deliveriesBody,
  deliveryBody,
  sendingBody,
} from "../../../../test/platform-communications-fixtures";

it("pins bilingual composition, Company identifiers and each scoped selector", () => {
  const schema = operations.createAnnouncement.requestSchema;
  expect(schema.parse({ body: announcementCreateBody() })).toMatchObject({
    body: {
      message: { en: { title: expect.any(String) }, ar: { title: expect.any(String) } },
      rules: [{ scope: "company", selector: { kind: "blast" } }],
    },
  });
  for (const bad of [
    { message: { en: { title: "Only one language", body: "Missing Arabic" } } },
    { rules: [{ scope: "platform", selector: { kind: "blast" } }] },
    { rules: [{ scope: "company", selector: { kind: "roster" } }] },
    { companies: ["internal-identifier"] },
  ])
    expect(() =>
      operations.createAnnouncement.parseRequest({ body: announcementCreateBody(bad) }),
    ).toThrow(ContractViolation);
});
for (const status of ["SCHEDULED", "DISPATCHING", "PARTIAL", "DELIVERED", "SKIPPED", "FAILED"])
  it(`retains dispatch completion and distinct reach for ${status}`, () => {
    const body = {
      items: [
        announcementBody({
          status,
          dispatchFinishedAt: null,
          companiesReached: 12,
          recipientsReached: 340,
        }),
      ],
    };
    expect(operations.announcements.parseResponse(200, body)).toEqual(body);
  });
const target = { context: "COMPANY", publicId: "0e1f2d3c-4b5a-6978-8796-b5c4d3e2f1a0" };
for (const [operation, input, body] of [
  [
    operations.deliveries,
    { query: { context: "COMPANY", page: 1, pageSize: 25 } },
    deliveriesBody(),
  ],
  [operations.delivery, { params: target }, deliveryBody()],
  [
    operations.retryDelivery,
    { params: target, body: { reason: "Repair verified" } },
    deliveryBody(),
  ],
  [
    operations.cancelDelivery,
    { params: target, body: { reason: "Cancel queued delivery" } },
    deliveryBody(),
  ],
  [operations.sendingStatus, {}, sendingBody()],
  [
    operations.pauseSending,
    { params: { context: "EDARA" }, body: { reason: "Incident" } },
    sendingBody().items[0],
  ],
  [operations.resumeSending, { params: { context: "EDARA" } }, sendingBody().items[0]],
] as const)
  it(`binds ${operation.key} to declared input and refusal contracts`, () => {
    expect(operation.audience).toBe("platform");
    expect(operation.parseRequest(input)).toEqual(input);
    expect(operation.parseResponse(200, body)).toEqual(body);
    for (const status of [400, 401, 403, 404, 409, 429, 500])
      expect(operation.parseResponse(status, problemBody(status))).toMatchObject({ status });
    expect(() => operation.parseResponse(200, { secret: "contract-canary" })).toThrow(
      ContractViolation,
    );
  });
