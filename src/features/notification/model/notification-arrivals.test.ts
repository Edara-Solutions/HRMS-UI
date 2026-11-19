import { beforeEach, describe, expect, it } from "vitest";
import { notificationRow } from "../../../test/notification-fixtures";
import type { NotificationFeedItem } from "../api/notification-transport";
import {
  planArrivalToast,
  recordPresentedNotifications,
  unpresentedNotifications,
  usePresentedNotifications,
} from "./notification-arrivals";

function arrival(n: number, typeKey: string, createdAt: string): NotificationFeedItem {
  return notificationRow(n, typeKey, createdAt);
}

const high = () => arrival(2, "company.role-assigned", "2026-08-25T10:00:00.000Z");
const normal = () => arrival(1, "company.user-joined", "2026-08-25T09:00:00.000Z");

describe("arrival routing", () => {
  beforeEach(() => {
    usePresentedNotifications.getState().clear();
  });

  it("announces the newest high-importance arrival of a batch", () => {
    expect(planArrivalToast("company", [high(), normal()])).toEqual({
      tier: "company",
      typeKey: "company.role-assigned",
      typeVersion: 1,
      params: {},
    });
  });

  it("lets normal-importance arrivals wait in the bell", () => {
    expect(planArrivalToast("company", [normal()])).toBeNull();
  });

  it("announces nothing for a type or version the audience mirror does not know", () => {
    expect(
      planArrivalToast("company", [
        arrival(3, "company.not-in-the-mirror", "2026-08-25T11:00:00.000Z"),
      ]),
    ).toBeNull();
    expect(
      planArrivalToast("company", [
        arrival(4, "platform.lead-created", "2026-08-25T11:00:00.000Z"),
      ]),
    ).toBeNull();
    expect(planArrivalToast("company", [{ ...high(), typeVersion: 2 }])).toBeNull();
  });

  it("carries the arrival's params through to the toast request", () => {
    const roleAssigned = { ...high(), params: { roleName: "Payroll Manager" } };

    expect(planArrivalToast("company", [roleAssigned])?.params).toEqual({
      roleName: "Payroll Manager",
    });
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

    expect(planArrivalToast("company", unpresentedNotifications([high()]))).toBeNull();
  });
});

describe("presented ledger ownership", () => {
  beforeEach(() => {
    usePresentedNotifications.getState().clear();
  });

  it("keeps an unclaimed session's presentations and wipes them for a different identity", () => {
    recordPresentedNotifications([high()]);
    usePresentedNotifications.getState().adopt("company:a");
    expect(unpresentedNotifications([high()])).toEqual([]);

    usePresentedNotifications.getState().adopt("company:a");
    expect(unpresentedNotifications([high()])).toEqual([]);

    usePresentedNotifications.getState().adopt("company:b");
    expect(unpresentedNotifications([high()])).toEqual([high()]);
  });
});
