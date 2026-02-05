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


function AppRouter() {
  const { isAuthenticated, isLoading, user } = useAuth();

  console.log('AppRouter render:', { isAuthenticated, isLoading, user, shouldShowLogin: isLoading || !isAuthenticated });

  // If user is authenticated, check if they need to complete onboarding
  const needsOnboarding = isAuthenticated && user && (!user.userType || user.userType === null);

  // Debug authentication state
  console.log('App debug - user object:', user);
  console.log('App debug - user.userType:', user?.userType);
  console.log('App debug - needsOnboarding:', needsOnboarding);

  return (
    <Switch>
      {/* Public routes - always accessible */}
      <Route path="/login" component={Login} />
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
          <Route path="/" component={Home} />
          <Route path="/gateway" component={Gateway} />
          <Route path="/customer" component={CustomerDashboard} />
          <Route path="/milkman" component={MilkmanDashboard} />
          <Route path="/yd" component={YDPage} />
          <Route path="/checkout" component={Checkout} />
          <Route path="/profile" component={Profile} />
          <Route path="/features" component={Features} />
          {/* <Route path="/quick-order" component={QuickOrder} /> */}
          <Route path="/track-delivery" component={TrackDelivery} />
          <Route path="/view-orders" component={ViewOrders} />
          <Route path="/your-doodhwala" component={YourDoodhwala} />
          <Route path="/service-requests" component={ServiceRequests} />
          <Route path="/order" component={OrderPage} />
          <Route path="/customer-analytics/:customerId" component={CustomerAnalytics} />
          <Route path="/location-recommendations" component={LocationRecommendations} />
          <Route path="/admin" component={AdminDashboard} />

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
