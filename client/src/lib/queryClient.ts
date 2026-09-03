import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Backend API URL - empty string means same domain (Vite proxy handles it in dev), but for mobile/production build we might need full URL
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const json = await res.json();
        if (json.message) {
          const error = new Error(json.message) as Error & { body: any };
          error.body = json;
          throw error;
        }
      }

      const text = (await res.text()) || res.statusText;
      // Handle common production deployment issues
      if (res.status === 404 && text.includes('Cannot')) {
        throw new Error(`API not available: ${text}`);
      }
      throw new Error(`${res.status}: ${text}`);
    } catch (err: any) {
      // If the error we just threw is valid, rethrow it
      if (err.message && !err.message.startsWith(res.status.toString()) && err.message !== "API not available") {
        throw err;
      }
      // If we can't read response text or it failed, throw generic error
      throw new Error(`${res.status}: ${res.statusText}`);
    }
  }
}


/**
 * The admin device key for this browser.
 *
 * Admin access needs two things: the admin phone number, and a machine that was
 * deliberately registered. Register one by opening the dashboard once with the
 * key in the URL — /admin-dashboard?device=THEKEY — after which it is kept in
 * this browser and sent on every admin call. The URL is cleaned up immediately
 * so the key does not sit in history or get pasted to someone else.
 */
/**
 * Claim the admin device key from the URL at startup.
 *
 * Reading it lazily on the first admin request was circular: the parameter was
 * only consumed when an admin call happened, but an admin call cannot succeed
 * without the key — and by then the app had navigated and the parameter was
 * gone. Registering a laptop was impossible.
 */
export function captureAdminDeviceKey(): void {
  adminDeviceKey();
}

export function adminDeviceKey(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("device");
    if (fromUrl) {
      localStorage.setItem("adminDeviceKey", fromUrl);
      params.delete("device");
      const clean = window.location.pathname + (params.toString() ? `?${params}` : "");
      window.history.replaceState({}, "", clean);
      return fromUrl;
    }
    return localStorage.getItem("adminDeviceKey");
  } catch {
    // Private mode or storage disabled — admin simply will not unlock here.
    return null;
  }
}

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<Response>;
export async function apiRequest(params: {
  url: string;
  method: string;
  body?: unknown;
}): Promise<Response>;
export async function apiRequest(
  urlOrParams: string | { url: string; method: string; body?: unknown },
  method?: string,
  data?: unknown | undefined,
): Promise<Response> {
  let url: string;
  let requestMethod: string;
  let body: unknown;

  if (typeof urlOrParams === 'string') {
    url = urlOrParams;
    requestMethod = method!;
    body = data;
  } else {
    url = urlOrParams.url;
    requestMethod = urlOrParams.method;
    body = urlOrParams.body;
  }

  // Get JWT token from localStorage - try both token keys for compatibility
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');

  if (token) {
    try {
      // Decode and show token info for debugging
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('apiRequest - token found, user:', payload.username || payload.userId, 'expires:', new Date(payload.exp * 1000).toLocaleString());
    } catch (e) {
      console.log('apiRequest - token present but invalid format');
    }
  } else {
    console.log('apiRequest - no token found in localStorage');
  }

  const deviceKey = url.includes("/api/admin") ? adminDeviceKey() : null;

  const headers: Record<string, string> = {
    ...(body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...(deviceKey ? { "x-admin-device": deviceKey } : {}),
  };

  // Prepend API_BASE_URL if the URL doesn't start with http
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  const res = await fetch(fullUrl, {
    method: requestMethod,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
    mode: "cors",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      // Get JWT token from localStorage - try both token keys for compatibility
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');

      // Prepend API_BASE_URL if the URL doesn't start with http
      const url = queryKey[0] as string;
      const deviceKey = url.includes("/api/admin") ? adminDeviceKey() : null;

      const headers: Record<string, string> = {
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        ...(deviceKey ? { "x-admin-device": deviceKey } : {}),
      };

      const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

      const res = await fetch(fullUrl, {
        headers,
        credentials: "include",
        mode: "cors",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      // Handle API unavailability for auth endpoints only (not all endpoints)
      if (unauthorizedBehavior === "returnNull" && res.status === 404 && url.includes('/auth/')) {
        console.log('Auth endpoint not available, returning null for auth check');
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

export { API_BASE_URL };
