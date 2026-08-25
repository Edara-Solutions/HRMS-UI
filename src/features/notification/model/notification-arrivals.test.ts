import { beforeEach, describe, expect, it } from "vitest";
import type { NotificationFeedItem } from "../api/notification-feed";
import {
  planArrivalToast,
  recordPresentedNotifications,
  unpresentedNotifications,
  usePresentedNotifications,
} from "./notification-arrivals";

function arrival(id: number, typeKey: string, createdAt: string): NotificationFeedItem {
  return {
    id,
    scope: "company",
    typeKey,
    typeVersion: 1,
    importance: "normal",
    params: {},
    actor: { kind: "system" },
    subject: null,
    createdAt,
    seenAt: null,
    readAt: null,
  };
}

const high = () => arrival(2, "company.role-assigned", "2026-08-25T10:00:00.000Z");
const normal = () => arrival(1, "company.user-joined", "2026-08-25T09:00:00.000Z");

describe("arrival routing", () => {
  beforeEach(() => {
    usePresentedNotifications.getState().clear();
  });

  it("announces the newest high-importance arrival of a batch", () => {
    expect(planArrivalToast([high(), normal()])).toEqual({
      typeKey: "company.role-assigned",
      params: {},
    });
  });

  it("lets normal-importance arrivals wait in the bell", () => {
    expect(planArrivalToast([normal()])).toBeNull();
  });

  it("announces nothing for a type the catalog mirror does not know", () => {
    expect(
      planArrivalToast([arrival(3, "platform.not-in-the-mirror", "2026-08-25T11:00:00.000Z")]),
    ).toBeNull();
  });

  it("carries the arrival's params through to the toast request", () => {
    const roleAssigned = { ...high(), params: { roleName: "Payroll Manager" } };

    expect(planArrivalToast([roleAssigned])?.params).toEqual({ roleName: "Payroll Manager" });
  });
});

describe("presented ledger", () => {
  beforeEach(() => {
    usePresentedNotifications.getState().clear();
  });

  it("reports only rows no path has presented yet", () => {
    recordPresentedNotifications([normal()]);

    expect(unpresentedNotifications([normal(), high()])).toEqual([high()]);
  });

  it("never announces the same id twice across polls", () => {
    recordPresentedNotifications([high()]);

    expect(planArrivalToast(unpresentedNotifications([high()]))).toBeNull();
  });
});
