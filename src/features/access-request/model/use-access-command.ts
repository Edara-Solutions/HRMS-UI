import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  classifyMutationFailure,
  type MutationOutcome,
  usePlatformAccess,
  usePlatformMutationRecovery,
} from "@/shared/api";
import { type AccessCommand, accessQueryRoots, sendAccessCommand } from "../api/access-requests";

export function useAccessCommand() {
  const access = usePlatformAccess();
  const queryClient = useQueryClient();
  const recover = usePlatformMutationRecovery();
  const userPublicId = access.user?.publicId ?? "";
  const mutation = useMutation({
    mutationFn: (command: AccessCommand) => sendAccessCommand(command),
    retry: false,
    onError: (error) => void recover(error),
    onSettled: () =>
      Promise.all(
        accessQueryRoots(userPublicId).map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });
  const failure: MutationOutcome["kind"] | null = mutation.error
    ? classifyMutationFailure(mutation.error).kind
    : null;
  return {
    run: mutation.mutate,
    pending: mutation.isPending,
    failure,
    reset: mutation.reset,
  };
}
