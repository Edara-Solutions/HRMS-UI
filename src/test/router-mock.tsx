import type { ReactNode } from "react";
import { vi } from "vitest";

/** Navigations the page asked for, in order; each test starts from an empty list. */
export const navigations: unknown[] = [];

interface LinkProps {
  children: ReactNode;
  to: string;
  params?: Record<string, string>;
  className?: string;
}

// Importing this module renders links as plain anchors and records programmatic navigation.
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  Link: ({ children, to, params, className }: LinkProps) => (
    <a
      href={Object.entries(params ?? {}).reduce(
        (path, [key, value]) => path.replace(`$${key}`, value),
        to,
      )}
      className={className}
    >
      {children}
    </a>
  ),
  useNavigate: () => async (options: unknown) => {
    navigations.push(options);
  },
}));
