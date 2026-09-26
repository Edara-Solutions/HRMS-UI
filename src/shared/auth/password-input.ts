import type { Request } from "../api/generated/company/post-api-v1-company-me-password";
import type { Request as PlatformRequest } from "../api/generated/platform/post-api-v1-platform-me-password";

export type ChangePasswordInput = Request["body"] | PlatformRequest["body"];
