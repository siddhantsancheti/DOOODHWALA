import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/error-boundary";
import { GlobalNotificationListener } from "@/components/global-notification-listener";

console.log('DOODHWALA: App.tsx loaded - Build version 1.3.0');
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Home from "@/pages/home";
import CustomerDashboard from "@/pages/customer-dashboard";
import MilkmanDashboard from "@/pages/milkman-dashboard";
import YDPage from "@/pages/yd-page";
import Checkout from "@/pages/checkout";
import Profile from "@/pages/profile";
import Features from "@/pages/features";
import NotFound from "@/pages/not-found";
// import QuickOrder from "@/pages/quick-order";
import TrackDelivery from "@/pages/track-delivery";
import ViewOrders from "@/pages/view-orders";
import YourDoodhwala from "@/pages/your-doodhwala";
import ServiceRequests from "@/pages/service-requests";
import OrderPage from "@/pages/order-page";
import CustomerAnalytics from "@/pages/customer-analytics";
import LocationRecommendations from "@/pages/location-recommendations";
import AdminDashboard from "@/pages/admin-dashboard";
import UserTypeSelection from "@/pages/user-type-selection";
import ProfileSetup from "@/pages/profile-setup";
import MilkmanProfileSetup from "@/pages/milkman-profile-setup";
import Gateway from "@/pages/gateway";


import PrivacyPolicy from "@/pages/PrivacyPolicy";

import { Redirect } from "wouter";

// Helper component for role-based route protection
const ProtectedRoute = ({
  component: Component,
  allowedRoles,
  userRole,
  fallbackPath
}: {
  component: React.ComponentType<any>,
  allowedRoles: string[],
  userRole: string | null,
  fallbackPath: string
}) => {
  if (!userRole || !allowedRoles.includes(userRole)) {
    return <Redirect to={fallbackPath} />;
  }
  return <Component />;
};

function AppRouter() {
  const { isAuthenticated, isLoading, user } = useAuth();

  console.log('AppRouter render:', { isAuthenticated, isLoading, user, shouldShowLogin: isLoading || !isAuthenticated });

  // If user is authenticated, check if they need to complete onboarding
  const needsOnboarding = isAuthenticated && user && (!user.userType || user.userType === null);

  // Determine fallback path based on user role
  const getFallbackPath = (userType: string | null) => {
    switch (userType) {
      case 'customer': return '/customer';
      case 'milkman': return '/milkman';
      case 'admin': return '/admin';
      default: return '/';
    }
  };

  const userRole = user?.userType || null;
  const fallbackPath = getFallbackPath(userRole);

  return (
    <Switch>
      {/* Public routes - always accessible */}
      <Route path="/login" component={Login} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/user-type-selection" component={UserTypeSelection} />
      <Route path="/profile-setup" component={ProfileSetup} />
      <Route path="/milkman-profile-setup" component={MilkmanProfileSetup} />

      {/* Protected routes - need authentication */}
      {isLoading ? (
        // Show loading for any route while authentication is being checked
        <Route path="*" component={() => <div className="min-h-screen flex items-center justify-center"><div>Loading...</div></div>} />
      ) : !isAuthenticated ? (
        // Redirect to login for any route if not authenticated
        <Route path="*" component={Login} />
      ) : needsOnboarding ? (
        // Redirect to onboarding for any route if onboarding needed
        <Route path="*" component={UserTypeSelection} />
      ) : (
        // All protected routes when authenticated
        <>
          <Route path="/" component={() => <Redirect to={fallbackPath} />} />
          <Route path="/gateway" component={Gateway} />
          <Route path="/profile" component={Profile} />

          {/* Customer Routes */}
          <Route path="/customer">
            {() => <ProtectedRoute component={CustomerDashboard} allowedRoles={['customer', 'admin']} userRole={userRole} fallbackPath={fallbackPath} />}
          </Route>
          <Route path="/checkout">
            {() => <ProtectedRoute component={Checkout} allowedRoles={['customer', 'admin']} userRole={userRole} fallbackPath={fallbackPath} />}
          </Route>
          <Route path="/yd">
            {() => <ProtectedRoute component={YDPage} allowedRoles={['customer', 'admin']} userRole={userRole} fallbackPath={fallbackPath} />}
          </Route>
          <Route path="/track-delivery">
            {() => <ProtectedRoute component={TrackDelivery} allowedRoles={['customer', 'admin']} userRole={userRole} fallbackPath={fallbackPath} />}
          </Route>
          <Route path="/view-orders">
            {() => <ProtectedRoute component={ViewOrders} allowedRoles={['customer', 'admin']} userRole={userRole} fallbackPath={fallbackPath} />}
          </Route>
          <Route path="/service-requests">
            {() => <ProtectedRoute component={ServiceRequests} allowedRoles={['customer', 'admin']} userRole={userRole} fallbackPath={fallbackPath} />}
          </Route>
          <Route path="/order">
            {() => <ProtectedRoute component={OrderPage} allowedRoles={['customer', 'admin']} userRole={userRole} fallbackPath={fallbackPath} />}
          </Route>

          {/* Milkman Routes */}
          <Route path="/milkman">
            {() => <ProtectedRoute component={MilkmanDashboard} allowedRoles={['milkman', 'admin']} userRole={userRole} fallbackPath={fallbackPath} />}
          </Route>
          <Route path="/your-doodhwala">
            {() => <ProtectedRoute component={YourDoodhwala} allowedRoles={['milkman', 'admin']} userRole={userRole} fallbackPath={fallbackPath} />}
          </Route>

          {/* Admin Routes */}
          <Route path="/admin">
            {() => <ProtectedRoute component={AdminDashboard} allowedRoles={['admin']} userRole={userRole} fallbackPath={fallbackPath} />}
          </Route>
          <Route path="/customer-analytics/:customerId">
            {() => <ProtectedRoute component={CustomerAnalytics} allowedRoles={['admin', 'milkman']} userRole={userRole} fallbackPath={fallbackPath} />}
          </Route>
          <Route path="/location-recommendations">
            {() => <ProtectedRoute component={LocationRecommendations} allowedRoles={['admin', 'milkman']} userRole={userRole} fallbackPath={fallbackPath} />}
          </Route>

          {/* Shared / Public Auth Routes */}
          <Route path="/features" component={Features} />

          {/* 404 fallback - only when authenticated */}
          <Route component={NotFound} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <GlobalNotificationListener />
          <AppRouter />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
