import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, Calendar, CreditCard, FileText, Download, Package, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage, getTranslatedText } from '@/hooks/useLanguage';

import type { Customer, Order } from "@shared/schema";

export default function ViewOrders() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { language } = useLanguage();

  const { data: customerProfile, isLoading: profileLoading } = useQuery<Customer>({
    queryKey: ["/api/customers/profile"],
    enabled: !!user,
  });

  const { data: orders } = useQuery<Order[]>({
    queryKey: ["/api/orders/customer"],
    enabled: !!customerProfile,
  });

  const ordersArray = Array.isArray(orders) ? orders : [];
  const pendingOrders = ordersArray.filter((order) => order.status === 'pending' || order.status === 'confirmed');
  const completedOrders = ordersArray.filter((order) => order.status === 'delivered' || order.status === 'completed');

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!customerProfile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2 dark:text-gray-100">{getTranslatedText("Profile Required", language)}</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{getTranslatedText("Please complete your profile to view orders.", language)}</p>
              <Button onClick={() => setLocation('/customer')}>{getTranslatedText("Back to Dashboard", language)}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setLocation('/customer')}
            >
              <ShoppingBag className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-bold dark:text-gray-100">{getTranslatedText("Orders", language)}</h1>
            </div>
            <Button variant="outline" onClick={() => setLocation('/customer')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {getTranslatedText("Back to Dashboard", language)}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">{getTranslatedText("Active Orders", language)}</TabsTrigger>
            <TabsTrigger value="completed">{getTranslatedText("Order History", language)}</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {getTranslatedText("Active Orders", language)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingOrders.length > 0 ? (
                  <div className="space-y-4">
                    {pendingOrders.map((order: any) => (
                      <div key={order.id} className="p-4 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold dark:text-gray-100">Order #{order.id}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              ₹{order.totalAmount}
                            </p>
                            <Badge variant={order.status === 'pending' ? 'secondary' : 'default'}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">{getTranslatedText("Quantity", language)}</p>
                            <p className="font-semibold dark:text-gray-100">{order.quantity}L</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Milk Type</p>
                            <p className="font-semibold dark:text-gray-100">{order.milkType}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">{getTranslatedText("Delivery Time", language)}</p>
                            <p className="font-semibold dark:text-gray-100">{order.deliveryTime}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">{getTranslatedText("Status", language)}</p>
                            <Badge variant={order.status === 'delivered' ? "default" : "secondary"}>
                              {getTranslatedText(order.status.charAt(0).toUpperCase() + order.status.slice(1), language)}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button size="sm" className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            {getTranslatedText("Track Delivery", language)}
                          </Button>
                          <Button size="sm" variant="outline" className="flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            Receipt
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingBag className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2 dark:text-gray-100">{getTranslatedText("No Active Orders", language)}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{getTranslatedText("Place an order to see it here!", language)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Order History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {completedOrders.length > 0 ? (
                  <div className="space-y-4">
                    {completedOrders.map((order: any) => (
                      <div key={order.id} className="p-4 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold dark:text-gray-100">Order #{order.id}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                              ₹{order.totalAmount}
                            </p>
                            <Badge variant="default">Completed</Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Quantity</p>
                            <p className="font-semibold dark:text-gray-100">{order.quantity}L</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Milk Type</p>
                            <p className="font-semibold dark:text-gray-100">{order.milkType}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Delivery Time</p>
                            <p className="font-semibold dark:text-gray-100">{order.deliveryTime}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 dark:text-gray-400">Status</p>
                            <Badge variant="default">Completed</Badge>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline" className="flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            Download Receipt
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2 dark:text-gray-100">No Payment History</h3>
                    <p className="text-gray-600 dark:text-gray-400">Your payment history will appear here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Summary Card */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {orders?.length || 0}
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed Orders</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {completedOrders.length}
                </p>
              </div>
              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Orders</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {pendingOrders.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}