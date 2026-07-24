import { appConfig } from "@/src/config/env";
import {
  refresh,
  toAppSession,
} from "@/src/features/auth/api/auth-client";
import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
} from "@/src/features/auth/session/session-storage";
import { useSessionStore } from "@/src/features/auth/session/session-store";

import { ApiError } from "./api-errors";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiRequestOptions<TBody> {
  body?: TBody;
  headers?: Record<string, string>;
  method?: HttpMethod;
  requiresAuth?: boolean;
}

const buildUrl = (path: string) => {
  if (path.startsWith("http")) {
    return path;
  }

  return `${appConfig.backendUrl}${path.startsWith("/") ? path : `/${path}`}`;
};

/** Single-flight refresh so concurrent 401s share one token rotation. */
let refreshInFlight: Promise<void> | null = null;

async function forceSignOut(): Promise<void> {
  await clearStoredSession();
  useSessionStore.getState().setSession(null);
  useSessionStore.getState().setStatus("anonymous");
}

async function rotateSessionOrSignOut(): Promise<void> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const session = await getStoredSession();
    const refreshToken = session?.tokens?.refreshToken;

    if (!refreshToken) {
      await forceSignOut();
      throw new ApiError("Session expired", 401);
    }

    try {
      const result = await refresh(refreshToken);
      const nextSession = toAppSession(result);
      await setStoredSession(nextSession);
      useSessionStore.getState().setSession(nextSession);
    } catch {
      // Refresh failure includes reuse-detection (all sessions revoked server-side).
      await forceSignOut();
      throw new ApiError("Session expired", 401);
    }
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

export async function apiRequest<TResponse, TBody = unknown>(
  path: string,
  options: ApiRequestOptions<TBody> = {}
): Promise<TResponse> {
  return executeApiRequest(path, options, false);
}

async function executeApiRequest<TResponse, TBody>(
  path: string,
  options: ApiRequestOptions<TBody>,
  isRetry: boolean
): Promise<TResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    appConfig.requestTimeoutMs
  );
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (options.requiresAuth) {
    const session = await getStoredSession();

    if (!session || !session.tokens) {
      clearTimeout(timeout);
      throw new ApiError("Authentication required", 401);
    }

    headers.Authorization = `Bearer ${session.tokens.accessToken}`;
  }

  try {
    const response = await fetch(buildUrl(path), {
      body: options.body ? JSON.stringify(options.body) : undefined,
      headers,
      method: options.method ?? "GET",
      signal: controller.signal,
    });
    const requestId = response.headers.get("x-request-id") ?? undefined;

    if (!response.ok) {
      if (
        response.status === 401 &&
        options.requiresAuth === true &&
        !isRetry
      ) {
        await rotateSessionOrSignOut();
        return executeApiRequest(path, options, true);
      }

      throw new ApiError("Request failed", response.status, requestId);
    }

    if (response.status === 204) {
      return undefined as TResponse;
    }

    return (await response.json()) as TResponse;
  } finally {
    clearTimeout(timeout);
  }
}
