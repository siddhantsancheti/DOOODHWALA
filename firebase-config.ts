// Firebase Configuration for DOOODHWALA
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Vite exposes env vars via import.meta.env (NOT process.env). The web Firebase
// config is non-secret (it ships to the browser) — set these as VITE_FIREBASE_*
// build-time env vars (in Render). Get the values from Firebase Console →
// Project Settings → Your apps → Web app config.
const env: any = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "dooodhwala-7dce6.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "dooodhwala-7dce6",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "dooodhwala-7dce6.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Analytics disabled — CSP blocks Google Analytics script loading
let analytics: any = null;

// Initialize Auth
const auth = getAuth(app);

export { app, analytics, auth };