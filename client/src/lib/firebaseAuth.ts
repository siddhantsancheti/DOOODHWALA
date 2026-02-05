// Firebase Authentication Integration for DOOODHWALA
import { onAuthStateChanged, User } from "firebase/auth";
// @ts-ignore - Firebase config import
import { auth } from "../../../firebase-config";
import { trackEvent } from "./analytics";

// Firebase ID token management
export class FirebaseAuthManager {
  private static instance: FirebaseAuthManager;
  private currentUser: User | null = null;
  private authToken: string | null = null;

  private constructor() {
    this.initializeAuthListener();
  }

  public static getInstance(): FirebaseAuthManager {
    if (!FirebaseAuthManager.instance) {
      FirebaseAuthManager.instance = new FirebaseAuthManager();
    }
    return FirebaseAuthManager.instance;
  }

  private initializeAuthListener() {
    if (!auth) {
      console.log("Firebase Auth not available");
      return;
    }

    // Delay auth listener to avoid React Hook errors
    setTimeout(() => {
      try {
        onAuthStateChanged(auth, async (user) => {
        this.currentUser = user;
      
      if (user) {
        try {
          // Get the current user's Firebase ID token
          const idToken = await user.getIdToken();
          this.authToken = idToken;
          console.log("Firebase Auth: User signed in, ID token obtained");
          
          // Track Firebase authentication
          trackEvent('firebase_auth_success', {
            user_id: user.uid,
            provider: user.providerData[0]?.providerId || 'unknown'
          });

          // You can also get it and force a refresh if needed
          const refreshedToken = await user.getIdToken(true);
          console.log("Firebase Auth: Fresh token obtained");
          
        } catch (error) {
          console.error("Firebase Auth: Error getting ID token:", error);
          trackEvent('firebase_auth_error', {
            error_type: 'token_fetch_failed',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } else {
        // No user is signed in
        this.authToken = null;
        console.log("Firebase Auth: No user signed in");
        trackEvent('firebase_auth_signout');
      }
      });
      } catch (error) {
        console.error("Firebase Auth: Error initializing auth listener:", error);
        // Prevent message channel errors by handling Firebase Auth communication issues
      }
    }, 100);
  }

  // Get current Firebase user
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Get current Firebase ID token
  public async getIdToken(forceRefresh: boolean = false): Promise<string | null> {
    if (!this.currentUser) {
      console.log("Firebase Auth: No user signed in, no ID token available");
      return null;
    }

    try {
      const token = await this.currentUser.getIdToken(forceRefresh);
      this.authToken = token;
      return token;
    } catch (error) {
      console.error("Firebase Auth: Error getting ID token:", error);
      return null;
    }
  }

  // Check if user is authenticated
  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Get Firebase Auth status for integration with existing DOOODHWALA auth
  public getAuthStatus() {
    return {
      isAuthenticated: this.isAuthenticated(),
      user: this.currentUser,
      token: this.authToken,
      uid: this.currentUser?.uid || null,
      email: this.currentUser?.email || null,
      phone: this.currentUser?.phoneNumber || null
    };
  }
}

// Export singleton instance
export const firebaseAuthManager = FirebaseAuthManager.getInstance();

// Utility functions for easy access
export const getCurrentFirebaseUser = () => firebaseAuthManager.getCurrentUser();
export const getFirebaseIdToken = (forceRefresh?: boolean) => firebaseAuthManager.getIdToken(forceRefresh);
export const isFirebaseAuthenticated = () => firebaseAuthManager.isAuthenticated();
export const getFirebaseAuthStatus = () => firebaseAuthManager.getAuthStatus();