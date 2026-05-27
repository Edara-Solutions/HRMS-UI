export type AppError =
  | { kind: "validation"; message: string; status: 400 | 422; fieldErrors?: Record<string, string> }
  | { kind: "unauthorized"; message: string; status: 401 }
  | { kind: "forbidden"; message: string; status: 403 }
  | { kind: "not_found"; message: string; status: 404 }
  | { kind: "conflict"; message: string; status: 409 }
  | { kind: "rate_limited"; message: string; status: 429 }
  | { kind: "server"; message: string; status: 500 }
  | { kind: "unknown"; message: string; status: number };

export function mapHttpStatusToAppError(
  status: number,
  message = "Something went wrong",
): AppError {
  if (status === 400 || status === 422) {
    return { kind: "validation", message, status };
  }

  if (status === 401) {
    return { kind: "unauthorized", message, status };
  }

  if (status === 403) {
    return { kind: "forbidden", message, status };
  }

  if (status === 404) {
    return { kind: "not_found", message, status };
  }

  if (status === 409) {
    return { kind: "conflict", message, status };
  }

  if (status === 429) {
    return { kind: "rate_limited", message, status };
  }

  if (status >= 500) {
    return { kind: "server", message, status: 500 };
  }

  return { kind: "unknown", message, status };
}
