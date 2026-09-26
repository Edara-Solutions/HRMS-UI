import { afterEach, describe, expect, it } from "vitest";
import {
  defaultPresentation,
  migrateLegacyPreferences,
  usePreferencesStore,
} from "./preferences-store";

const id = "11111111-1111-4111-8111-111111111111";
afterEach(() => {
  usePreferencesStore.setState({ locale: "en", theme: "light", scopes: {} });
  localStorage.clear();
});
describe("identity-scoped presentation", () => {
  it("migrates only locale and theme", () => {
    expect(
      migrateLegacyPreferences(
        JSON.stringify({
          state: {
            locale: "ar",
            theme: "dark",
            sidebarCollapsed: true,
            notificationListStyle: "flat",
            token: "secret",
          },
        }),
      ),
    ).toEqual({ locale: "ar", theme: "dark", scopes: {} });
    expect(migrateLegacyPreferences("not json")).toEqual({
      locale: "en",
      theme: "light",
      scopes: {},
    });
  });
  it("isolates audience and identity and persists a versioned envelope", async () => {
    usePreferencesStore
      .getState()
      .setPresentation(`company:${id}`, { sidebarCollapsed: true, notificationListStyle: "flat" });
    await usePreferencesStore.persist.rehydrate();
    const state = usePreferencesStore.getState();
    expect(state.scopes[`company:${id}`]).toEqual({
      sidebarCollapsed: true,
      notificationListStyle: "flat",
    });
    expect(state.scopes[`platform:${id}`] ?? defaultPresentation).toEqual(defaultPresentation);
    expect(
      state.scopes["company:22222222-2222-4222-8222-222222222222"] ?? defaultPresentation,
    ).toEqual(defaultPresentation);
    expect(JSON.parse(localStorage.getItem("hrms-preferences:v2") ?? "{}").version).toBe(2);
    expect(localStorage.getItem("hrms-prefs")).toBeNull();
  });
  it.each([
    "garbage",
    JSON.stringify({ version: 1, state: { locale: "ar", theme: "dark", scopes: {} } }),
    JSON.stringify({
      version: 2,
      state: { locale: "en", theme: "light", scopes: { other: { sidebarCollapsed: true } } },
    }),
  ])("rejects ambiguous storage", async (raw) => {
    localStorage.setItem("hrms-preferences:v2", raw);
    await usePreferencesStore.persist.rehydrate();
    expect(usePreferencesStore.getState().scopes).toEqual({});
    expect(usePreferencesStore.getState().locale).toBe("en");
  });
});
