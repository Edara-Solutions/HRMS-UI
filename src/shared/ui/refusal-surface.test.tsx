import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RefusalSurface } from "./refusal-surface";

describe("bounded refusal presentation", () => {
  it.each([
    "en",
    "ar",
  ] as const)("keeps distinct refusal meanings and safe recovery in %s", (locale) => {
    const headings = new Set<string>();
    for (const kind of [
      "not-found",
      "forbidden",
      "company-blocked",
      "access-session-inactive",
      "no-work-access",
    ] as const) {
      const view = render(
        <RefusalSurface
          kind={kind}
          locale={locale}
          destination="/company/me/profile"
          recoveryLabel="Recovery"
        />,
      );
      headings.add(screen.getByRole("heading").textContent ?? "");
      expect(screen.getByRole("link", { name: "Recovery" })).toHaveAttribute(
        "href",
        "/company/me/profile",
      );
      expect(view.container.textContent).not.toMatch(
        /traceId|publicId|platform_admin|stack|internal-secret/,
      );
      view.unmount();
    }
    expect(headings.size).toBe(5);
  });
});
