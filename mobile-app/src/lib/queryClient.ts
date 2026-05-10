import { QueryClient, QueryFunction } from "@tanstack/react-query";
import * as SecureStore from "./storage";

// Backend API URL — set EXPO_PUBLIC_API_URL in your .env for local dev,
// or in EAS build env for production (e.g. your Railway deployment URL).
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://dooodhwala.up.railway.app";

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

export async function apiRequest(params: {
    url: string;
    method: string;
    body?: unknown;
}): Promise<Response> {
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
