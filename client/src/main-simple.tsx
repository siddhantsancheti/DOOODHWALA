import { createRoot } from "react-dom/client";
import "./index.css";

// Simple test component to verify React rendering
function SimpleApp() {
  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f9ff',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <h1 style={{
          color: '#1e40af',
          fontSize: '2.5rem',
          marginBottom: '20px',
          fontWeight: 'bold'
        }}>
          🥛 DOOODHWALA
        </h1>
        <p style={{
          color: '#6b7280',
          fontSize: '1.1rem',
          marginBottom: '20px'
        }}>
          Deployment Test Successful!
        </p>
        <div style={{
          background: '#dcfce7',
          color: '#166534',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          ✅ React is working correctly<br />
          ✅ CSS styles are loading<br />
          ✅ Production build successful
        </div>
        <button
          style={{
            background: '#1e40af',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
          onClick={() => {
            alert('Button click working! 🎉\n\nThis confirms JavaScript execution is successful.');
          }}
        >
          Test Button Click
        </button>
        <p style={{
          color: '#9ca3af',
          fontSize: '0.9rem',
          marginTop: '20px'
        }}>
          If you see this message, the deployment issue has been resolved.
        </p>
      </div>
    </div>
  );
}

// Global error handlers
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  document.body.innerHTML += `<div style="position: fixed; top: 10px; right: 10px; background: #fee; color: #900; padding: 10px; border: 2px solid #f00; border-radius: 5px; z-index: 10000;">JavaScript Error: ${event.error?.message || 'Unknown error'}</div>`;
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

// App initialization with comprehensive error handling
console.log('🥛 DOOODHWALA: Starting simplified test application...');

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  console.log('🥛 DOOODHWALA: Root element found, creating React root...');
  const root = createRoot(rootElement);

  console.log('🥛 DOOODHWALA: Rendering simple test app...');
  root.render(<SimpleApp />);

  console.log('🥛 DOOODHWALA: Simple test app rendered successfully!');

} catch (error) {
  console.error('🥛 DOOODHWALA: Failed to start test application:', error);

  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 30px;
    border: 3px solid #f00;
    border-radius: 12px;
    color: #900;
    font-family: Arial, sans-serif;
    text-align: center;
    max-width: 500px;
    z-index: 10000;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  `;

  errorDiv.innerHTML = `
    <h2 style="margin-top: 0;">🥛 DOOODHWALA Deployment Error</h2>
    <p><strong>Error:</strong> ${(error as any).message}</p>
    <pre style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: left; overflow-x: auto; font-size: 12px;">${(error as any).stack || 'No stack trace available'}</pre>
    <p style="color: #666; font-size: 14px;">Please refresh the page or contact support if the issue persists.</p>
  `;

  document.body.appendChild(errorDiv);
}