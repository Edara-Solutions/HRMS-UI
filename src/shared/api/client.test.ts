// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./client";

afterEach(() => vi.unstubAllGlobals());

describe("retired generic transport", () => {
  it.each([
    "GET",
    "POST",
  ] as const)("refuses a legacy %s before any network request", async (method) => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(
      apiClient("auth/refresh", { method, headers: { Authorization: "Bearer private-canary" } }),
    ).rejects.toThrow("This workflow is not available in this build.");
    expect(fetch).not.toHaveBeenCalled();
  });
});
