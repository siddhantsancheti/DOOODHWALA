import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/error-boundary";
import { GlobalNotificationListener } from "@/components/global-notification-listener";

import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import CustomerDashboard from "@/pages/customer-dashboard";
import MilkmanDashboard from "@/pages/milkman-dashboard";
import Checkout from "@/pages/checkout";
import Profile from "@/pages/profile";
import Features from "@/pages/features";
import NotFound from "@/pages/not-found";
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
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: customerProfile, isLoading: isCustomerLoading } = useQuery({
    queryKey: ["/api/customers/profile"],
    enabled: isAuthenticated && user?.userType === 'customer',
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const { data: milkmanProfile, isLoading: isMilkmanLoading } = useQuery({
    queryKey: ["/api/milkmen/profile"],
    enabled: isAuthenticated && user?.userType === 'milkman',
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading =
    isAuthLoading ||
    (isAuthenticated && user?.userType === 'customer' && isCustomerLoading) ||
    (isAuthenticated && user?.userType === 'milkman' && isMilkmanLoading);

  const isProfileComplete = () => {
    if (!user?.userType) return false;
    if (user.userType === 'customer')
      return !!customerProfile && !!(customerProfile as any).name && !!(customerProfile as any).address;
    if (user.userType === 'milkman')
      return !!milkmanProfile && !!(milkmanProfile as any).contactName && !!(milkmanProfile as any).businessName;
    if (user.userType === 'admin') return true;
    return false;
  };

  const needsOnboarding = isAuthenticated && user && (!user.userType || !isProfileComplete());

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

  const renderOnboarding = () => {
    if (!user?.userType) return <UserTypeSelection />;
    if (user.userType === 'customer') return <ProfileSetup />;
    if (user.userType === 'milkman') return <MilkmanProfileSetup />;
    return <UserTypeSelection />;
  };

  const loadingFallback = () => (
    <div className="min-h-screen flex items-center justify-center">
      <div>Loading...</div>
    </div>
  );

  return (
    <Switch>
      {/* Always-public routes */}
      <Route path="/">
        {() => {
          if (isLoading) return loadingFallback();
          if (isAuthenticated && !needsOnboarding) return <Redirect to={fallbackPath} />;
          if (isAuthenticated && needsOnboarding) return renderOnboarding();
          return <Landing />;
        }}
      </Route>
      <Route path="/login" component={Login} />
      <Route path="/features" component={Features} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/user-type-selection" component={UserTypeSelection} />
      <Route path="/profile-setup" component={ProfileSetup} />
      <Route path="/milkman-profile-setup" component={MilkmanProfileSetup} />

      {/* Auth-gated routes */}
      {isLoading ? (
        <Route path="*" component={loadingFallback} />
      ) : !isAuthenticated ? (
        <Route path="*" component={() => <Redirect to="/login" />} />
      ) : needsOnboarding ? (
        <Route path="*">{() => renderOnboarding()}</Route>
      ) : (
        <>
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
            {() => <ProtectedRoute component={YourDoodhwala} allowedRoles={['customer', 'admin']} userRole={userRole} fallbackPath={fallbackPath} />}
          </Route>
          <Route path="/your-doodhwala">
            {() => <ProtectedRoute component={YourDoodhwala} allowedRoles={['customer', 'admin']} userRole={userRole} fallbackPath={fallbackPath} />}
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

          {/* 404 fallback */}
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
