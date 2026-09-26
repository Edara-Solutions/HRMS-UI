import ky from "ky";
import { apiBaseUrl } from "./config";

/** Unmigrated workflows cannot send credentials or requests to retired API paths. */
export const apiClient = ky.create({
  prefixUrl: apiBaseUrl,
  credentials: "omit",
  retry: 0,
  hooks: {
    beforeRequest: [
      () => {
        throw new Error("This workflow is not available in this build.");
      },
    ],
  },
});
