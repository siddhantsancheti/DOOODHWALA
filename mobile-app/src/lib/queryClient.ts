import { QueryClient, QueryFunction } from "@tanstack/react-query";
import * as SecureStore from "./storage";

// Backend API URL — dynamically fetched from Supabase on startup so it
// never needs a rebuild when the tunnel URL changes.
// Falls back to the build-time env var if Supabase fetch fails.
export let API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? "https://dooodhwala.up.railway.app";

export async function refreshApiBaseUrl(): Promise<void> {
  try {
    const supabaseUrl = 'https://shwofnrufpfmgptrqexc.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNod29mbnJ1ZnBmbWdwdHJxZXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MDAwMTMsImV4cCI6MjA5MjQ3NjAxM30.GnLyzcR-YzkINqnZioexJ4cv20aChmDWbPvUwlDauH8';
    const res = await fetch(
      `${supabaseUrl}/rest/v1/app_config?key=eq.api_url&select=value`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.[0]?.value) {
        API_BASE_URL = data[0].value;
        console.log('[Config] API URL loaded from Supabase:', API_BASE_URL);
      }
    }
  } catch (e) {
    console.warn('[Config] Could not fetch API URL from Supabase, using default:', API_BASE_URL);
  }
}

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
            if (res.status === 404 && text.includes('Cannot')) {
                throw new Error(`API not available: ${text}`);
            }
            throw new Error(`${res.status}: ${text}`);
        } catch (err: any) {
            if (err.message && !err.message.startsWith(res.status.toString()) && err.message !== "API not available") {
                throw err;
            }
            throw new Error(`${res.status}: ${res.statusText}`);
        }
    }
}

// Refresh URL at most once every 5 minutes to avoid hammering Supabase
let lastUrlRefresh = 0;
async function maybeRefreshUrl() {
    const now = Date.now();
    if (now - lastUrlRefresh > 5 * 60 * 1000) {
        lastUrlRefresh = now;
        await refreshApiBaseUrl();
    }
}

export async function apiRequest(params: {
    url: string;
    method: string;
    body?: unknown;
}): Promise<Response> {
    await maybeRefreshUrl();

    let url = params.url;
    let requestMethod = params.method;
    let body = params.body;

    let token: string | null = null;
    try {
        token = await SecureStore.getItemAsync("token");
        if (!token) {
            token = await SecureStore.getItemAsync("accessToken");
        }
    } catch (e) {
        console.warn("Could not retrieve token from SecureStore", e);
    }

    const headers: Record<string, string> = {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    };

    const normalizedUrl = url.startsWith('/api') ? url.substring(4) : url;
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${normalizedUrl}`;

    let res: Response;
    try {
        res = await fetch(fullUrl, {
            method: requestMethod,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
    } catch (error: any) {
        if (error.message && (error.message.includes('Network request failed') || error.message.includes('Failed to fetch'))) {
            throw new Error("Unable to connect. Please check your internet connection.");
        }
        throw error;
    }

    await throwIfResNotOk(res);
    return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
    on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
    ({ on401: unauthorizedBehavior }) =>
        async ({ queryKey }) => {
            let token: string | null = null;
            try {
                token = await SecureStore.getItemAsync("token");
                if (!token) {
                    token = await SecureStore.getItemAsync("accessToken");
                }
            } catch (e) {
                console.warn("Could not retrieve token from SecureStore for Query", e);
            }

            const headers: Record<string, string> = {
                ...(token ? { "Authorization": `Bearer ${token}` } : {}),
            };

            const url = queryKey[0] as string;
            const normalizedUrl = url.startsWith('/api') ? url.substring(4) : url;
            const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${normalizedUrl}`;

            let res: Response;
            try {
                res = await fetch(fullUrl, {
                    headers,
                });
            } catch (error: any) {
                if (error.message && (error.message.includes('Network request failed') || error.message.includes('Failed to fetch'))) {
                    throw new Error("Unable to connect. Please check your internet connection.");
                }
                throw error;
            }

            if (unauthorizedBehavior === "returnNull" && res.status === 401) {
                return null;
            }

            if (unauthorizedBehavior === "returnNull" && res.status === 404 && url.includes('/auth/')) {
                return null;
            }

            await throwIfResNotOk(res);
            return await res.json();
        };

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            queryFn: getQueryFn({ on401: "throw" }),
            retry: false,
        },
        mutations: {
            retry: false,
        },
    },
});
