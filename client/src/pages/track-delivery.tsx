import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ZomatoStyleTracking } from "@/components/zomato-style-tracking";
import { OrderCard } from "@/components/order-card";
import { Truck, MapPin, Clock, CheckCircle, Package, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import logoImage from "@/assets/logo.png";

import type { Customer, Order } from "@shared/schema";

export default function TrackDelivery() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: customerProfile } = useQuery<Customer>({
    queryKey: ["/api/customers/profile"],
    enabled: !!user,
  });

  const { data: orders } = useQuery<Order[]>({
    queryKey: ["/api/orders/customer"],
    enabled: !!customerProfile,
  });

  const activeOrders = orders?.filter((order) =>
    order.status === 'pending' || order.status === 'confirmed' || order.status === 'out_for_delivery'
  ) || [];

  const recentOrders = orders?.filter((order) =>
    order.status === 'delivered' || order.status === 'cancelled'
  ).slice(0, 5) || [];

  // Mock milkman profile for demonstration
  const { data: assignedMilkman } = useQuery<any>({ // Using any for now to match structure
    queryKey: [`/api/milkmen/${customerProfile?.assignedMilkmanId}`],
    enabled: !!customerProfile?.assignedMilkmanId,
  });

  // Default mock profile if no milkman assigned
  const defaultMilkmanProfile = {
    id: 1,
    contactName: "Rajesh Kumar",
    businessName: "Fresh Milk Dairy",
    phone: "+919876543200",
    address: "Shop 12, Dairy Market, Pune, Maharashtra, India",
    latitude: "18.5204",
    longitude: "73.8567",
    rating: "4.8",
    totalReviews: 127,
    verified: true
  };

  const milkmanToTrack = assignedMilkman || defaultMilkmanProfile;

  if (!customerProfile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Profile Required</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">Please complete your profile to track deliveries.</p>
              <Button onClick={() => setLocation('/customer')}>Back to Dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setLocation('/customer')}
            >
              <img src={logoImage} alt="DOOODHWALA" className="h-8 w-8 object-contain" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Track Delivery</h1>
            </div>
            <Button variant="outline" onClick={() => setLocation('/customer')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeOrders.length > 0 ? (
          <ZomatoStyleTracking
            order={activeOrders[0]}
            customerProfile={customerProfile}
            milkmanProfile={milkmanToTrack}
          />
        ) : (
          <Card className="mb-8">
            <CardContent className="p-12">
              <div className="text-center">
                <Package className="h-24 w-24 mx-auto text-gray-400 dark:text-gray-500 mb-6" />
                <h3 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">No Active Orders</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
                  You don't have any active orders at the moment. Place an order to track your delivery in real-time.
                </p>
                <Button onClick={() => setLocation('/customer')} className="bg-blue-600 hover:bg-blue-700">
                  <Package className="h-4 w-4 mr-2" />
                  Place New Order
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.map((order: any) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}