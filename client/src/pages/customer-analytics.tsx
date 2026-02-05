import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Navbar } from "@/components/navbar";
import {
  BarChart3,
  TrendingUp,
  Package,
  IndianRupee,
  Calendar,
  User,
  Phone,
  MapPin,
  Clock,
  ShoppingCart,
  DollarSign,
  Star,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Truck,
  Receipt
} from "lucide-react";
import { useParams } from "wouter";
import { useLocation } from "wouter";
import type { Customer, Order, Bill, Milkman } from "@shared/schema";

export default function CustomerAnalytics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const customerId = location.split('/')[2]; // Extract customerId from URL path
  const [selectedTab, setSelectedTab] = useState("summary");

  // Get customer profile
  const { data: customer, isLoading: customerLoading } = useQuery<Customer>({
    queryKey: ['/api/customers', customerId],
    queryFn: async () => {
      const response = await apiRequest(`/api/customers/${customerId}`, "GET");
      return response.json();
    },
    enabled: !!customerId,
  });

  // Get customer orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders/customer', customerId],
    queryFn: async () => {
      const response = await apiRequest(`/api/orders/customer/${customerId}`, "GET");
      return response.json();
    },
    enabled: !!customerId,
  });

  // Get customer bills
  const { data: bills = [], isLoading: billsLoading } = useQuery<Bill[]>({
    queryKey: ['/api/bills/customer', customerId],
    queryFn: async () => {
      const response = await apiRequest(`/api/bills/customer/${customerId}`, "GET");
      return response.json();
    },
    enabled: !!customerId,
  });

  // Get milkman profile - only fetch if user is actually a milkman
  const { data: milkmanProfile } = useQuery<Milkman>({
    queryKey: ['/api/milkmen/profile'],
    queryFn: async () => {
      const response = await apiRequest("/api/milkmen/profile", "GET");
      return response.json();
    },
    enabled: !!user && user.userType === 'milkman',
  });

  // Calculate analytics
  const calculateAnalytics = () => {
    if (!orders || orders.length === 0) return null;

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum: number, order: any) => sum + parseFloat(order.totalAmount || 0), 0);
    const avgOrderValue = totalRevenue / totalOrders;

    // Monthly breakdown
    const monthlyData = orders.reduce((acc: any, order: any) => {
      const month = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!acc[month]) {
        acc[month] = { orders: 0, revenue: 0, products: {} };
      }
      acc[month].orders += 1;
      acc[month].revenue += parseFloat(order.totalAmount || 0);

      // Product breakdown
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          if (!acc[month].products[item.name]) {
            acc[month].products[item.name] = { quantity: 0, revenue: 0 };
          }
          acc[month].products[item.name].quantity += parseFloat(item.quantity || 0);
          acc[month].products[item.name].revenue += parseFloat(item.quantity || 0) * parseFloat(item.pricePerUnit || 0);
        });
      }

      return acc;
    }, {});

    // Product analysis
    const productAnalysis = orders.reduce((acc: any, order: any) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          if (!acc[item.name]) {
            acc[item.name] = { totalQuantity: 0, totalRevenue: 0, orders: 0 };
          }
          acc[item.name].totalQuantity += parseFloat(item.quantity || 0);
          acc[item.name].totalRevenue += parseFloat(item.quantity || 0) * parseFloat(item.pricePerUnit || 0);
          acc[item.name].orders += 1;
        });
      }
      return acc;
    }, {});

    return {
      totalOrders,
      totalRevenue,
      avgOrderValue,
      monthlyData,
      productAnalysis
    };
  };

  const analytics = calculateAnalytics();

  if (customerLoading || ordersLoading || billsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.close()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Chat
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Customer Analytics</h1>
              <p className="text-gray-600">Order insights for {customer?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-gray-600">Real-time Analytics</span>
          </div>
        </div>

        {/* Customer Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <User className="h-5 w-5" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-600" />
                <div>
                  <p className="font-semibold">{customer?.name}</p>
                  <p className="text-sm text-gray-600">Customer Name</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-600" />
                <div>
                  <p className="font-semibold">{customer?.phone || 'N/A'}</p>
                  <p className="text-sm text-gray-600">Phone Number</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-600" />
                <div>
                  <p className="font-semibold text-sm">{customer?.address || 'N/A'}</p>
                  <p className="text-sm text-gray-600">Delivery Address</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Summary */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold">{analytics.totalOrders}</p>
                  </div>
                  <ShoppingCart className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold">₹{analytics.totalRevenue.toFixed(2)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Order Value</p>
                    <p className="text-2xl font-bold">₹{analytics.avgOrderValue.toFixed(2)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Since</p>
                    <p className="text-2xl font-bold">
                      {customer?.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detailed Analytics */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="orders">Order History</TabsTrigger>
            <TabsTrigger value="products">Product Analysis</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.monthlyData && Object.keys(analytics.monthlyData).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(analytics.monthlyData).map(([month, data]: [string, any]) => (
                      <div key={month} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-semibold">{month}</h3>
                          <Badge variant="outline">{data.orders} orders</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Revenue</p>
                            <p className="font-bold text-green-600">₹{data.revenue.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Avg Order</p>
                            <p className="font-bold">₹{(data.revenue / data.orders).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No order data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Order History</CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.map((order: any) => (
                      <div key={order.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold">Order #{order.id}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(order.createdAt).toLocaleDateString()} - {new Date(order.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                          <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                            {order.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Total Amount</p>
                            <p className="font-bold">₹{order.totalAmount}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Items</p>
                            <p className="font-bold">{order.items?.length || 0} products</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No orders found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Product Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.productAnalysis && Object.keys(analytics.productAnalysis).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(analytics.productAnalysis).map(([product, data]: [string, any]) => (
                      <div key={product} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-semibold">{product}</h3>
                          <Badge variant="outline">{data.orders} orders</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Total Quantity</p>
                            <p className="font-bold">{data.totalQuantity} units</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Revenue</p>
                            <p className="font-bold text-green-600">₹{data.totalRevenue.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No product data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
              </CardHeader>
              <CardContent>
                {bills.length > 0 ? (
                  <div className="space-y-4">
                    {bills.map((bill: any) => (
                      <div key={bill.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold">Bill #{bill.id}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(bill.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={bill.status === 'paid' ? 'default' : 'secondary'}>
                            {bill.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Amount</p>
                            <p className="font-bold">₹{bill.amount}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Due Date</p>
                            <p className="font-bold">{new Date(bill.dueDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No billing data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}