import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar, Clock, MapPin, User, ShoppingCart, Star, Phone, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import type { Milkman, Customer } from "@shared/schema";

const orderSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  deliveryAddress: z.string().min(5, "Address must be at least 5 characters"),
  deliveryDate: z.string().min(1, "Please select a delivery date"),
  deliveryTime: z.string().min(1, "Please select a delivery time"),
  selectedItems: z.array(z.object({
    name: z.string(),
    quantity: z.number().min(1),
    price: z.number(),
    unit: z.string(),
  })).min(1, "Please select at least one item"),
  specialInstructions: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

const deliveryTimeSlots = [
  "06:00-07:00", "07:00-08:00", "08:00-09:00", "09:00-10:00",
  "17:00-18:00", "18:00-19:00", "19:00-20:00", "20:00-21:00"
];

export default function OrderPage() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [milkmanId, setMilkmanId] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: number }>({});

  // Extract milkman ID from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('milkmanId');
    if (id) {
      setMilkmanId(parseInt(id));
    }
  }, []);

  const { data: milkman, isLoading: milkmanLoading } = useQuery<Milkman>({
    queryKey: [`/api/milkmen/${milkmanId}`],
    enabled: !!milkmanId,
  });

  const { data: customerProfile } = useQuery<Customer>({
    queryKey: ['/api/customers/profile'],
    enabled: !!user,
  });

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerName: customerProfile?.name || "",
      deliveryAddress: customerProfile?.address || "",
      deliveryDate: "",
      deliveryTime: "",
      selectedItems: [],
      specialInstructions: "",
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to create order');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Order Placed Successfully!",
        description: "Your order has been placed and the milkman will be notified.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/customer'] });
      setLocation('/customer');
    },
    onError: (error: any) => {
      toast({
        title: "Order Failed",
        description: error.message || "Failed to place order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleItemQuantityChange = (itemName: string, quantity: number) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemName]: quantity,
    }));
  };

  const calculateTotal = () => {
    if (!milkman?.dairyItems) return 0;
    const items = milkman.dairyItems as any[];
    return items.reduce((total: number, item: any) => {
      const quantity = selectedItems[item.name] || 0;
      return total + (quantity * parseFloat(item.price));
    }, 0);
  };

  const onSubmit = (data: OrderFormData) => {
    if (!milkman || !milkman.dairyItems) return;

    const dairyItems = milkman.dairyItems as any[];
    const items = dairyItems.filter((item: any) => selectedItems[item.name] > 0);
    const totalAmount = calculateTotal();

    // Create individual orders for each item
    const orderPromises = items.map((item: any) => {
      const quantity = selectedItems[item.name];
      const itemTotal = quantity * parseFloat(item.price);

      return createOrderMutation.mutate({
        milkmanId: milkman.id,
        quantity: quantity.toString(),
        pricePerLiter: item.price,
        totalAmount: itemTotal.toString(),
        deliveryDate: new Date(data.deliveryDate),
        deliveryTime: data.deliveryTime,
        status: "pending",
        specialInstructions: data.specialInstructions || "",
        itemName: item.name,
      });
    });
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  if (milkmanLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!milkman) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Milkman Not Found</CardTitle>
            <CardDescription>The requested milkman could not be found.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/customer')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => setLocation('/customer')}
              className="mb-4"
            >
              ← Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Place Your Order</h1>
            <p className="text-gray-600">Complete your order details below</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Milkman Info & Services */}
            <div className="space-y-6">
              {/* Milkman Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Milkman Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{milkman.businessName}</h3>
                      <p className="text-gray-600">{milkman.contactName}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      {milkman.phone}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {milkman.address}
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium">{milkman.rating}</span>
                      <span className="text-sm text-gray-500">({milkman.totalReviews} reviews)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-green-600" />
                      <span className="text-sm">
                        Available: {milkman.deliveryTimeStart} - {milkman.deliveryTimeEnd}
                      </span>
                    </div>
                    {milkman.verified && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Services & Pricing */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Services & Pricing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(milkman.dairyItems as any[])?.map((item: any) => (
                      <div key={item.name} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.name}</h4>
                          <p className="text-sm text-gray-600">₹{item.price} {item.unit}</p>
                          <p className="text-xs text-gray-500">
                            {item.isAvailable ? `${item.quantity} available` : 'Out of stock'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleItemQuantityChange(item.name, Math.max(0, (selectedItems[item.name] || 0) - 1))}
                            disabled={!item.isAvailable}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">{selectedItems[item.name] || 0}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleItemQuantityChange(item.name, Math.min(item.quantity, (selectedItems[item.name] || 0) + 1))}
                            disabled={!item.isAvailable || (selectedItems[item.name] || 0) >= item.quantity}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Order Form */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Order Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Customer Name */}
                    <div>
                      <Label htmlFor="customerName">Customer Name</Label>
                      <Input
                        id="customerName"
                        {...form.register('customerName')}
                        placeholder="Enter your name"
                      />
                      {form.formState.errors.customerName && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.customerName.message}
                        </p>
                      )}
                    </div>

                    {/* Delivery Address */}
                    <div>
                      <Label htmlFor="deliveryAddress">Delivery Address</Label>
                      <Textarea
                        id="deliveryAddress"
                        {...form.register('deliveryAddress')}
                        placeholder="Enter complete delivery address"
                        rows={3}
                      />
                      {form.formState.errors.deliveryAddress && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.deliveryAddress.message}
                        </p>
                      )}
                    </div>

                    {/* Delivery Date */}
                    <div>
                      <Label htmlFor="deliveryDate">Delivery Date</Label>
                      <Input
                        id="deliveryDate"
                        type="date"
                        {...form.register('deliveryDate')}
                        min={getTomorrowDate()}
                      />
                      {form.formState.errors.deliveryDate && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.deliveryDate.message}
                        </p>
                      )}
                    </div>

                    {/* Delivery Time */}
                    <div>
                      <Label htmlFor="deliveryTime">Delivery Time</Label>
                      <Select onValueChange={(value) => form.setValue('deliveryTime', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select delivery time" />
                        </SelectTrigger>
                        <SelectContent>
                          {deliveryTimeSlots.map((slot) => (
                            <SelectItem key={slot} value={slot}>
                              {slot}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.deliveryTime && (
                        <p className="text-sm text-red-600 mt-1">
                          {form.formState.errors.deliveryTime.message}
                        </p>
                      )}
                    </div>

                    {/* Special Instructions */}
                    <div>
                      <Label htmlFor="specialInstructions">Special Instructions (Optional)</Label>
                      <Textarea
                        id="specialInstructions"
                        {...form.register('specialInstructions')}
                        placeholder="Any special instructions for delivery..."
                        rows={3}
                      />
                    </div>

                    <Separator />

                    {/* Order Summary */}
                    <div className="space-y-3">
                      <h4 className="font-semibold">Order Summary</h4>
                      {(milkman.dairyItems as any[])?.filter((item: any) => selectedItems[item.name] > 0).map((item: any) => (
                        <div key={item.name} className="flex justify-between text-sm">
                          <span>{item.name} x {selectedItems[item.name]}</span>
                          <span>₹{(selectedItems[item.name] * parseFloat(item.price)).toFixed(2)}</span>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Total Amount</span>
                        <span>₹{calculateTotal().toFixed(2)}</span>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full modern-button"
                      disabled={createOrderMutation.isPending || calculateTotal() === 0}
                    >
                      {createOrderMutation.isPending ? 'Placing Order...' : 'Place Order'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}