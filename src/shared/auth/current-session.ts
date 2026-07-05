import { useAuthStore } from "./auth-store";

export function useCurrentSession() {
  return useAuthStore((state) => state.session);
}
