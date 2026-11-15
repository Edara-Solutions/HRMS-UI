import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { i18next } from "@/shared/i18n";
import { CredentialFrame } from "./credential-frame";

vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

afterEach(async () => {
  cleanup();
  await i18next.changeLanguage("en");
});

function renderFrame(audience: "company" | "platform") {
  return render(
    <CredentialFrame
      audience={audience}
      title="Sign in"
      description="Enter your credentials to continue to this portal."
      links={[{ to: "/company/forgot-password", label: "Forgot password?" }]}
    >
      <p>form</p>
    </CredentialFrame>,
  );
}

describe("CredentialFrame", () => {
  it("presents the Company brand, the portal and one page heading", () => {
    renderFrame("company");
    const banner = screen.getByRole("banner");
    expect(within(banner).getByText("Edara")).toBeInTheDocument();
    expect(within(banner).getByText("People Operations Platform")).toBeInTheDocument();
    expect(screen.getByText("Company Portal")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("form");
  });

  it("names the Platform as the operations console", () => {
    renderFrame("platform");
    expect(within(screen.getByRole("banner")).getByText("Operations Console")).toBeInTheDocument();
    expect(screen.getByText("Platform Portal")).toBeInTheDocument();
  });

  it("offers language and theme before sign-in", () => {
    renderFrame("company");
    const banner = screen.getByRole("banner");
    expect(within(banner).getAllByRole("button").length).toBeGreaterThanOrEqual(2);
  });

  it("closes with the sign-in links and a quiet security footer", () => {
    renderFrame("company");
    expect(screen.getByRole("navigation", { name: "Sign-in options" })).toHaveTextContent(
      "Forgot password?",
    );
    expect(screen.getByRole("contentinfo")).toHaveTextContent("Encrypted, secure sign-in");
  });

  it("renders in Arabic without breaking letter joining", async () => {
    await i18next.changeLanguage("ar");
    renderFrame("company");
    expect(screen.getByText("منصة عمليات الأفراد")).toBeInTheDocument();
  });
});
