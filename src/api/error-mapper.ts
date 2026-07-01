import { HTTPError } from "ky";

// ─── Login error mapping (auth-int-07) ───────────────────────────────────────
//
// The backend returns one *generic* message ("Invalid credentials") for
// credential mismatch (unknown company/employee, wrong password) — collapsed
// to the same generic 422 once an IP crosses the soft throttle limit, even for
// the account-state reasons below. Below that limit, account-state failures
// (locked, disabled/terminated/suspended, expired invitation/temp password)
// carry distinct, actionable messages that we surface as-is: the backend copy
// already tells the user what to do next.

export type LoginErrorKind = "credential_mismatch" | "account_state" | "rate_limited" | "system";

export type LoginError = { kind: LoginErrorKind; message: string };

const GENERIC_CREDENTIALS_MESSAGE = "Invalid company code, employee code, or password.";
const RATE_LIMITED_MESSAGE = "Too many attempts. Please wait a moment and try again.";
const SYSTEM_MESSAGE = "Something went wrong. Please try again.";
const BACKEND_GENERIC_MESSAGE = "Invalid credentials";

export async function readBackendErrorMessage(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    return body !== null &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "string"
      ? body.error
      : null;
  } catch {
    return null;
  }
}

/**
 * Maps a login/admin-login failure to the message the user should see.
 * Distinct account-state messages are passed through verbatim — they are
 * already actionable below the throttle line; everything else collapses to
 * one of the three fixed, enumeration-safe messages.
 *
 * `credentialMismatchMessage` lets each login form phrase the generic
 * mismatch copy in terms of the fields it actually collects (company/employee
 * code vs. email) without changing the enumeration-safe meaning.
 */
export async function mapLoginError(
  error: unknown,
  { credentialMismatchMessage = GENERIC_CREDENTIALS_MESSAGE } = {},
): Promise<LoginError> {
  if (!(error instanceof HTTPError)) {
    return { kind: "system", message: SYSTEM_MESSAGE };
  }

  const { status } = error.response;

  if (status === 429) {
    return { kind: "rate_limited", message: RATE_LIMITED_MESSAGE };
  }

  if (status === 401 || status === 403 || status === 422) {
    const backendMessage = await readBackendErrorMessage(error.response);

    if (backendMessage && backendMessage !== BACKEND_GENERIC_MESSAGE) {
      return { kind: "account_state", message: backendMessage };
    }

    return { kind: "credential_mismatch", message: credentialMismatchMessage };
  }

  return { kind: "system", message: SYSTEM_MESSAGE };
}

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
