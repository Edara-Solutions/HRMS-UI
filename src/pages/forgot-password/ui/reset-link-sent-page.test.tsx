import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ResetLinkSentPage } from "./reset-link-sent-page";

const navigateMock = vi.hoisted(() => vi.fn());
const searchMock = vi.hoisted(() =>
  vi.fn((): { email: string | undefined } => ({ email: "eve@acme.com" })),
);

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearch: () => searchMock(),
    Link: ({ children }: { children: React.ReactNode }) => <a href="/login">{children}</a>,
  };
});

const advance = (seconds: number) =>
  act(() => {
    vi.advanceTimersByTime(seconds * 1000);
  });

describe("ResetLinkSentPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
    navigateMock.mockClear();
    searchMock.mockReset();
    searchMock.mockReturnValue({ email: "eve@acme.com" });
  });

  it("names the address the link was sent to", () => {
    render(<ResetLinkSentPage />);

    expect(screen.getByText(/eve@acme\.com/)).toBeInTheDocument();
  });

  it("stays put before the twenty seconds are up", () => {
    render(<ResetLinkSentPage />);

    advance(19);

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("returns to sign in after twenty seconds", () => {
    render(<ResetLinkSentPage />);

    advance(20);

    expect(navigateMock).toHaveBeenCalledWith({ to: "/login" });
  });

  it("counts the remaining seconds down so the redirect is never a surprise", () => {
    render(<ResetLinkSentPage />);

    expect(screen.getByText(/20 seconds/i)).toBeInTheDocument();
    advance(5);
    expect(screen.getByText(/15 seconds/i)).toBeInTheDocument();
  });

  it("offers a way back to sign in without waiting", () => {
    render(<ResetLinkSentPage />);

    expect(screen.getByRole("link", { name: /back to sign in/i })).toBeInTheDocument();
  });

  it("does not redirect after the screen is gone", () => {
    const { unmount } = render(<ResetLinkSentPage />);

    unmount();
    advance(30);

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("still reads sensibly when no address was carried over", () => {
    searchMock.mockReturnValue({ email: undefined });

    render(<ResetLinkSentPage />);

    expect(screen.getByRole("heading", { name: /check your email/i })).toBeInTheDocument();
  });
});
