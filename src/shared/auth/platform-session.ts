import type { SuccessResponse as PlatformMeUser } from "@/shared/api/generated/platform/get-api-v1-platform-me";
import { responseSchemas as meSchemas } from "@/shared/api/generated/platform/get-api-v1-platform-me";
import { responseSchemas as tokenSchemas } from "@/shared/api/generated/platform/post-api-v1-platform-auth-login";
import { platformQueryClient } from "@/shared/api/platform-query-client";
import { type AudienceSession, createAudienceSessionStore } from "./audience-session";
import { clearCredentialContext } from "./credential-context";

export type PlatformUser = PlatformMeUser;
export type PlatformSession = AudienceSession<PlatformUser>;

export const usePlatformSession = createAudienceSessionStore<PlatformUser>(
  "platform",
  "hrms-platform-session:v1",
  tokenSchemas["200"].extend({
    user: meSchemas["200"],
  }),
  () => {
    platformQueryClient.clear();
    clearCredentialContext("platform");
  },
);
