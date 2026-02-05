import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Banknote, CheckCircle, AlertCircle, Shield } from "lucide-react";

interface CODPayment {
  id: number;
  orderId: string;
  amount: string;
  customerPhone?: string;
  description?: string;
  createdAt: string;
  paymentDetails?: string;
}

interface CODOTPVerificationProps {
  codPayments: CODPayment[];
  onPaymentVerified: () => void;
}

export function CODOTPVerification({ codPayments, onPaymentVerified }: CODOTPVerificationProps) {
  const [selectedPayment, setSelectedPayment] = useState<CODPayment | null>(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleVerifyOTP = async (paymentId: number) => {
    if (!otp || otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest("/api/payments/cod/verify-otp", "POST", {
        paymentId,
        otp: otp.trim(),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Payment Verified",
          description: "COD payment verified successfully!",
        });
        setOtp("");
        setSelectedPayment(null);
        onPaymentVerified(); // Refresh the payments list
      } else {
        throw new Error(result.message || 'OTP verification failed');
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message || "Failed to verify OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const parsePaymentDetails = (detailsString?: string) => {
    try {
      return detailsString ? JSON.parse(detailsString) : {};
    } catch {
      return {};
    }
  };

  if (codPayments.length === 0) {
    return (
      <Card className="card-mobile">
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-green-50 rounded-full">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">No Pending COD Payments</h3>
              <p className="text-sm text-gray-600">
                All cash on delivery payments have been verified.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold">COD Payment Verification</h2>
        <Badge variant="secondary">{codPayments.length} pending</Badge>
      </div>

      {codPayments.map((payment) => {
        const details = parsePaymentDetails(payment.paymentDetails);
        const isSelected = selectedPayment?.id === payment.id;

        return (
          <Card key={payment.id} className={`card-mobile ${isSelected ? 'border-blue-200 bg-blue-50' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-green-600" />
                  Order #{payment.orderId}
                </CardTitle>
                <Badge className="bg-orange-100 text-orange-800">
                  ₹{payment.amount}
                </Badge>
              </div>
              <CardDescription className="text-sm">
                {payment.description || 'Cash on Delivery Payment'}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Customer Phone:</span>
                  <p className="font-medium">{payment.customerPhone || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Order Time:</span>
                  <p className="font-medium">{formatDate(payment.createdAt)}</p>
                </div>
              </div>

              {details.codOTP && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-900">OTP Required</p>
                      <p className="text-amber-800">
                        Ask customer for their 6-digit OTP to verify this cash payment.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isSelected ? (
                <div className="space-y-3 border-t pt-4">
                  <div>
                    <Label htmlFor="otp" className="text-sm font-medium">
                      Enter Customer's OTP
                    </Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="mt-1 text-center text-lg font-mono tracking-widest"
                      maxLength={6}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleVerifyOTP(payment.id)}
                      disabled={loading || otp.length !== 6}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {loading ? "Verifying..." : "Verify & Complete Payment"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedPayment(null);
                        setOtp("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setSelectedPayment(payment)}
                  className="w-full"
                >
                  Verify Payment
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}