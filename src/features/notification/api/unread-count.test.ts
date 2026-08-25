// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchUnreadNotificationCount } from "./unread-count";

function countResponse(body: unknown, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function notModifiedResponse(headers: Record<string, string>) {
  return new Response(null, { status: 304, headers });
}

function requestOf(input: RequestInfo | URL, init?: RequestInit) {
  return input instanceof Request ? input : new Request(input, init);
}

describe("fetchUnreadNotificationCount", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("revalidates with the stored ETag and leaves the count untouched on a 304", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
      requestOf(input, init).headers.get("If-None-Match") === '"u:7:12"'
        ? notModifiedResponse({ etag: '"u:7:12"' })
        : countResponse({ unreadCount: 3 }, { etag: '"u:7:12"' }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const first = await fetchUnreadNotificationCount("company");
    const second = await fetchUnreadNotificationCount("company");

    expect(first).toEqual({ unreadCount: 3, pollIntervalMs: 30_000 });
    expect(second).toBe(first);

    const [initial, revalidation] = fetchMock.mock.calls.map(([input, init]) =>
      requestOf(input, init),
    );
    expect(initial.url).toContain("company/notifications/unread-count");
    expect(initial.headers.has("If-None-Match")).toBe(false);
    expect(revalidation.headers.get("If-None-Match")).toBe('"u:7:12"');
  });

  it("reads the platform mount and lets the server cadence header win", async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      async () => countResponse({ unreadCount: 8 }, { etag: '"pa:2:5"', "x-poll-interval": "10" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchUnreadNotificationCount("platform");

    expect(result).toEqual({ unreadCount: 8, pollIntervalMs: 10_000 });
    const [input, init] = fetchMock.mock.calls[0];
    expect(requestOf(input, init).url).toContain("platform/notifications/unread-count");
  });
});
