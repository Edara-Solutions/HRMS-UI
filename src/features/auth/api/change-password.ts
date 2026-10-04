import { useMutation } from "@tanstack/react-query";
import {
  companyApiClient,
  executeOperationRequest,
  loadCompanyIdentity,
  loadCompanyPasswordContract,
  loadPlatformIdentity,
  loadPlatformPasswordContract,
  platformApiClient,
} from "@/shared/api";
import type {
  AudienceName,
  ChangePasswordInput,
  CompanySession,
  PlatformSession,
} from "@/shared/auth";
import { useCompanySession, usePlatformSession } from "@/shared/auth";

type UpdatedSession = CompanySession | PlatformSession;

export function useChangePassword(audience: AudienceName) {
  return useMutation({
    retry: false,
    mutationFn: async (input: ChangePasswordInput): Promise<UpdatedSession> => {
      if (audience === "platform") {
        const session = usePlatformSession.getState().session;
        if (!session) throw new Error("No active Platform session");
        return changePlatformPassword(session, input);
      }
      const session = useCompanySession.getState().session;
      if (!session) throw new Error("No active Company session");
      return changeCompanyPassword(session, input);
    },
  });
}

async function changeCompanyPassword(session: CompanySession, input: ChangePasswordInput) {
  const generation = useCompanySession.getState().generation;
  const { operation: companyPassword } = await loadCompanyPasswordContract();
  if (!useCompanySession.getState().isCurrentGeneration(generation))
    throw new Error("Session changed");
  try {
    await executeOperationRequest(
      companyApiClient,
      companyPassword,
      { body: input },
      { accessToken: session.accessToken },
    );
  } finally {
    if (useCompanySession.getState().isCurrentGeneration(generation))
      await useCompanySession.getState().revalidate(loadCompanyIdentity);
  }
  if (!useCompanySession.getState().isCurrentGeneration(generation))
    throw new Error("Session changed");
  const current = useCompanySession.getState();
  if (!current.isCurrentGeneration(generation) || !current.session)
    throw new Error("Session changed");
  return current.session;
}

async function changePlatformPassword(session: PlatformSession, input: ChangePasswordInput) {
  const generation = usePlatformSession.getState().generation;
  const { operation: platformPassword } = await loadPlatformPasswordContract();
  if (!usePlatformSession.getState().isCurrentGeneration(generation))
    throw new Error("Session changed");
  try {
    await executeOperationRequest(
      platformApiClient,
      platformPassword,
      { body: input },
      { accessToken: session.accessToken },
    );
  } finally {
    if (usePlatformSession.getState().isCurrentGeneration(generation))
      await usePlatformSession.getState().revalidate(loadPlatformIdentity);
  }
  if (!usePlatformSession.getState().isCurrentGeneration(generation))
    throw new Error("Session changed");
  const current = usePlatformSession.getState();
  if (!current.isCurrentGeneration(generation) || !current.session)
    throw new Error("Session changed");
  return current.session;
}
