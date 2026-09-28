import type { AudienceName } from "./audience-session";

interface CredentialContext {
  newEmail?: string;
  passwordAttempted?: boolean;
}

// Safe operation context survives quarantine; passwords and tokens never enter this ledger.
const contexts = new Map<string, CredentialContext>();

export function readCredentialContext(audience: AudienceName, generation: string) {
  return contexts.get(`${audience}:${generation}`);
}

export function retainCredentialContext(
  audience: AudienceName,
  generation: string,
  context: CredentialContext,
) {
  contexts.set(`${audience}:${generation}`, {
    ...readCredentialContext(audience, generation),
    ...context,
  });
}

export function clearCredentialContext(audience: AudienceName) {
  for (const key of contexts.keys()) {
    if (key.startsWith(`${audience}:`)) contexts.delete(key);
  }
}
