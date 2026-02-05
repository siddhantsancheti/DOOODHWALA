// API configuration for connecting to external backend
import { API_BASE_URL } from "./queryClient";

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Test backend connection and available endpoints
export async function testBackendConnection(): Promise<{
  isConnected: boolean;
  availableEndpoints: string[];
  serverInfo: any;
}> {
  try {
    // Test basic connection
    const response = await fetch(API_BASE_URL, {
      method: "GET",
      mode: "cors",
      credentials: "include"
    });

    const data = await response.json();

    return {
      isConnected: true,
      availableEndpoints: [],
      serverInfo: data
    };
  } catch (error) {
    console.error("Backend connection failed:", error);
    return {
      isConnected: false,
      availableEndpoints: [],
      serverInfo: null
    };
  }
}

// Flexible authentication API that adapts to backend structure
export class AuthAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');

    // Ensure headers object exists
    const headers = new Headers(options.headers || {});

    // Add auth token if available
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    // Default to JSON content type if not specified and body is present (and not FormData)
    if (options.body && typeof options.body === 'string' && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    const config: RequestInit = {
      ...options,
      headers,
      mode: "cors",
      // credentials: "omit", // Let specific calls decide, or default to include?
      // Keeping original behavior where mostly used omit/include specifically
    };

    return fetch(`${this.baseUrl}${endpoint}`, config);
  }

  async sendOTP(phone: string): Promise<APIResponse> {
    // Your backend expects 10-digit phone number without country code
    const cleanPhone = phone.replace(/[^0-9]/g, '').replace(/^\+?91/, ''); // Remove +91 prefix if present

    // Validate Indian mobile number format
    if (!/^[6-9][0-9]{9}$/.test(cleanPhone)) {
      throw new Error("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9");
    }

    console.log(`Attempting to send OTP to: ${cleanPhone} (from ${phone})`);

    const endpoint = "/api/auth/send-otp";

    try {
      const response = await this.request(endpoint, {
        method: "POST",
        body: JSON.stringify({ phone: cleanPhone }),
        credentials: "omit",
        cache: "no-cache"
      });

      console.log(`Response status for ${endpoint}:`, response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          data,
          message: "OTP sent successfully"
        };
      } else {
        let errorData: any = {};
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          try {
            errorData = await response.json();
          } catch (e) {
            // If JSON parsing fails, use status message
            errorData = { message: response.statusText };
          }
        } else {
          // For non-JSON responses
          try {
            const errorText = await response.text();
            errorData = { message: errorText || response.statusText };
          } catch (e) {
            errorData = { message: response.statusText };
          }
        }

        console.log(`Error response from ${endpoint}:`, errorData);

        // Handle validation errors from backend
        if (response.status === 400 && errorData.errors) {
          const errorMsg = errorData.errors.map((err: any) => err.msg).join(', ');
          throw new Error(errorMsg);
        }

        // Handle server errors with clear messaging
        if (response.status === 500 && errorData.message === "Server error while sending OTP") {
          throw new Error("Backend SMS service error.");
        }

        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.log(`Network error for ${endpoint}:`, error);
      if (error.message.includes('CORS')) {
        throw new Error("Cross-origin request blocked.");
      }
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
        credentials: "omit",
        cache: "no-cache"
      });

      if (response.ok) {
        const data = await response.json();

        // Handle both response formats
        let tokens;
        if (data.tokens) {
          tokens = data.tokens;
        } else if (data.accessToken) {
          tokens = {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken
          };
        }

        return {
          success: true,
          data: {
            tokens: tokens,
            user: data.user
          },
          message: data.message || "OTP verified successfully"
        };
      } else {
        let errorData: any = {};
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          try {
            errorData = await response.json();
          } catch (e) {
            errorData = { message: response.statusText };
          }
        } else {
          try {
            const errorText = await response.text();
            errorData = { message: errorText || response.statusText };
          } catch (e) {
            errorData = { message: response.statusText };
          }
        }
        
        if (response.status === 400 && errorData.errors) {
          const errorMsg = errorData.errors.map((err: any) => err.msg).join(', ');
          throw new Error(errorMsg);
        }
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }
    } catch (error: any) {
      console.log(`Verify OTP network error:`, error);
      throw error;
    }
  }

  async getUserProfile(): Promise<APIResponse> {
    const endpoints = [
      "/api/auth/user",
      "/auth/user",
      "/user",
      "/api/user",
      "/profile"
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await this.request(endpoint, {
          credentials: "include"
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            data,
            message: "User profile retrieved"
          };
        }
      } catch (error) {
        // Continue to next endpoint
        continue;
      }
    }

    return {
      success: false,
      message: "No working user profile endpoint found"
    };
  }

  async logout(): Promise<APIResponse> {
    const endpoints = [
      "/api/auth/logout",
      "/auth/logout",
      "/logout",
      "/api/logout"
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await this.request(endpoint, {
          method: "POST",
          credentials: "include"
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            data,
            message: "Logged out successfully"
          };
        }
      } catch (error) {
        continue;
      }
    }

    return {
      success: false,
      message: "Logout endpoint not found"
    };
  }
}

export const authAPI = new AuthAPI();