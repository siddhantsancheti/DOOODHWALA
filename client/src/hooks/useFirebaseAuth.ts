// React Hook for Firebase Authentication in DOOODHWALA
import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { 
  firebaseAuthManager, 
  getFirebaseAuthStatus,
  getFirebaseIdToken 
} from "../lib/firebaseAuth";

// Firebase Auth status interface
interface FirebaseAuthStatus {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  uid: string | null;
  email: string | null;
  phone: string | null;
  loading: boolean;
}

// React Hook for Firebase Authentication
export const useFirebaseAuth = () => {
  const [authStatus, setAuthStatus] = useState<FirebaseAuthStatus>({
    isAuthenticated: false,
    user: null,
    token: null,
    uid: null,
    email: null,
    phone: null,
    loading: true
  });

  useEffect(() => {
    // Update auth status when it changes
    const updateAuthStatus = () => {
      const status = getFirebaseAuthStatus();
      setAuthStatus({
        ...status,
        loading: false
      });
    };

    // Initial check
    updateAuthStatus();

    // Set up periodic check for auth changes
    const interval = setInterval(updateAuthStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  // Helper function to get fresh ID token
  const refreshToken = async (forceRefresh: boolean = true) => {
    try {
      const token = await getFirebaseIdToken(forceRefresh);
      if (token) {
        setAuthStatus(prev => ({ ...prev, token }));
      }
      return token;
    } catch (error) {
      console.error('Firebase Auth: Error refreshing token:', error);
      return null;
    }
  };

  return {
    ...authStatus,
    refreshToken
  };
};

// Hook specifically for getting Firebase ID token
export const useFirebaseIdToken = () => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getToken = async () => {
      try {
        const idToken = await getFirebaseIdToken();
        setToken(idToken);
      } catch (error) {
        console.error('Error getting Firebase ID token:', error);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    getToken();

    // Refresh token every 30 minutes
    const interval = setInterval(() => {
      getToken();
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { token, loading };
};