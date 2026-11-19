import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigations } from "../../../test/router-mock";
import type { PaletteIdentity } from "../model/palette-sources";
import { CommandPalette } from "./command-palette";

const api = vi.hoisted(() => ({
  company: vi.fn(),
  platform: vi.fn(),
}));

vi.mock("@/shared/api", async (original) => ({
  ...(await original<typeof import("@/shared/api")>()),
  requestCompanyOperation: api.company,
  requestPlatformOperation: api.platform,
}));

const { OperationRefusal } = await import("@/shared/api");

const company: PaletteIdentity = {
  audience: "company",
  userPublicId: "11111111-1111-4111-8111-111111111111",
  permissions: ["users:read"],
};
const platform: PaletteIdentity = {
  audience: "platform",
  userPublicId: "22222222-2222-4222-8222-222222222222",
  permissions: ["platform-users:read", "companies:read", "leads:read"],
};
const pages = [
  { label: "Dashboard", href: "/company/dashboard" },
  { label: "People", href: "/company/people" },
];

function person(index: number) {
  return {
    publicId: `33333333-3333-4333-8333-33333333333${index}`,
    firstName: "Salma",
    lastName: `Adel ${index}`,
    employeeCode: `EMP0${index}`,
    email: `salma${index}@edara.test`,
  };
}

function platformAnswer(operation: { key: string }) {
  if (operation.key.endsWith("/users")) return { items: [person(1)] };
  if (operation.key.endsWith("/companies"))
    return {
      data: [{ publicId: person(2).publicId, name: "Nile Logistics", companyCode: "NILE01" }],
    };
  return {
    items: [
      {
        lead: { publicId: person(3).publicId, companyName: "Delta Foods" },
        contacts: [{ isPrimary: true, name: "Lina", email: "lina@delta.test" }],
      },
    ],
  };
}

function renderPalette(identity: PaletteIdentity) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <CommandPalette identity={identity} pages={pages} />
    </QueryClientProvider>,
  );
}

async function openWithShortcut() {
  await act(async () => {
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  });
  return screen.getByRole("combobox");
}

async function typeSlowly(input: HTMLElement, text: string) {
  for (let length = 1; length <= text.length; length += 1) {
    fireEvent.change(input, { target: { value: text.slice(0, length) } });
    await act(async () => {
      vi.advanceTimersByTime(80);
    });
  }
}

async function settle() {
  await act(async () => {
    vi.advanceTimersByTime(300);
  });
  await act(async () => {
    await vi.runOnlyPendingTimersAsync();
  });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  navigations.length = 0;
  api.company.mockReset().mockResolvedValue({ items: [person(1), person(2)] });
  api.platform.mockReset().mockImplementation(async (operation) => platformAnswer(operation));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("command palette", () => {
  it("sends at most one request per group for a 10-character query", async () => {
    renderPalette(platform);
    const input = await openWithShortcut();

    await typeSlowly(input, "nilelogist");
    await settle();

    expect(api.platform).toHaveBeenCalledTimes(3);
    for (const [, input] of api.platform.mock.calls) expect(input.query.search).toBe("nilelogist");
    expect(api.company).not.toHaveBeenCalled();
  });

  it("asks for at most five results per group", async () => {
    renderPalette(platform);
    const input = await openWithShortcut();

    await typeSlowly(input, "ni");
    await settle();

    const sizes = api.platform.mock.calls.map(
      ([, input]) => input.query.pageSize ?? input.query.limit,
    );
    expect(sizes).toEqual([5, 5, 5]);
  });

  it("never calls the server below two characters or while closed", async () => {
    renderPalette(company);
    await settle();
    const input = await openWithShortcut();

    await typeSlowly(input, "s");
    await settle();

    expect(api.company).not.toHaveBeenCalled();
    expect(screen.getByRole("option", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("skips groups the caller cannot read", async () => {
    renderPalette({ ...platform, permissions: ["leads:read"] });
    const input = await openWithShortcut();

    await typeSlowly(input, "delta");
    await settle();

    expect(api.platform).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("group", { name: "Leads" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Companies" })).not.toBeInTheDocument();
  });

  it("filters pages locally and opens the chosen result by keyboard", async () => {
    renderPalette(company);
    const input = await openWithShortcut();

    await typeSlowly(input, "peop");
    await settle();
    expect(
      within(screen.getByRole("group", { name: "Pages" })).getAllByRole("option"),
    ).toHaveLength(1);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(navigations).toEqual([{ to: "/company/people/33333333-3333-4333-8333-333333333331" }]);
  });

  it("aborts a superseded search when the query changes", async () => {
    const signals: AbortSignal[] = [];
    api.company.mockImplementation(
      (_operation: unknown, _input: unknown, signal: AbortSignal) =>
        new Promise((resolve) => {
          signals.push(signal);
          if (signals.length > 1) resolve({ items: [person(1)] });
        }),
    );
    renderPalette(company);
    const input = await openWithShortcut();

    await typeSlowly(input, "sa");
    await settle();
    await typeSlowly(input, "sal");
    await settle();

    expect(signals).toHaveLength(2);
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
  });

  it("offers a quiet retry when the server rate-limits a group", async () => {
    api.company.mockRejectedValueOnce(
      new OperationRefusal(
        { key: "GET /api/v1/company/users", audience: "company" } as never,
        429,
        null,
      ),
    );
    renderPalette(company);
    const input = await openWithShortcut();

    await typeSlowly(input, "salma");
    await settle();
    expect(screen.getByText("Too many searches. Wait a moment, then retry.")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    });
    await settle();

    expect(api.company).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("option", { name: /Salma Adel 1/ })).toBeInTheDocument();
  });
});
