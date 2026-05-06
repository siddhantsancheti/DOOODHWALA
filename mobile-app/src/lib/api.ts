import { API_BASE_URL } from "./queryClient";
import * as SecureStore from "./storage";
import { supabase } from "./supabase";

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
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

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

        const fullPhone = `+91${cleanPhone}`;

        try {
            const { error } = await supabase.auth.signInWithOtp({
                phone: fullPhone,
            });

            if (error) throw error;

            return { success: true, message: "OTP sent successfully" };
        } catch (error: any) {
            throw new Error(error.message || "Failed to send OTP");
        }
    }

    async verifyOTP(phone: string, otp: string): Promise<APIResponse> {
        const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^\+?91/, '');
        const fullPhone = `+91${cleanPhone}`;

        try {
            const { data, error } = await supabase.auth.verifyOtp({
                phone: fullPhone,
                token: otp,
                type: 'sms',
            });

            if (error) throw error;

            return {
                success: true,
                data: { 
                    tokens: { 
                        accessToken: data.session?.access_token, 
                        refreshToken: data.session?.refresh_token 
                    }, 
                    user: data.user 
                },
                message: "OTP verified successfully"
            };
        } catch (error: any) {
            throw new Error(error.message || "Failed to verify OTP");
        }
    }

    async logout(): Promise<APIResponse> {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { success: true, message: "Logged out successfully" };
        } catch (error: any) {
            return { success: false, message: error.message || "Logout failed" };
        }
    }
}

export const authAPI = new AuthAPI();
