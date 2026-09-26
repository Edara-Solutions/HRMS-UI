import ky, { HTTPError, type KyInstance } from "ky";
import type { AudienceTokens as LoginTokens } from "../auth/audience-session";
import { apiBaseUrl } from "./config";
import { ContractViolation } from "./generated/runtime";
import { OperationRefusal } from "./operation-request";
import { type ResponseContract, readOperationResponse } from "./operation-response";

export interface AudienceClientOptions {
  audience: "company" | "platform";
  getAccessToken: () => string | undefined;
  refresh: (refreshToken: string) => Promise<LoginTokens>;
  getRefreshToken: () => string | undefined;
  getSessionGeneration: () => string;
  updateTokens: (tokens: LoginTokens) => void;
  clearSession: () => void;
  markUnavailable?: () => void;
  validateRefreshedIdentity?: () => Promise<void>;
  canReplayProtectedRead?: () => boolean;
}

export interface AudienceClient extends KyInstance {
  readonly audience: AudienceClientOptions["audience"];
}

const apiOrigin = apiBaseUrl.replace(/\/api\/v1\/?$/, "");
const retryHeader = "X-Edara-Audience-Retry";

export function createAudienceClient(options: AudienceClientOptions): AudienceClient {
  const getGeneration = options.getSessionGeneration;
  const requestSessions = new WeakMap<
    object,
    { accessToken: string; refreshToken: string; generation: string | undefined }
  >();
  let rotation:
    | { refreshToken: string; generation: string | undefined; promise: Promise<LoginTokens> }
    | undefined;
  const client = ky.create({
    prefixUrl: apiOrigin,
    credentials: "omit",
    redirect: "error",
    retry: 0,
    hooks: {
      beforeRequest: [
        (request, requestOptions) => {
          const pathname = new URL(request.url).pathname;
          if (!pathname.startsWith(`/api/v1/${options.audience}/`)) {
            throw new Error("Request audience mismatch");
          }
          if (isAuthPath(request.url)) return;
          if (!request.headers.has("Authorization")) {
            const token = options.getAccessToken();
            if (token) request.headers.set("Authorization", `Bearer ${token}`);
          }
          const accessToken = options.getAccessToken();
          const refreshToken = options.getRefreshToken();
          if (
            accessToken &&
            refreshToken &&
            request.headers.get("Authorization") === `Bearer ${accessToken}`
          ) {
            requestSessions.set(requestOptions.context, {
              accessToken,
              refreshToken,
              generation: getGeneration(),
            });
          }
        },
      ],
      afterResponse: [
        async (request, requestOptions, response) => {
          const snapshot = requestSessions.get(requestOptions.context);
          const contract = responseContract(requestOptions.context.operation);
          if (response.status === 401 && contract) {
            await readOperationResponse(contract, response.clone());
          }
          if (
            response.status === 401 &&
            contract &&
            snapshot &&
            (!["GET", "HEAD"].includes(request.method) ||
              requestOptions.context.skipRefresh === true) &&
            getGeneration() === snapshot.generation &&
            options.getAccessToken() === snapshot.accessToken
          ) {
            options.clearSession();
            return response;
          }
          if (
            response.status !== 401 ||
            requestOptions.context.skipRefresh === true ||
            request.headers.has(retryHeader) ||
            isAuthPath(request.url) ||
            !["GET", "HEAD"].includes(request.method)
          ) {
            return response;
          }

          if (!snapshot) return response;
          if (getGeneration() !== snapshot.generation) return response;
          const { refreshToken } = snapshot;

          try {
            if (
              rotation?.refreshToken !== refreshToken ||
              rotation.generation !== snapshot.generation
            ) {
              if (
                options.getRefreshToken() !== refreshToken ||
                options.getAccessToken() !== snapshot.accessToken
              )
                return response;
              rotation = {
                refreshToken,
                generation: snapshot.generation,
                promise: options.refresh(refreshToken).then(async (tokens) => {
                  if (
                    getGeneration() === snapshot.generation &&
                    options.getRefreshToken() === refreshToken &&
                    options.getAccessToken() === snapshot.accessToken
                  ) {
                    options.updateTokens(tokens);
                    if (
                      getGeneration() === snapshot.generation &&
                      options.getAccessToken() === tokens.accessToken
                    )
                      await options.validateRefreshedIdentity?.();
                  }
                  return tokens;
                }),
              };
            }
            const tokens = await rotation.promise;
            if (
              getGeneration() !== snapshot.generation ||
              options.getRefreshToken() !== tokens.refreshToken ||
              options.getAccessToken() !== tokens.accessToken
            )
              return response;
            if (
              (tokens.mustChangePassword || options.canReplayProtectedRead?.() === false) &&
              !new URL(request.url).pathname.endsWith(`/${options.audience}/me`)
            )
              return response;
            const retryRequest = request.clone();
            retryRequest.headers.set("Authorization", `Bearer ${tokens.accessToken}`);
            retryRequest.headers.set(retryHeader, "true");
            const replay = await ky(retryRequest, { ...requestOptions, throwHttpErrors: false });
            if (replay.status === 401 && contract)
              await readOperationResponse(contract, replay.clone());
            if (
              replay.status === 401 &&
              getGeneration() === snapshot.generation &&
              options.getAccessToken() === tokens.accessToken
            ) {
              options.clearSession();
            }
            return replay;
          } catch (error) {
            if (rotation?.refreshToken === refreshToken) rotation = undefined;
            if (
              ((error instanceof HTTPError && error.response.status === 401) ||
                (error instanceof OperationRefusal && error.status === 401)) &&
              getGeneration() === snapshot.generation &&
              options.getRefreshToken() === refreshToken
            ) {
              options.clearSession();
              return response;
            }
            if (!(error instanceof ContractViolation) && getGeneration() === snapshot.generation)
              options.markUnavailable?.();
            throw error;
          }
        },
      ],
    },
  });

  return Object.assign(client, { audience: options.audience });
}

function isAuthPath(url: string): boolean {
  return /^\/api\/v1\/(company|platform)\/auth\/(login|refresh|accept-invitation|password-reset\/(request|confirm))$/.test(
    new URL(url).pathname,
  );
}

function responseContract(candidate: unknown): ResponseContract | undefined {
  if (
    typeof candidate !== "object" ||
    candidate === null ||
    !("audience" in candidate) ||
    !("key" in candidate) ||
    !("parseResponse" in candidate)
  )
    return;
  const { audience, key, parseResponse } = candidate;
  if (
    typeof key !== "string" ||
    typeof parseResponse !== "function" ||
    (audience !== "company" && audience !== "platform")
  )
    return;
  return {
    audience,
    key,
    parseResponse: (status, body, hasBody) => parseResponse(status, body, hasBody),
  };
}
