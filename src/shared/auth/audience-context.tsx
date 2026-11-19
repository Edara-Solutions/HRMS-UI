import { createContext, type ReactNode, useContext } from "react";
import type { AudienceName } from "./audience-session";

const AudienceContext = createContext<AudienceName | null>(null);

interface AudienceSessionProviderProps {
  audience: AudienceName;
  children: ReactNode;
}

export function AudienceSessionProvider({ audience, children }: AudienceSessionProviderProps) {
  return <AudienceContext value={audience}>{children}</AudienceContext>;
}

export function useCurrentAudience() {
  return useContext(AudienceContext);
}
