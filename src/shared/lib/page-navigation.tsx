import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import type { AnchorHTMLAttributes } from "react";
import { useCallback, useMemo } from "react";
import { z } from "zod";
import { type PageDestination, pageDestination } from "./page-destination";

/** Route-independent page state remains validated even while a workflow is not mounted. */
export function usePageSearch<T extends z.ZodTypeAny>(schema: T): z.infer<T> {
  const search = useSearch({ strict: false });
  return useMemo(() => schema.parse(search), [schema, search]);
}

export function usePageNavigate<T extends z.ZodTypeAny>(schema: T) {
  const navigate = useNavigate();
  const search = usePageSearch(schema);
  return useCallback(
    (
      destination: Omit<PageDestination, "search"> & {
        replace?: boolean;
        search?: Partial<z.infer<T>> | ((previous: z.infer<T>) => Partial<z.infer<T>>);
      },
    ) => {
      const nextSearch =
        typeof destination.search === "function" ? destination.search(search) : destination.search;
      return navigate({
        href: pageDestination({ ...destination, search: nextSearch }),
        replace: destination.replace,
      });
    },
    [navigate, search],
  );
}

export function usePageParams() {
  return z.object({ publicId: z.string().min(1) }).parse(useParams({ strict: false }));
}

export function usePageDestination() {
  const navigate = useNavigate();
  return useCallback(
    (destination: PageDestination) => navigate({ href: pageDestination(destination) }),
    [navigate],
  );
}

interface PageLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">,
    PageDestination {}
export function PageLink({ to, params, search, children, ...props }: PageLinkProps) {
  return (
    <a href={pageDestination({ to, params, search })} {...props}>
      {children}
    </a>
  );
}
