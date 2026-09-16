import { QueryClient, QueryFunction } from "@tanstack/react-query";
import * as SecureStore from "./storage";

// Backend API URL — dynamically fetched from Supabase on startup so it
// never needs a rebuild when the tunnel URL changes.
// Falls back to the build-time env var if Supabase fetch fails.
export let API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL ?? "https://dooodhwala.duckdns.org";

export async function refreshApiBaseUrl(): Promise<void> {
  try {
    const supabaseUrl = 'https://shwofnrufpfmgptrqexc.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNod29mbnJ1ZnBmbWdwdHJxZXhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MDAwMTMsImV4cCI6MjA5MjQ3NjAxM30.GnLyzcR-YzkINqnZioexJ4cv20aChmDWbPvUwlDauH8';
    // Both keys in one request. app_config is already the channel that lets the
    // server move without an app release; the minimum version rides along on
    // the same fetch rather than costing a second round trip at startup.
    const res = await fetch(
      `${supabaseUrl}/rest/v1/app_config?key=in.(api_url,min_version_code)&select=key,value`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    if (res.ok) {
      const rows: { key: string; value: string }[] = await res.json();
      const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));

      if (byKey.api_url) {
        API_BASE_URL = byKey.api_url;
        console.log('[Config] API URL loaded from Supabase:', API_BASE_URL);
      }

      const min = parseInt(byKey.min_version_code ?? '', 10);
      if (Number.isFinite(min) && min > 0) {
        MIN_VERSION_CODE = min;
        console.log('[Config] Minimum version code:', MIN_VERSION_CODE);
      }
    }
  } catch (e) {
    console.warn('[Config] Could not fetch config from Supabase, using default:', API_BASE_URL);
  }
}

/**
 * The oldest build allowed to run, or null if no floor has been published.
 *
 * Null is the safe answer and the default: the gate this feeds must fail open.
 * A phone with no signal, or a Supabase outage, must not be told to go to the
 * Play Store — that would take the whole user base offline over a network blip,
 * and a dairyman mid-round cannot stop to update anything.
 */
let MIN_VERSION_CODE: number | null = null;
export function getMinVersionCode(): number | null {
  return MIN_VERSION_CODE;
}

// Build a full request URL from an app-relative path.
// The backend serves every route under `/api`, and all frontend paths/query
// keys are written with the `/api` prefix. This joins them to API_BASE_URL
// without dropping the prefix, and tolerates a base URL that already ends
// with `/api` (collapsing the duplicate) so it works no matter how the
// Supabase-provided or env-provided base URL is formatted.
export function buildApiUrl(url: string): string {
    if (url.startsWith('http')) return url;
    const base = API_BASE_URL.replace(/\/+$/, '');
    let path = url.startsWith('/') ? url : `/${url}`;
    if (base.endsWith('/api') && path.startsWith('/api/')) {
        path = path.substring(4);
    }
    return `${base}${path}`;
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

// Refresh URL at most once every 5 minutes to avoid hammering Supabase.
//
// Exported because the auth calls in lib/api.ts use fetch() directly rather
// than apiRequest, and without awaiting this they send the very first request
// of the session — the OTP — to the stale build-time fallback instead of the
// address configured in Supabase. That is invisible until you move hosts, and
// then it looks like the new server is down.
let lastUrlRefresh = 0;
export async function ensureApiBaseUrl() {
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
    await ensureApiBaseUrl();

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

    const fullUrl = buildApiUrl(url);

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
            const fullUrl = buildApiUrl(url);

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
