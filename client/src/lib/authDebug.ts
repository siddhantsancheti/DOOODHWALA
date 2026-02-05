// Authentication debugging utilities
export function debugAuthFlow() {
  console.log("=== DOOODHWALA Authentication Debug ===");
  
  // Check stored authentication data
  const token = localStorage.getItem('accessToken');
  const userStr = localStorage.getItem('user');
  
  console.log("🔑 Stored Token:", token ? "Present" : "Missing");
  console.log("👤 Stored User:", userStr ? JSON.parse(userStr) : "Missing");
  
  // Check session validity
  if (token && userStr) {
    try {
      const tokenData = JSON.parse(atob(token));
      const isExpired = tokenData.exp < Date.now();
      console.log("⏰ Token Expiry:", new Date(tokenData.exp));
      console.log("✅ Token Valid:", !isExpired);
      
      const user = JSON.parse(userStr);
      console.log("📱 User Phone:", user.phone);
      console.log("🆔 User ID:", user.id);
      console.log("👥 User Role:", user.role);
    } catch (error) {
      console.error("❌ Invalid token/user data:", error);
    }
  }
  
  // Test backend connectivity
  fetch('/api/health')
    .then(response => response.json())
    .then(data => {
      console.log("🌐 Backend Status:", data.message);
      console.log("✅ Backend Accessible: Yes");
    })
    .catch(error => {
      console.log("❌ Backend Accessible: No", error.message);
    });
  
  console.log("=== Debug Complete ===");
}

export function clearAuthDebug() {
  console.log("🗑️ Clearing authentication data...");
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  console.log("✅ Authentication data cleared");
}