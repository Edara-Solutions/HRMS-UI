import { afterEach, describe, expect, it } from "vitest";
import { usePreferencesStore } from "./preferences-store";

const STORAGE_KEY = "hrms-prefs";

afterEach(() => {
  usePreferencesStore.setState({ notificationListStyle: "panel" });
  localStorage.removeItem(STORAGE_KEY);
});

describe("notification list style preference", () => {
  it("opens the notification center as the anchored panel until the reader says otherwise", () => {
    expect(usePreferencesStore.getState().notificationListStyle).toBe("panel");
  });

  it("keeps the chosen style across a reload", async () => {
    usePreferencesStore.getState().setNotificationListStyle("flat");

    // `persist` writes after the state settles, and rehydration reads what it wrote.
    await usePreferencesStore.persist.rehydrate();

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").state).toMatchObject({
      notificationListStyle: "flat",
    });
    expect(usePreferencesStore.getState().notificationListStyle).toBe("flat");
  });
});
