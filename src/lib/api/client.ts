/**
 * Unified API Client for Addis Photography Studio
 * Implements:
 * 1. Automatic 'X-Requested-With: studio' on non-GET requests (CSRF protection)
 * 2. Automatic credentials inclusion (session cookies 'sid')
 * 3. SSR cookie propagation support
 */

interface RequestOptions extends RequestInit {
  cookie?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export async function studioFetch<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});

  // Add CSRF custom header on all non-GET requests
  if (method !== "GET" && method !== "HEAD") {
    headers.set("X-Requested-With", "studio");
    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
  }

  // Forward session cookies if provided (SSR calls)
  if (options.cookie) {
    headers.set("Cookie", options.cookie);
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: options.credentials || "include",
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error = new Error(
      errorBody.message || errorBody.detail || `Request failed with status ${response.status}`
    );
    (error as any).status = response.status;
    (error as any).data = errorBody;
    throw error;
  }

  return response.json();
}

export const api = {
  get: <T = any>(url: string, options?: RequestOptions) =>
    studioFetch<T>(url, { ...options, method: "GET" }),

  post: <T = any>(url: string, data?: any, options?: RequestOptions) =>
    studioFetch<T>(url, {
      ...options,
      method: "POST",
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),

  put: <T = any>(url: string, data?: any, options?: RequestOptions) =>
    studioFetch<T>(url, {
      ...options,
      method: "PUT",
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),

  patch: <T = any>(url: string, data?: any, options?: RequestOptions) =>
    studioFetch<T>(url, {
      ...options,
      method: "PATCH",
      body: data instanceof FormData ? data : JSON.stringify(data),
    }),

  delete: <T = any>(url: string, options?: RequestOptions) =>
    studioFetch<T>(url, { ...options, method: "DELETE" }),
};
