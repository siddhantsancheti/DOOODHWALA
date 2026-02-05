// Firebase Configuration for DOOODHWALA
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyCoAEyvW_yHnU8Mt3rtV37rb4q5vYbUNNw",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "dooodhwala-backend.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "dooodhwala-backend",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "dooodhwala-backend.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "705765260426",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:705765260426:web:0921238468cee23b30c173",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-T0YVZLZ3ZQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (only in browser environment) - temporarily disabled due to CSP
let analytics: any = null;
// Temporarily disabled to fix CSP issues with Google Analytics
// if (typeof window !== 'undefined') {
//   analytics = getAnalytics(app);
// }
console.log('DOODHWALA: Firebase Analytics temporarily disabled (CSP fix)');

// Initialize Auth
const auth = getAuth(app);

export { app, analytics, auth };