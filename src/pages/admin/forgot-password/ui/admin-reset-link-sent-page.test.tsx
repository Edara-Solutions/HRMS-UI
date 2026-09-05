import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminResetLinkSentPage } from "./admin-reset-link-sent-page";

const navigateMock = vi.hoisted(() => vi.fn());
const searchMock = vi.hoisted(() => vi.fn(() => ({ email: "ada@edara.com" })));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearch: () => searchMock(),
    Link: ({ children }: { children: React.ReactNode }) => <a href="/admin/login">{children}</a>,
  };
});

describe("AdminResetLinkSentPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    navigateMock.mockClear();
    searchMock.mockReset();
    searchMock.mockReturnValue({ email: "ada@edara.com" });
  });

  it("returns to the admin sign-in surface after twenty seconds, never the tenant one", () => {
    render(<AdminResetLinkSentPage />);

    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    expect(navigateMock).toHaveBeenCalledWith({ to: "/admin/login" });
  });

  it("names the address and counts the wait down", () => {
    render(<AdminResetLinkSentPage />);

    expect(screen.getByText(/ada@edara\.com/)).toBeInTheDocument();
    expect(screen.getByText(/20 seconds/i)).toBeInTheDocument();
  });
});
