import { API_BASE_URL } from "./queryClient";
import * as SecureStore from "./storage";

export interface APIResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export class AuthAPI {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
        let token = await SecureStore.getItemAsync('accessToken');
        if (!token) {
            token = await SecureStore.getItemAsync('token');
        }

        const headers = new Headers(options.headers || {});
        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }

        if (options.body && typeof options.body === 'string' && !headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }

        if (!headers.has("Accept")) {
            headers.set("Accept", "application/json");
        }

        const config: RequestInit = {
            ...options,
            headers,
        };

        const normalizedEndpoint = endpoint.startsWith('/api') ? endpoint.substring(4) : endpoint;

        try {
            return await fetch(`${this.baseUrl}${normalizedEndpoint}`, config);
        } catch (error: any) {
            if (error.message && (error.message.includes('Network request failed') || error.message.includes('Failed to fetch'))) {
                throw new Error("Unable to connect. Please check your internet connection.");
            }
            throw error;
        }
    }

    async sendOTP(phone: string): Promise<APIResponse> {
        const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^\+?91/, '');
        if (!/^[6-9][0-9]{9}$/.test(cleanPhone)) {
            throw new Error("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9");
        }

        const endpoint = "/api/auth/send-otp";

        try {
            const response = await this.request(endpoint, {
                method: "POST",
                body: JSON.stringify({ phone: cleanPhone }),
            });

            if (response.ok) {
                const data = await response.json();
                return { success: true, data, message: "OTP sent successfully" };
            } else {
                let errorData: any = {};
                const contentType = response.headers.get('content-type');

                if (contentType && contentType.includes('application/json')) {
                    try { errorData = await response.json(); } catch (e) { errorData = { message: response.statusText }; }
                } else {
                    try { const errorText = await response.text(); errorData = { message: errorText || response.statusText }; } catch (e) { errorData = { message: response.statusText }; }
                }

                if (response.status === 400 && errorData.errors) {
                    const errorMsg = errorData.errors.map((err: any) => err.msg).join(', ');
                    throw new Error(errorMsg);
                }

                if (response.status === 500 && errorData.message === "Server error while sending OTP") {
                    throw new Error("Backend SMS service error.");
                }

                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error: any) {
            throw error;
        }
    }

    async verifyOTP(phone: string, otp: string): Promise<APIResponse> {
        const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^\+?91/, '');
        const endpoint = "/api/auth/verify-otp";

        try {
            const response = await this.request(endpoint, {
                method: "POST",
                body: JSON.stringify({ phone: cleanPhone, otp }),
            });

            if (response.ok) {
                const data = await response.json();
                let tokens;
                if (data.tokens) tokens = data.tokens;
                else if (data.accessToken) tokens = { accessToken: data.accessToken, refreshToken: data.refreshToken };

                return {
                    success: true,
                    data: { tokens: tokens, user: data.user },
                    message: data.message || "OTP verified successfully"
                };
            } else {
                let errorData: any = {};
                const contentType = response.headers.get('content-type');

                if (contentType && contentType.includes('application/json')) {
                    try { errorData = await response.json(); } catch (e) { errorData = { message: response.statusText }; }
                } else {
                    try { const errorText = await response.text(); errorData = { message: errorText || response.statusText }; } catch (e) { errorData = { message: response.statusText }; }
                }

                if (response.status === 400 && errorData.errors) {
                    const errorMsg = errorData.errors.map((err: any) => err.msg).join(', ');
                    throw new Error(errorMsg);
                }
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }
        } catch (error: any) {
            throw error;
        }
    }

    async logout(): Promise<APIResponse> {
        const endpoints = ["/api/auth/logout", "/auth/logout", "/logout", "/api/logout"];
        for (const endpoint of endpoints) {
            try {
                const response = await this.request(endpoint, { method: "POST" });
                if (response.ok) {
                    const data = await response.json();
                    return { success: true, data, message: "Logged out successfully" };
                }
            } catch (error) { continue; }
        }
        return { success: false, message: "Logout endpoint not found" };
    }
}

export const authAPI = new AuthAPI();
