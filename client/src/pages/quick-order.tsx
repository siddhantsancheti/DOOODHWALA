import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ShoppingCart, MapPin, Star, Filter, ArrowLeft, Plus, Minus, Search, Clock, IndianRupee, Check } from "lucide-react";
import { useLocation } from "wouter";
import type { Customer } from "@shared/schema";

interface CartItem {
  milkmanId: number;
  milkmanName: string;
  productName: string;
  price: number;
  unit: string;
  quantity: number;
  totalPrice: number;
}

export default function QuickOrder() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedMilkman, setSelectedMilkman] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [deliveryTime, setDeliveryTime] = useState("Morning (7-9 AM)");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState("");

  const { data: customerProfile } = useQuery<Customer>({
    queryKey: ["/api/customers/profile"],
    enabled: !!user,
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/products"],
    enabled: !!user,
  });

  const extractLocationParts = (address: string) => {
    const parts = address.split(',').map(part => part.trim());
    return {
      area: parts[0] || '',
      city: parts[1] || '',
      state: parts[2] || '',
      country: parts[3] || ''
    };
  };

  const getCategoryForProduct = (productName: string) => {
    const name = productName.toLowerCase();
    if (name.includes('milk')) return 'milk';
    if (name.includes('butter') || name.includes('ghee')) return 'dairy';
    if (name.includes('curd') || name.includes('yogurt')) return 'dairy';
    if (name.includes('cheese') || name.includes('paneer')) return 'dairy';
    if (name.includes('cream') || name.includes('lassi')) return 'dairy';
    return 'other';
  };

  // Products are now fetched directly from the API
  const allProducts = products;

  // Filter products
  const filteredProducts = allProducts.filter((product: any) => {
    const matchesSearch = searchTerm === "" ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.milkmanName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" ||
      getCategoryForProduct(product.name) === selectedCategory;
    const matchesLocation = locationFilter === "" ||
      product.milkmanAddress.toLowerCase().includes(locationFilter.toLowerCase());
    const matchesPrice = priceFilter === "" ||
      parseFloat(product.price) <= parseFloat(priceFilter);
    return matchesSearch && matchesCategory && matchesLocation && matchesPrice && product.isAvailable;
  });

  // Sort products by rating and same area preference
  const sortedProducts = filteredProducts.sort((a: any, b: any) => {
    if (!customerProfile?.address) return parseFloat(b.milkmanRating) - parseFloat(a.milkmanRating);

    const customer = extractLocationParts(customerProfile.address);
    const aLocation = extractLocationParts(a.milkmanAddress);
    const bLocation = extractLocationParts(b.milkmanAddress);

    const aSameArea = customer.area === aLocation.area;
    const bSameArea = customer.area === bLocation.area;

    if (aSameArea && !bSameArea) return -1;
    if (!aSameArea && bSameArea) return 1;

    return parseFloat(b.milkmanRating) - parseFloat(a.milkmanRating);
  });



  // Cart functions
  const addToCart = (product: any, quantity: number = 1) => {
    const existingItem = cart.find(item =>
      item.milkmanId === product.milkmanId && item.productName === product.name
    );

    if (existingItem) {
      setCart(cart.map(item =>
        item.milkmanId === product.milkmanId && item.productName === product.name
          ? { ...item, quantity: item.quantity + quantity, totalPrice: (item.quantity + quantity) * item.price }
          : item
      ));
    } else {
      const newItem: CartItem = {
        milkmanId: product.milkmanId,
        milkmanName: product.milkmanName,
        productName: product.name,
        price: parseFloat(product.price),
        unit: product.unit,
        quantity,
        totalPrice: parseFloat(product.price) * quantity
      };
      setCart([...cart, newItem]);
    }

    toast({
      title: "Added to Cart",
      description: `${quantity} ${product.name} added to cart`,
    });
  };

  const updateCartQuantity = (milkmanId: number, productName: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(milkmanId, productName);
      return;
    }

    setCart(cart.map(item =>
      item.milkmanId === milkmanId && item.productName === productName
        ? { ...item, quantity: newQuantity, totalPrice: newQuantity * item.price }
        : item
    ));
  };

  const removeFromCart = (milkmanId: number, productName: string) => {
    setCart(cart.filter(item =>
      !(item.milkmanId === milkmanId && item.productName === productName)
    ));
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + item.totalPrice, 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      await apiRequest("/api/orders", "POST", orderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Order Placed",
        description: "Your order has been placed successfully!",
      });
      setCart([]);
      setSpecialInstructions('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePlaceOrder = () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to your cart before placing an order",
        variant: "destructive",
      });
      return;
    }

    // Group cart items by milkman
    const ordersByMilkman = cart.reduce((acc, item) => {
      if (!acc[item.milkmanId]) {
        acc[item.milkmanId] = [];
      }
      acc[item.milkmanId].push(item);
      return acc;
    }, {} as Record<number, CartItem[]>);

    // Create separate orders for each milkman
    Object.entries(ordersByMilkman).forEach(([milkmanId, items]) => {
      const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
      const totalAmount = items.reduce((total, item) => total + item.totalPrice, 0);
      const averagePrice = totalAmount / totalQuantity;

      const orderData = {
        milkmanId: parseInt(milkmanId),
        quantity: totalQuantity.toString(),
        pricePerLiter: averagePrice.toFixed(2),
        milkType: items.map(item => `${item.productName} (${item.quantity})`).join(', '),
        deliveryTime,
        specialInstructions,
        totalAmount: totalAmount.toString(),
        deliveryDate: new Date(),
        status: 'pending'
      };
      createOrderMutation.mutate(orderData);
    });
  };

  if (!customerProfile) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Profile Required</h2>
              <p className="text-muted-foreground mb-4">Please complete your profile to place orders.</p>
              <Button onClick={() => setLocation('/customer')} className="modern-button">
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-surface-secondary border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setLocation('/customer')}
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-brand-primary via-brand-accent to-brand-secondary rounded-xl flex items-center justify-center shadow-xl ring-1 ring-border/20 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/25 dark:from-white/20 to-transparent rounded-xl"></div>
                <ShoppingCart className="h-6 w-6 sm:h-7 sm:w-7 text-white relative z-10 drop-shadow-sm" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-black dark:text-white">Quick Order</h1>
                <p className="text-sm text-muted-foreground">Order any dairy product instantly</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {cart.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-brand-primary/10 rounded-lg">
                  <ShoppingCart className="h-4 w-4 text-brand-primary" />
                  <span className="text-sm font-medium">{getCartItemCount()} items</span>
                  <Badge variant="secondary">₹{getTotalAmount().toFixed(2)}</Badge>
                </div>
              )}
              <Button variant="outline" onClick={() => setLocation('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Products Section */}
          <div className="lg:col-span-2">
            {/* Search and Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products or milkmen..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="milk">Milk</SelectItem>
                      <SelectItem value="curd">Curd & Yogurt</SelectItem>
                      <SelectItem value="butter">Butter & Ghee</SelectItem>
                      <SelectItem value="cheese">Cheese & Paneer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-4 mt-4">
                  <Input
                    placeholder="Filter by location..."
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full sm:w-[200px]"
                  />
                  <Input
                    placeholder="Max price..."
                    value={priceFilter}
                    onChange={(e) => setPriceFilter(e.target.value)}
                    className="w-full sm:w-[150px]"
                    type="number"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedProducts.map((product: any, index: number) => {
                const customer = extractLocationParts(customerProfile.address || "");
                const productLocation = extractLocationParts(product.milkmanAddress);
                const isSameArea = customer.area === productLocation.area;
                const cartItem = cart.find(item =>
                  item.milkmanId === product.milkmanId && item.productName === product.name
                );

                return (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{product.name}</h3>
                          <p className="text-sm text-muted-foreground">{product.milkmanName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{product.milkmanAddress}</span>
                            {isSameArea && (
                              <Badge variant="secondary" className="text-xs">Same Area</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{product.milkmanRating}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1">
                          <IndianRupee className="h-4 w-4 text-brand-primary" />
                          <span className="text-xl font-bold text-brand-primary">{product.price}</span>
                          <span className="text-sm text-muted-foreground">/{product.unit}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{product.deliveryTime}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {cartItem ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateCartQuantity(product.milkmanId, product.name, cartItem.quantity - 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="font-medium px-2">{cartItem.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateCartQuantity(product.milkmanId, product.name, cartItem.quantity + 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => addToCart(product, 1)}
                            className="modern-button flex-1"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add to Cart
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {sortedProducts.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No products found matching your search criteria.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Cart Section */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Your Cart ({getCartItemCount()} items)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                    <p className="text-muted-foreground">Your cart is empty</p>
                    <p className="text-sm text-muted-foreground">Add products to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {cart.map((item, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium">{item.productName}</h4>
                              <p className="text-sm text-muted-foreground">{item.milkmanName}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <IndianRupee className="h-3 w-3 text-brand-primary" />
                                <span className="text-sm">{item.price} × {item.quantity}</span>
                              </div>
                            </div>
                            <span className="font-medium">₹{item.totalPrice.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateCartQuantity(item.milkmanId, item.productName, item.quantity - 1)}
                              className="h-7 w-7 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium px-2">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateCartQuantity(item.milkmanId, item.productName, item.quantity + 1)}
                              className="h-7 w-7 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg font-semibold">Total:</span>
                        <span className="text-xl font-bold text-brand-primary">₹{getTotalAmount().toFixed(2)}</span>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="deliveryTime">Delivery Time</Label>
                          <Select value={deliveryTime} onValueChange={setDeliveryTime}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Morning (7-9 AM)">Morning (7-9 AM)</SelectItem>
                              <SelectItem value="Evening (5-7 PM)">Evening (5-7 PM)</SelectItem>
                              <SelectItem value="ASAP">ASAP</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="instructions">Special Instructions</Label>
                          <Input
                            id="instructions"
                            placeholder="Any special instructions..."
                            value={specialInstructions}
                            onChange={(e) => setSpecialInstructions(e.target.value)}
                          />
                        </div>

                        <Button
                          onClick={handlePlaceOrder}
                          disabled={createOrderMutation.isPending}
                          className="modern-button w-full"
                        >
                          {createOrderMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Placing Order...
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Place Order
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}