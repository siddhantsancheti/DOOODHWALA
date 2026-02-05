// Test script to discover the backend API structure
import { API_BASE_URL } from "./queryClient";

export async function discoverBackendAPI() {
  console.log("🔍 Discovering backend API structure...");
  
  // Common API patterns to test
  const testEndpoints = [
    // Root paths
    "/",
    "/api",
    "/v1",
    
    // Authentication patterns
    "/auth",
    "/authentication", 
    "/login",
    "/register",
    
    // User management patterns
    "/users",
    "/user", 
    "/customers",
    "/customer",
    "/milkmen",
    "/milkman",
    
    // OTP patterns
    "/otp",
    "/verify", 
    "/sms",
    
    // Nested patterns
    "/api/auth",
    "/api/users",
    "/api/customers",
    "/api/otp",
    "/v1/auth",
    "/v1/users"
  ];

  const results: any[] = [];

  for (const endpoint of testEndpoints) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "GET",
        mode: "cors",
        credentials: "include"
      });
      
      console.log(`✅ GET ${endpoint} - Status: ${response.status}`);
      
      if (response.status < 500) {
        results.push({
          endpoint,
          method: "GET",
          status: response.status,
          contentType: response.headers.get('content-type')
        });
      }
    } catch (error) {
      console.log(`❌ GET ${endpoint} - Failed:`, error);
    }
  }

  // Test POST methods on promising endpoints
  const postTestEndpoints = results
    .filter(r => r.status === 404 || r.status === 405) // Method not allowed might indicate POST is available
    .map(r => r.endpoint);

  for (const endpoint of postTestEndpoints) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ test: true }),
        mode: "cors",
        credentials: "include"
      });
      
      console.log(`✅ POST ${endpoint} - Status: ${response.status}`);
      
      if (response.status < 500 && response.status !== 404) {
        results.push({
          endpoint,
          method: "POST", 
          status: response.status,
          contentType: response.headers.get('content-type')
        });
      }
    } catch (error) {
      console.log(`❌ POST ${endpoint} - Failed:`, error);
    }
  }

  console.log("🎯 Discovery Results:", results);
  return results;
}

// Alternative: Try to parse the backend for route information
export async function analyzeBackendResponse() {
  try {
    const response = await fetch(API_BASE_URL, {
      mode: "cors",
      credentials: "include"
    });
    
    const text = await response.text();
    console.log("Backend root response:", text);
    
    // Look for any route hints in the response
    const routeHints = text.match(/\/[a-zA-Z0-9\/\-_]+/g) || [];
    console.log("Potential route hints found:", routeHints);
    
    return {
      status: response.status,
      content: text,
      routeHints
    };
  } catch (error) {
    console.error("Failed to analyze backend:", error);
    return null;
  }
}