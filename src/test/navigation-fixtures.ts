import { z } from "zod";
export function navigationSearch(href: string): Record<string, unknown> {
  return Object.fromEntries(
    [...new URL(href, "https://ui.test").searchParams].map(([key, value]) => {
      try {
        return [key, z.unknown().parse(JSON.parse(value))];
      } catch {
        return [key, value];
      }
    }),
  );
}
