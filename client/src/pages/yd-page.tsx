import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Navbar } from "@/components/navbar";
import { MobileNav } from "@/components/mobile-nav";
import {
  Star,
  Phone,
  Crown,
  Zap,
  Calendar,
  Edit,
  Percent,
  CalendarCheck,
  CreditCard,
  History,
  Headphones,
} from "lucide-react";

import type { Milkman, Customer, Bill } from "@shared/schema";

export default function YDPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orderQuantity, setOrderQuantity] = useState(2);

  const { data: customerProfile } = useQuery<Customer>({
    queryKey: ["/api/customers/profile"],
    enabled: !!user,
  });

  const { data: assignedMilkman } = useQuery<Milkman>({
    queryKey: ["/api/milkmen", customerProfile?.assignedMilkmanId],
    enabled: !!customerProfile?.assignedMilkmanId,
  });

  const { data: currentBill } = useQuery<Bill & { totalOrders: number; totalQuantity: string; discount: string }>({
    queryKey: ["/api/bills/current"],
    enabled: !!customerProfile,
  });

  const { data: milkmen } = useQuery<Milkman[]>({
    queryKey: ["/api/milkmen"],
    enabled: !!user && !customerProfile?.assignedMilkmanId,
  });

  const assignYDMutation = useMutation({
    mutationFn: async (milkmanId: number) => {
      await apiRequest("PATCH", "/api/customers/assign-yd", { milkmanId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers/profile"] });
      toast({
        title: "YD Assigned",
        description: "Your dedicated milkman has been assigned successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const placeOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/orders", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/customer"] });
      toast({
        title: "Order Placed",
        description: "Your one-click order has been placed successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOneClickOrder = () => {
    if (!assignedMilkman) return;

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 1); // Tomorrow

    placeOrderMutation.mutate({
      milkmanId: assignedMilkman.id,
      quantity: orderQuantity,
      pricePerLiter: parseFloat(assignedMilkman.pricePerLiter),
      totalAmount: orderQuantity * parseFloat(assignedMilkman.pricePerLiter),
      deliveryDate: deliveryDate.toISOString(),
      deliveryTime: "07:00-08:00", // Default time as it's not in customer profile
    });
  };

  const handleAssignYD = (milkmanId: number) => {
    assignYDMutation.mutate(milkmanId);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <Navbar />
      <MobileNav />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* YD Header */}
        <div className="text-center mb-12">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-8 rounded-3xl">
            <Star className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Your Doodhwala (YD)</h1>
            <p className="text-xl text-purple-100 max-w-2xl mx-auto">
              Assign your dedicated milkman and enjoy hassle-free daily milk delivery with one-click ordering
            </p>
          </div>
        </div>

        {assignedMilkman ? (
          <>
            {/* YD Status */}
            <Card className="mb-8">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-2xl">👨‍🌾</span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <h2 className="text-2xl font-bold text-gray-900">{assignedMilkman.businessName}</h2>
                        <Badge className="bg-purple-100 text-purple-800">
                          <Crown className="mr-1 h-3 w-3" />
                          Your YD
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span>{parseFloat(assignedMilkman.rating || "0").toFixed(1)} ({assignedMilkman.totalReviews || 0} reviews)</span>
                        </div>
                        <span>•</span>
                        <span>Serving you since March 2024</span>
                      </div>
                      <p className="text-gray-600 mt-2">Your trusted daily milk partner</p>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0 flex flex-col space-y-3">
                    <Button className="bg-purple-600 text-white hover:bg-purple-700">
                      <Phone className="mr-2 h-4 w-4" />
                      Contact YD
                    </Button>
                    <Button variant="outline" className="text-purple-600 border-purple-600 hover:bg-purple-50">
                      Change YD
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* One-Click Ordering */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Quick Order Panel */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">One-Click Daily Order</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Default Order Settings */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Your Regular Order</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">🥛</span>
                          <span>Milk (Fresh)</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-8 h-8 p-0"
                            onClick={() => setOrderQuantity(Math.max(0.5, orderQuantity - 0.5))}
                          >
                            -
                          </Button>
                          <span className="font-medium">{orderQuantity}L</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-8 h-8 p-0"
                            onClick={() => setOrderQuantity(orderQuantity + 0.5)}
                          >
                            +
                          </Button>
                          <span className="font-medium text-gray-900">
                            ₹{(orderQuantity * parseFloat(assignedMilkman.pricePerLiter)).toFixed(0)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>Delivery Time</span>
                        <span>{"7:00 AM - 8:00 AM"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="space-y-3">
                    <Button
                      className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white py-4 text-lg font-semibold hover:from-purple-700 hover:to-purple-800 transform hover:scale-105 transition-all"
                      onClick={handleOneClickOrder}
                      disabled={placeOrderMutation.isPending}
                    >
                      <Zap className="mr-2 h-5 w-5" />
                      {placeOrderMutation.isPending ? "Placing Order..." : "Order for Tomorrow (One-Click)"}
                    </Button>

                    <Button className="w-full modern-button text-white font-semibold py-3 h-auto">
                      <Calendar className="mr-2 h-4 w-4" />
                      Order for Next 7 Days
                    </Button>

                    <Button variant="outline" className="w-full border-purple-600 text-purple-600 hover:bg-purple-50">
                      <Edit className="mr-2 h-4 w-4" />
                      Modify Regular Order
                    </Button>
                  </div>

                  {/* Order History Summary */}
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-medium text-gray-900 mb-3">This Month with YD</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-purple-600">22</p>
                        <p className="text-xs text-gray-600">Orders</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-secondary-green">44L</p>
                        <p className="text-xs text-gray-600">Milk</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-accent-orange">₹1,100</p>
                        <p className="text-xs text-gray-600">Amount</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* YD Billing & Payment */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">YD Monthly Billing</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Current Bill */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">Current Month Bill</h4>
                      <Badge className="bg-purple-600 text-white">Day 22/30</Badge>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Orders completed</span>
                        <span className="font-medium">{currentBill?.totalOrders || 22}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total quantity</span>
                        <span className="font-medium">{currentBill?.totalQuantity || "44L"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium">₹{currentBill?.totalAmount || "1,100"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">YD Loyalty Discount</span>
                        <span className="font-medium text-secondary-green">-₹{currentBill?.discount || "55"}</span>
                      </div>
                      <hr className="border-purple-200" />
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Current Total</span>
                        <span className="text-purple-600">₹{currentBill?.totalAmount || "1,045"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Billing Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Auto-pay on 30th</p>
                        <p className="text-sm text-gray-600">Automatic payment enabled</p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <Button className="w-full modern-button text-white font-semibold py-3 h-auto">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay Current Bill Now
                    </Button>

                    <Button variant="outline" className="w-full">
                      <History className="mr-2 h-4 w-4" />
                      View Billing History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* YD Benefits */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-center">YD Premium Benefits</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="bg-purple-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <Zap className="h-8 w-8 text-purple-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">One-Click Ordering</h4>
                    <p className="text-sm text-gray-600">Order your regular milk with just one tap</p>
                  </div>

                  <div className="text-center">
                    <div className="bg-secondary-green bg-opacity-20 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <Percent className="h-8 w-8 text-secondary-green" />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Loyalty Discounts</h4>
                    <p className="text-sm text-gray-600">5% discount on all orders with your YD</p>
                  </div>

                  <div className="text-center">
                    <div className="bg-primary-blue bg-opacity-20 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <CalendarCheck className="h-8 w-8 text-primary-blue" />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Priority Delivery</h4>
                    <p className="text-sm text-gray-600">Get priority slot for your preferred time</p>
                  </div>

                  <div className="text-center">
                    <div className="bg-accent-orange bg-opacity-20 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <Headphones className="h-8 w-8 text-accent-orange" />
                    </div>
                    <h4 className="font-semibold text-gray-900 mb-2">Dedicated Support</h4>
                    <p className="text-sm text-gray-600">Direct contact with your assigned milkman</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          /* Select YD Section */
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center">Choose Your Doodhwala</CardTitle>
              <p className="text-center text-gray-600">
                Select a milkman to become your dedicated YD for one-click ordering
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {milkmen?.map((milkman: any) => (
                  <Card key={milkman.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-xl">👨‍🌾</span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{milkman.businessName}</h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Star className="h-3 w-3 text-yellow-400 fill-current" />
                              <span>{parseFloat(milkman.rating).toFixed(1)} ({milkman.totalReviews} reviews)</span>
                              <span>•</span>
                              <span>₹{milkman.pricePerLiter}/L</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          className="bg-purple-600 hover:bg-purple-700"
                          onClick={() => handleAssignYD(milkman.id)}
                          disabled={assignYDMutation.isPending}
                        >
                          <Crown className="mr-2 h-4 w-4" />
                          Assign as YD
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
