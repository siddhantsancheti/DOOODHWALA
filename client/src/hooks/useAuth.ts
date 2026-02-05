import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest, API_BASE_URL } from "@/lib/queryClient";
import { authAPI } from "@/lib/api";
import { backendAdapter } from "@/lib/backendAdapter";
import { simpleAuth } from "@/lib/simpleAuth";
import type { User } from "@shared/schema";

// Type for auth API responses
type AuthUserResponse = {
  success: boolean;
  user: User;
};

export function useAuth() {
  const queryClient = useQueryClient();

  // Removed duplicate token validation - handled in the other useEffect

  // Clear expired tokens on load if authentication fails
  const clearExpiredTokens = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (token) {
      try {
        // Basic JWT expiry check
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
          console.log('Token expired, clearing localStorage');
          localStorage.removeItem('token');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        }
      } catch (e) {
        console.log('Invalid token format, clearing localStorage');
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
    }
  };

  const { data: authResponse, isLoading, error } = useQuery<AuthUserResponse | null>({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (!token) {
        console.log('No token found for auth check, returning null');
        return null;
      }

      try {
        const response = await apiRequest('/api/auth/user', 'GET');
        const data = await response.json();
        return data;
      } catch (error: any) {
        console.log('Auth request failed:', error.message);
        if (error.message.includes('401')) {
          return null; // Return null for 401 instead of throwing
        }
        throw error;
      }
    },
    retry: false,
    enabled: true, // Always enable auth check - will return null if no token
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
  });

  const user = authResponse?.user;

  // Call clearExpiredTokens on component mount only
  React.useEffect(() => {
    clearExpiredTokens();
  }, []); // Only run once on mount

  // Handle auth errors separately with proper conditions
  React.useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');

    // Only clear tokens if we have a token, no auth response, finished loading, and have an actual auth error
    if (token && !authResponse && !isLoading && error) {
      console.log('Auth error detected, clearing potentially invalid tokens');
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      // Use setTimeout to prevent immediate re-trigger
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }, 100);
    }
  }, [error]); // Only depend on error to prevent unnecessary runs

  // Clear malformed tokens immediately on mount
  React.useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (token) {
      try {
        // Test if token is properly formatted JWT
        const parts = token.split('.');
        if (parts.length !== 3) {
          throw new Error('Malformed JWT - incorrect number of parts');
        }

        // Try to decode the payload
        JSON.parse(atob(parts[1]));
      } catch (e) {
        console.log('Malformed JWT token detected, clearing localStorage:', (e as Error).message);
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        // Delay the invalidation to prevent immediate loops
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        }, 50);
      }
    }
  }, []); // Keep empty dependency array

  const loginMutation = useMutation({
    mutationFn: async ({ phone, otp }: { phone: string; otp: string }) => {
      try {
        console.log('Login mutation starting with:', { phone, otp });
        const result = await authAPI.verifyOTP(phone, otp);
        console.log('Login mutation result:', result);
        return result;
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Login success data:', JSON.stringify(data, null, 2));

      if (data.success && data.data?.accessToken) {
        console.log('Setting token from data.data.accessToken:', data.data.accessToken);
        localStorage.setItem('token', data.data.accessToken);
        localStorage.setItem('accessToken', data.data.accessToken);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      } else if (data.success && data.data?.tokens) {
        console.log('Setting token from data.data.tokens.accessToken:', data.data.tokens.accessToken);
        localStorage.setItem('token', data.data.tokens.accessToken);
        localStorage.setItem('accessToken', data.data.tokens.accessToken);
        localStorage.setItem('refreshToken', data.data.tokens.refreshToken);
        queryClient.setQueryData(["/api/auth/user"], { success: true, user: data.data.user });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      } else if (data.success && data.data?.token) {
        console.log('Setting token from data.data.token:', data.data.token);
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('accessToken', data.data.token);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      } else if (data.success && (data as any).tokens) {
        console.log('Setting token from data.tokens.accessToken:', (data as any).tokens.accessToken);
        localStorage.setItem('token', (data as any).tokens.accessToken);
        localStorage.setItem('accessToken', (data as any).tokens.accessToken);
        localStorage.setItem('refreshToken', (data as any).tokens.refreshToken);
        queryClient.setQueryData(["/api/auth/user"], { success: true, user: (data as any).user });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      } else {
        console.log('No token found in login response, data structure:', data);
      }

      console.log('Token stored in localStorage:', localStorage.getItem('accessToken'));
      console.log('Login onSuccess completed - mutation should not be called again');
    },
    onError: (error) => {
      console.error('Login mutation error:', error);
    },
  });

  const sendOtpMutation = useMutation({
    mutationFn: async ({ phone }: { phone: string }) => {
      try {
        const result = await authAPI.sendOTP(phone);
        return result;
      } catch (error) {
        console.error("Send OTP error:", error);
        throw error;
      }
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const result = await authAPI.logout();
      return result;
    },
    onSuccess: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      queryClient.setQueryData(["/api/auth/user"], null);
      queryClient.clear();
    },
  });

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.log("Logout API call failed, clearing local storage anyway");
    }
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    queryClient.setQueryData(["/api/auth/user"], null);
    queryClient.clear();
  };

  // Check if user has a valid token
  const hasToken = !!localStorage.getItem('token') || !!localStorage.getItem('accessToken');

  return {
    user,
    isLoading: hasToken && isLoading && !authResponse, // Show loading only when we have token but no response yet
    isAuthenticated: !!authResponse?.user, // Authenticated only if we have user data
    login: loginMutation.mutateAsync,
    sendOtp: sendOtpMutation.mutateAsync,
    logout,
    loginError: loginMutation.error,
    otpError: sendOtpMutation.error,
    isLoginLoading: loginMutation.isPending,
    isOtpLoading: sendOtpMutation.isPending,
  };
}
