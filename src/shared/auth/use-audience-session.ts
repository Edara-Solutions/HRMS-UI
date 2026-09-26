import { useSyncExternalStore } from "react";
import type { AudienceName } from "./audience-session";
import { useCompanySession } from "./company-session";
import { usePlatformSession } from "./platform-session";

/** Subscribe to one explicit audience; unrelated portal changes do not notify this consumer. */
export function useAudienceSession(audience: AudienceName) {
  const source = audience === "company" ? useCompanySession : usePlatformSession;
  return useSyncExternalStore(
    (listener) => source.subscribe(listener),
    () => source.getState(),
    () => source.getInitialState(),
  );
}
