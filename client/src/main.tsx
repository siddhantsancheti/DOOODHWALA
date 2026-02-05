import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// Import Firebase config with safe async handling
async function initializeFirebase() {
  try {
    const firebaseModule = await import("../../firebase-config");
    return firebaseModule.analytics;
  } catch (error) {
    console.warn('DOODHWALA: Firebase config failed to load:', error);
    return null;
  }
}

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Only prevent default for known safe rejections
  if (event.reason && typeof event.reason === 'object' && event.reason.name !== 'ChunkLoadError') {
    event.preventDefault();
  }
});

// Global error handler for general errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

// Initialize Firebase services after DOM is ready
async function initializeApp() {
  const analytics = await initializeFirebase();
  
  if (analytics) {
    console.log('DOODHWALA: Firebase Analytics initialized');
  } else {
    console.log('DOODHWALA: Firebase Analytics not available in this environment');
  }

// Add deployment debug logging
console.log('DOODHWALA: Starting React application...');
console.log('DOODHWALA: Root element available:', !!document.getElementById("root"));

  try {
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      console.error('DOODHWALA: Root element not found!');
      document.body.innerHTML = '<div style="padding: 20px; font-family: Arial; background: #fee; color: #900; border: 2px solid #f00; margin: 20px; border-radius: 8px;"><h2>🥛 DOOODHWALA Loading Error</h2><p>Root element not found. The application cannot start.</p><p>Please try refreshing the page or contact support.</p></div>';
      return;
    }

    console.log('DOODHWALA: Creating React root...');
    const root = createRoot(rootElement);
    console.log('DOODHWALA: Rendering App component...');
    
    try {
      root.render(<App />);
      console.log('DOODHWALA: App rendered successfully!');
    } catch (renderError) {
      console.error('DOODHWALA: React render error:', renderError);
      throw renderError; // Re-throw to be caught by outer try-catch
    }
    
    // Initialize Firebase Auth Manager after React is ready
    setTimeout(async () => {
      try {
        const { firebaseAuthManager } = await import('./lib/firebaseAuth');
        console.log('DOODHWALA: Firebase Auth Manager initialized');
      } catch (firebaseError) {
        console.warn('DOODHWALA: Firebase Auth Manager failed to load:', firebaseError);
        // Continue without Firebase Auth if it fails
      }
    }, 500);
  } catch (error) {
    console.error('DOODHWALA: Failed to start application:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const stack = error instanceof Error ? error.stack : 'No stack trace available';
    
    // Log to console for debugging production issues
    console.error('DOODHWALA CRITICAL ERROR DETAILS:');
    console.error('Message:', errorMessage);
    console.error('Stack:', stack);
    console.error('Full error object:', error);
    
    document.body.innerHTML = `<div style="padding: 20px; font-family: Arial; background: #fee; color: #900; border: 2px solid #f00; margin: 20px; border-radius: 8px;">
      <h2>🥛 DOOODHWALA Application Error</h2>
      <p><strong>Error:</strong> ${errorMessage}</p>
      <p>Please try refreshing the page. If the issue persists, contact support.</p>
      <button onclick="window.location.reload()" style="background: #007cba; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-top: 15px;">
        Refresh Page
      </button>
      <details style="margin-top: 15px;">
        <summary>Technical Details</summary>
        <pre style="background: #f9f9f9; padding: 10px; margin: 10px 0; border-radius: 4px; overflow-x: auto; font-size: 12px;">${stack}</pre>
      </details>
    </div>`;
  }
}

// Initialize the application
initializeApp().catch((error: unknown) => {
  console.error('DOODHWALA: Failed to initialize application:', error);
});
