import * as queryClientModule from "./queryClient";
import * as SecureStore from "./storage";

// Always read API_BASE_URL dynamically so it reflects Supabase-fetched value
const getBaseUrl = () => queryClientModule.API_BASE_URL;

export interface APIResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

// Safely parse JSON — if server returns HTML (e.g. 502 from tunnel), give a clear message
async function safeJson(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }
    // Not JSON — server is likely down or tunnel is showing an error page
    if (!response.ok) {
        throw new Error(`Server is unreachable (${response.status}). Please make sure the server is running.`);
    }
    return {};
}

export class AuthAPI {

    async sendOTP(phone: string): Promise<APIResponse> {
        const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^\+?91/, '');
        if (!/^[6-9][0-9]{9}$/.test(cleanPhone)) {
            throw new Error("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9");
        }

        const fullPhone = `+91${cleanPhone}`;

        try {
            const response = await fetch(`${getBaseUrl()}/api/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ phone: fullPhone }),
            });

            const data = await safeJson(response);

            if (!response.ok) {
                throw new Error(data.message || "Failed to send OTP");
            }

            return { success: true, message: data.message || "OTP sent successfully" };
        } catch (error: any) {
            if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
                throw new Error("Cannot reach server. Is the server running?");
            }
            throw new Error(error.message || "Failed to send OTP");
        }
    }

    async verifyOTP(phone: string, otp: string): Promise<APIResponse> {
        const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^\+?91/, '');
        const fullPhone = `+91${cleanPhone}`;

        try {
            const response = await fetch(`${getBaseUrl()}/api/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ phone: fullPhone, otp }),
            });

            const data = await safeJson(response);

            if (!response.ok) {
                throw new Error(data.message || "Invalid or expired OTP");
            }

            return {
                success: true,
                data: {
                    accessToken: data.accessToken,
                    user: data.user,
                },
                message: data.message || "OTP verified successfully"
            };
        } catch (error: any) {
            if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
                throw new Error("Cannot reach server. Is the server running?");
            }
            throw new Error(error.message || "Failed to verify OTP");
        }
    }

    async logout(): Promise<APIResponse> {
        try {
            await SecureStore.deleteItemAsync('token');
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('refreshToken');
            return { success: true, message: "Logged out successfully" };
        } catch (error: any) {
            return { success: false, message: error.message || "Logout failed" };
        }
    }
}

export const authAPI = new AuthAPI();
