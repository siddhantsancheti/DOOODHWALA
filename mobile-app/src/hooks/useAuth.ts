import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { authAPI } from "../lib/api";
import * as SecureStore from "expo-secure-store";
import type { User } from "../types/schema"; // We will create this

type AuthUserResponse = {
    success: boolean;
    user: User;
};

export function useAuth() {
    const queryClient = useQueryClient();
    const [hasToken, setHasToken] = React.useState(false);

    React.useEffect(() => {
        const checkToken = async () => {
            const token = await SecureStore.getItemAsync('token');
            const accToken = await SecureStore.getItemAsync('accessToken');
            if (token || accToken) {
                setHasToken(true);
            }
        };
        checkToken();
    }, []);

    const clearTokens = async () => {
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        setHasToken(false);
    };

    const { data: authResponse, isLoading, error } = useQuery<AuthUserResponse | null>({
        queryKey: ["/api/auth/user"],
        queryFn: async () => {
            const token = await SecureStore.getItemAsync('token') || await SecureStore.getItemAsync('accessToken');
            if (!token) return null;

            try {
                const response = await apiRequest({ url: '/api/auth/user', method: 'GET' });
                const data = await response.json();
                return data as AuthUserResponse;
            } catch (error: any) {
                if (error.message.includes('401')) {
                    return null;
                }
                throw error;
            }
        },
        retry: false,
        staleTime: 5 * 60 * 1000,
    });

    React.useEffect(() => {
        const handleAuthError = async () => {
            const token = await SecureStore.getItemAsync('token');
            if (token && !authResponse && !isLoading && error) {
                const errMsg = error.message || "";
                if (errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('Unauthorized')) {
                    await clearTokens();
                    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                }
            }
        };
        handleAuthError();
    }, [error]);

    const loginMutation = useMutation({
        mutationFn: async ({ phone, otp }: { phone: string; otp: string }) => {
            return await authAPI.verifyOTP(phone, otp);
        },
        onSuccess: async (data: any) => {
            if (data.success) {
                let tokenToSet = null;
                let refreshTokenToSet = null;

                if (data.data?.accessToken) {
                    tokenToSet = data.data.accessToken;
                } else if (data.data?.tokens?.accessToken) {
                    tokenToSet = data.data.tokens.accessToken;
                    refreshTokenToSet = data.data.tokens.refreshToken;
                } else if (data.data?.token) {
                    tokenToSet = data.data.token;
                }

                if (tokenToSet) {
                    await SecureStore.setItemAsync('token', tokenToSet);
                    await SecureStore.setItemAsync('accessToken', tokenToSet);
                    if (refreshTokenToSet) {
                        await SecureStore.setItemAsync('refreshToken', refreshTokenToSet);
                    }
                    setHasToken(true);
                    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                }
            }
        },
    });

    const sendOtpMutation = useMutation({
        mutationFn: async ({ phone }: { phone: string }) => {
            return await authAPI.sendOTP(phone);
        },
    });

    const logout = async () => {
        try {
            await authAPI.logout();
        } catch (e) { }
        await clearTokens();
        queryClient.setQueryData(["/api/auth/user"], null);
        queryClient.clear();
    };

    const user = authResponse?.user;

    return {
        user,
        isLoading: hasToken && isLoading && !authResponse,
        isAuthenticated: !!user,
        login: loginMutation.mutateAsync,
        sendOtp: sendOtpMutation.mutateAsync,
        logout,
        loginError: loginMutation.error,
        otpError: sendOtpMutation.error,
        isLoginLoading: loginMutation.isPending,
        isOtpLoading: sendOtpMutation.isPending,
    };
}
