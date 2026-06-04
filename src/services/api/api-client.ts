import { appConfig } from "@/src/config/env";
import { getStoredSession } from "@/src/features/auth/session/session-storage";

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

  return `${appConfig.apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
};

export async function apiRequest<TResponse, TBody = unknown>(
  path: string,
  options: ApiRequestOptions<TBody> = {}
): Promise<TResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), appConfig.requestTimeoutMs);
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (options.requiresAuth) {
    const session = await getStoredSession();

    if (!session) {
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
