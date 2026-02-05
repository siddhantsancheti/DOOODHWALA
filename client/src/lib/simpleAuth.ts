// Simple authentication for external backend that may not have OTP endpoints
import { API_BASE_URL } from "./queryClient";

interface SimpleAuthResponse {
  success: boolean;
  message?: string;
  user?: any;
  token?: string;
}

export class SimpleAuth {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Test if backend is accessible
  async ping(): Promise<SimpleAuthResponse> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "GET",
        mode: "cors",
        credentials: "include"
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: data.message || "Backend is accessible"
        };
      }
    } catch (error) {
      console.log("Backend ping failed:", error);
    }

    return {
      success: false,
      message: "Backend not accessible"
    };
  }

  // Simple login that creates a session without OTP
  async simpleLogin(phone: string): Promise<SimpleAuthResponse> {
    console.log(`Creating simple login session for: ${phone}`);
    
    // Create a user session without requiring backend connection
    const mockUser = {
      id: Math.random().toString(36).substr(2, 9),
      phone: phone,
      name: "Customer",
      role: "customer",
      isActive: true
    };

    // Generate a simple token
    const token = btoa(JSON.stringify({
      userId: mockUser.id,
      phone: mockUser.phone,
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    }));

    // Store user data locally for immediate access
    localStorage.setItem('user', JSON.stringify(mockUser));
    localStorage.setItem('accessToken', token);
    
    console.log("Simple auth session created successfully");
    
    return {
      success: true,
      message: "Login successful",
      user: mockUser,
      token: token
    };
  }

  // Check current session
  async checkSession(): Promise<SimpleAuthResponse> {
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      return {
        success: false,
        message: "No session found"
      };
    }

    try {
      // Verify token hasn't expired
      const tokenData = JSON.parse(atob(token));
      if (tokenData.exp < Date.now()) {
        this.logout();
        return {
          success: false,
          message: "Session expired"
        };
      }

      const user = JSON.parse(userStr);
      return {
        success: true,
        message: "Session valid",
        user: user,
        token: token
      };
    } catch (error) {
      this.logout();
      return {
        success: false,
        message: "Invalid session"
      };
    }
  }

  // Logout
  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  }
}

export const simpleAuth = new SimpleAuth();