export interface PageDestination {
  to?: string;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
}

export function pageDestination({
  to = window.location.pathname,
  params,
  search,
}: PageDestination) {
  let pathname = to;
  for (const [name, value] of Object.entries(params ?? {}))
    pathname = pathname.replace(`$${name}`, encodeURIComponent(value));
  if (
    !pathname.startsWith("/") ||
    pathname.startsWith("//") ||
    /[\\\s]/.test(pathname) ||
    new URL(pathname, window.location.origin).origin !== window.location.origin
  )
    throw new Error("Invalid page destination");
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(search ?? {}))
    if (value !== undefined && value !== null)
      query.set(name, typeof value === "object" ? JSON.stringify(value) : String(value));
  return `${pathname}${query.size ? `?${query}` : ""}`;
}
