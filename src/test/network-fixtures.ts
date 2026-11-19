import { vi } from "vitest";

export interface RecordedRequest {
  key: string;
  authorization: string | null;
  body: unknown;
}

type Handler = (request: Request) => Response | Promise<Response>;

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** A declared problem body whose free text doubles as a disclosure canary. */
export function problem(status: number, extra: Record<string, unknown> = {}) {
  return json(
    {
      type: "about:blank",
      title: "Problem canary",
      status,
      detail: "internal-detail-canary",
      instance: "/internal-instance-canary",
      traceId: "a".repeat(32),
      ...extra,
    },
    status,
  );
}

/**
 * Stubs `fetch` with exact `METHOD /path` routes. An unexpected operation fails the request loudly,
 * so a test also proves no request crossed to another audience or a legacy path.
 */
export function stubNetwork(routes: Record<string, Handler>) {
  const requests: RecordedRequest[] = [];
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const key = `${request.method} ${new URL(request.url).pathname}`;
    const text = await request.clone().text();
    requests.push({
      key,
      authorization: request.headers.get("authorization"),
      body: text ? JSON.parse(text) : undefined,
    });
    const handler = routes[key];
    if (!handler) throw new Error(`Unexpected operation ${key}`);
    return handler(request);
  });
  return requests;
}
