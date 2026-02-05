// Complete app debugging utility
export function debugCompleteApp() {
  console.log("🔍 === DOOODHWALA COMPLETE APP DEBUG ===");
  
  // 1. Authentication Status
  console.log("\n📱 AUTHENTICATION:");
  const token = localStorage.getItem('accessToken');
  const userStr = localStorage.getItem('user');
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      const tokenData = JSON.parse(atob(token));
      console.log("✅ User authenticated:", user.phone);
      console.log("⏰ Token expires:", new Date(tokenData.exp));
      console.log("🆔 User ID:", user.id);
    } catch (error) {
      console.error("❌ Invalid auth data:", error);
    }
  } else {
    console.log("❌ No authentication data found");
  }
  
  // 2. Backend Connectivity
  console.log("\n🌐 BACKEND CONNECTIVITY:");
  fetch('/api/health')
    .then(response => response.json())
    .then(data => {
      console.log("✅ Backend accessible:", data.message);
    })
    .catch(error => {
      console.log("❌ Backend error:", error.message);
    });
  
  // 3. Current Page
  console.log("\n📄 CURRENT PAGE:");
  console.log("URL:", window.location.pathname);
  console.log("Hash:", window.location.hash);
  console.log("Search:", window.location.search);
  
  // 4. Local Storage Contents
  console.log("\n💾 LOCAL STORAGE:");
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      console.log(`${key}:`, value?.substring(0, 50) + (value && value.length > 50 ? '...' : ''));
    }
  }
  
  // 5. React Query Cache Status
  console.log("\n🔄 QUERY CACHE STATUS:");
  // This would need to be called from a component context to access queryClient
  
  console.log("\n=== DEBUG COMPLETE ===");
}

export function clearAppData() {
  console.log("🗑️ Clearing all app data...");
  localStorage.clear();
  sessionStorage.clear();
  console.log("✅ All data cleared");
  window.location.reload();
}

export function testAuthFlow() {
  console.log("🧪 Testing authentication flow...");
  
  // Test simple auth
  import('./simpleAuth').then(({ simpleAuth }) => {
    simpleAuth.simpleLogin('+919876543210')
      .then(result => {
        console.log("✅ Simple auth test:", result.success ? "PASSED" : "FAILED");
        console.log("Response:", result);
      })
      .catch(error => {
        console.error("❌ Simple auth test FAILED:", error);
      });
  });
}