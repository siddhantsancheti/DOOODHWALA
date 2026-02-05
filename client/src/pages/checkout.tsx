import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
// Get search params from URL
import { CreditCard, Smartphone, Wallet, Check, Banknote, Truck, ArrowLeft } from "lucide-react";

// Initialize Stripe only if key is available
let stripePromise: Promise<any> | null = null;
if (import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface CheckoutProps {
  amount?: number;
  orderId?: string;
  description?: string;
}

const StripeCheckoutForm = ({ amount, orderId, description }: CheckoutProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!stripe || !elements) {
      setLoading(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
      },
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful",
        description: "Your payment has been processed successfully!",
      });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || loading} className="w-full">
        {loading ? "Processing..." : `Pay ₹${amount}`}
      </Button>
    </form>
  );
};

const RazorpayCheckout = ({ amount, orderId, description }: CheckoutProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleRazorpayPayment = async () => {
    setLoading(true);

    try {
      // Create Razorpay order
      const response = await apiRequest("/api/payments/razorpay/create-order", "POST", {
        amount,
        orderId: orderId || `ORDER_${Date.now()}`,
        description,
      });

      const { razorpayOrderId, key } = await response.json();

      if (!key || key === "rzp_test_placeholder") {
        toast({
          title: "Test Mode Active",
          description: "No valid Razorpay key found. Simulating successful payment.",
          duration: 3000,
        });

        // Simulate success for demo purposes
        setTimeout(() => {
          toast({
            title: "Payment Successful",
            description: "Test payment processed successfully!",
          });
        }, 1500);
        setLoading(false);
        return;
      }

      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error("Failed to load payment gateway"));
        });
      }

      if (!window.Razorpay) {
        throw new Error("Payment gateway SDK failed to load");
      }

      // Configure Razorpay options
      const options = {
        key,
        amount: amount! * 100, // Amount in paise
        currency: 'INR',
        name: 'DOOODHWALA',
        description: description || 'Milk Delivery Payment',
        order_id: razorpayOrderId,
        prefill: {
          name: 'Customer',
          email: 'customer@dooodhwala.com',
          contact: '9999999999',
        },
        theme: {
          color: '#2563eb',
        },
        handler: async function (response: any) {
          try {
            // Verify payment
            const verifyResponse = await apiRequest("/api/payments/razorpay/verify", "POST", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            const result = await verifyResponse.json();

            if (result.success) {
              toast({
                title: "Payment Successful",
                description: "Your payment has been processed successfully!",
              });
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            toast({
              title: "Payment Verification Failed",
              description: "Please contact support if money was deducted.",
              variant: "destructive",
            });
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: any) {
      console.error("Payment Error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to initialize payment. Check internet connection.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-blue-600" />
          <span className="font-medium">UPI Payments</span>
          <Badge variant="secondary">Instant</Badge>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {['Google Pay', 'PhonePe', 'Paytm', 'BHIM'].map((app) => (
            <Button
              key={app}
              variant="outline"
              className="h-12 border rounded text-xs hover:bg-blue-50 hover:border-blue-200 transition-all"
              onClick={() => handleRazorpayPayment()}
              disabled={loading}
            >
              {app}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-green-600" />
          <span className="font-medium">Cards & Banking</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['Credit Card', 'Debit Card', 'Net Banking'].map((method) => (
            <Button
              key={method}
              variant="outline"
              className="h-12 border rounded text-xs hover:bg-green-50 hover:border-green-200 transition-all"
              onClick={() => handleRazorpayPayment()}
              disabled={loading}
            >
              {method}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-purple-600" />
          <span className="font-medium">Wallets</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['Paytm Wallet', 'Amazon Pay', 'Mobikwik'].map((wallet) => (
            <Button
              key={wallet}
              variant="outline"
              className="h-12 border rounded text-xs hover:bg-purple-50 hover:border-purple-200 transition-all"
              onClick={() => handleRazorpayPayment()}
              disabled={loading}
            >
              {wallet}
            </Button>
          ))}
        </div>
      </div>

      <Button
        onClick={handleRazorpayPayment}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700"
        size="lg"
      >
        {loading ? "Processing..." : `Pay ₹${amount} with Razorpay`}
      </Button>

      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Check className="h-4 w-4 text-green-500" />
        <span>100% Secure Payment</span>
      </div>
    </div>
  );
};

const CashOnDeliveryCheckout = ({ amount, orderId, description }: CheckoutProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Get customer profile to get the actual customer ID
  const { data: customerProfile } = useQuery({
    queryKey: ["/api/customers/profile"],
    enabled: !!user,
  });

  const handleCODOrder = async () => {
    setLoading(true);

    try {
      // Create COD order with proper customer and milkman IDs
      const response = await apiRequest({
        url: "/api/payments/cod/create-order",
        method: "POST",
        body: {
          amount,
          orderId: orderId || `ORDER_${Date.now()}`,
          customerId: (customerProfile as any)?.id || 0,
          milkmanId: (customerProfile as any)?.assignedMilkmanId || 1,
          description: description || `DOOODHWALA Milk Delivery`,
          customerPhone: user?.phone?.replace('+91', '') || user?.phone,
          deliveryAddress: (customerProfile as any)?.address || "Customer delivery address",
          userId: user?.id
        }
      });

      const result = await response.json();

      if (result.success) {
        const successMessage = result.otpSent
          ? `Order confirmed! OTP sent via ${result.smsOtpSent ? 'SMS' : ''}${result.smsOtpSent && result.chatOtpSent ? ' and ' : ''}${result.chatOtpSent ? 'YD Chat' : ''}. Share OTP ${result.codOTP} with your milkman when paying ₹${amount} in cash.`
          : `Your order for ₹${amount} has been confirmed. Pay ₹${amount} in cash upon delivery.`;

        toast({
          title: "COD Order Created Successfully!",
          description: successMessage,
          duration: 6000,
        });

        // Show OTP details if available
        if (result.codOTP && result.otpSent) {
          toast({
            title: "Payment OTP Generated",
            description: `Your COD OTP is: ${result.codOTP}. This has been sent to you via SMS and YD Chat. Present this to your milkman when paying cash.`,
            duration: 10000,
          });
        }

        // Redirect to customer dashboard after successful COD order
        setTimeout(() => {
          window.location.href = '/customer';
        }, 2000);
      } else {
        throw new Error(result.message || 'Failed to place COD order');
      }
    } catch (error: any) {
      toast({
        title: "Order Failed",
        description: error.message || "Failed to place order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-600 rounded-full">
            <Banknote className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-900 mb-2">Cash on Delivery</h3>
            <p className="text-green-800 text-sm mb-4">
              Pay with cash when your order is delivered. No online payment required.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Check className="h-4 w-4" />
                <span>No payment gateway charges</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Check className="h-4 w-4" />
                <span>Pay only when you receive your order</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Check className="h-4 w-4" />
                <span>Convenient for all customers</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Truck className="h-4 w-4" />
                <span>Available for all delivery locations</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Check className="h-4 w-4" />
                <span>Secure OTP verification for payment confirmation</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <div className="text-orange-600 mt-0.5">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-orange-900">Payment Instructions</h4>
            <p className="text-sm text-orange-800 mt-1">
              1. Keep exact change ready: <strong>₹{amount}</strong><br />
              2. You'll receive an OTP via SMS<br />
              3. Share the OTP with your milkman when paying
            </p>
          </div>
        </div>
      </div>

      <Button
        onClick={handleCODOrder}
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
        size="lg"
      >
        {loading ? "Placing Order..." : `Confirm Cash on Delivery - ₹${amount}`}
      </Button>

      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Check className="h-4 w-4 text-green-500" />
        <span>No payment required now - Pay on delivery</span>
      </div>
    </div>
  );
};

export default function Checkout() {
  const urlParams = new URLSearchParams(window.location.search);
  const amount = parseFloat(urlParams.get('amount') || '100');
  const orderId = urlParams.get('orderId') || `ORDER_${Date.now()}`;
  const paymentType = urlParams.get('type') || 'individual';
  const milkmanId = urlParams.get('milkmanId') || '';
  const defaultTab = urlParams.get('defaultTab') || 'cod';
  const description = paymentType === 'consolidated'
    ? `Consolidated Group Bill - All Members`
    : urlParams.get('description') || 'DOOODHWALA Milk Delivery';

  const [stripeClientSecret, setStripeClientSecret] = useState("");
  const [stripeLoading, setStripeLoading] = useState(false);

  const initializeStripePayment = async () => {
    if (!stripePromise) {
      return;
    }

    setStripeLoading(true);
    try {
      const response = await apiRequest("/api/payments/stripe/create-intent", "POST", {
        amount,
        orderId,
        description,
      });

      const data = await response.json();
      setStripeClientSecret(data.clientSecret);
    } catch (error) {
      console.error("Failed to initialize Stripe payment:", error);
    } finally {
      setStripeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 sm:p-4 mobile-optimized">
      <div className="max-w-2xl mx-auto container-responsive">
        {/* Back Button */}
        <div className="mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.history.back()}
            aria-label="Go back"
            className="bg-white/90 dark:bg-neutral-900/60 backdrop-blur-sm border-2 border-blue-500/20 dark:border-blue-400/20 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-500/5 dark:hover:bg-blue-400/5 shadow-md transition-all duration-200 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span className="sr-only">Back</span>
          </Button>
        </div>

        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 mobile-text-readable">Secure Checkout</h1>
          <p className="text-gray-600 responsive-text-base">Choose your preferred payment method</p>
        </div>

        <Card className="mb-4 sm:mb-6 card-mobile">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">D</span>
                </div>
                <span className="responsive-text-lg font-bold">DOOODHWALA</span>
              </div>
              {paymentType === 'consolidated' && (
                <Badge className="bg-green-600 text-white self-start sm:self-auto">Group Bill</Badge>
              )}
            </CardTitle>
            <CardDescription className="responsive-text-base">{description}</CardDescription>
            {paymentType === 'consolidated' && (
              <div className="mt-2 p-3 bg-green-50 rounded-lg">
                <div className="flex items-start gap-2 responsive-text-sm text-green-800">
                  <Check className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>This payment covers all group members' orders</span>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 responsive-text-lg font-semibold">
              <span>Total Amount:</span>
              <span className="text-blue-600 text-xl sm:text-lg">₹{amount}</span>
            </div>
            {paymentType === 'consolidated' && (
              <p className="responsive-text-sm text-gray-600 mt-3">
                Once paid, this bill will be marked as complete for all group members.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="card-mobile">
          <CardContent className="p-4 sm:p-6">
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-0 h-auto sm:h-10 p-1">
                <TabsTrigger value="cod" className="flex items-center gap-2 py-3 sm:py-2">
                  <Banknote className="h-4 w-4" />
                  <span className="responsive-text-sm">Cash on Delivery</span>
                </TabsTrigger>
                <TabsTrigger value="razorpay" className="flex items-center gap-2 py-3 sm:py-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="responsive-text-sm">UPI & Cards</span>
                </TabsTrigger>
                <TabsTrigger value="stripe" className="flex items-center gap-2 py-3 sm:py-2" disabled={!stripePromise}>
                  <Wallet className="h-4 w-4" />
                  <span className="responsive-text-sm">International</span>
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="cod" className="mt-0">
                  <CashOnDeliveryCheckout amount={amount} orderId={orderId} description={description} />
                </TabsContent>

                <TabsContent value="razorpay" className="mt-0">
                  <RazorpayCheckout amount={amount} orderId={orderId} description={description} />
                </TabsContent>

                <TabsContent value="stripe" className="mt-0">
                  {!stripePromise ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 responsive-text-base">International payments currently unavailable</p>
                      <p className="text-gray-400 responsive-text-sm mt-2">Please use Cash on Delivery or UPI payments</p>
                    </div>
                  ) : stripeLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                    </div>
                  ) : !stripeClientSecret ? (
                    <div className="text-center py-8">
                      <Button onClick={initializeStripePayment} disabled={stripeLoading} className="w-full">
                        {stripeLoading ? "Loading..." : "Initialize Payment"}
                      </Button>
                    </div>
                  ) : (
                    <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
                      <StripeCheckoutForm amount={amount} orderId={orderId} description={description} />
                    </Elements>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Your payment information is encrypted and secure</p>
          <p className="mt-1">Powered by Razorpay & Stripe</p>
        </div>
      </div>
    </div>
  );
}