import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Smartphone, University, Banknote } from "lucide-react";
import { useLocation } from "wouter";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  description?: string;
}

export function PaymentModal({ isOpen, onClose, amount, description = "Payment" }: PaymentModalProps) {
  const [, setLocation] = useLocation();

  const paymentMethods = [
    {
      id: "cod",
      name: "Cash on Delivery",
      icon: <Banknote className="h-6 w-6 text-green-600" />,
      description: "Pay when order is delivered",
      recommended: true
    },
    {
      id: "gpay",
      name: "Google Pay",
      icon: <div className="w-6 h-6 bg-blue-500 rounded text-white text-xs flex items-center justify-center">G</div>,
      description: "Pay with Google Pay"
    },
    {
      id: "phonepe",
      name: "PhonePe",
      icon: <Smartphone className="h-6 w-6 text-purple-600" />,
      description: "Pay with PhonePe"
    },
    {
      id: "card",
      name: "Debit/Credit Card",
      icon: <CreditCard className="h-6 w-6 text-blue-600" />,
      description: "Pay with card"
    },
    {
      id: "netbanking",
      name: "Net Banking",
      icon: <University className="h-6 w-6 text-green-600" />,
      description: "Pay with net banking"
    }
  ];

  const handlePaymentMethod = (methodId: string) => {
    if (methodId === "cod") {
      // Redirect to checkout with COD selected
      setLocation(`/checkout?amount=${amount}&description=${encodeURIComponent(description)}&defaultTab=cod`);
      onClose();
    } else if (methodId === "card") {
      // Redirect to Stripe checkout page
      setLocation("/checkout");
      onClose();
    } else {
      // Redirect to checkout for other payment methods
      setLocation(`/checkout?amount=${amount}&description=${encodeURIComponent(description)}`);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Payment Gateway</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Amount Display */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">{description}</span>
                <span className="text-2xl font-bold text-primary-blue">₹{amount}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <Button
                key={method.id}
                variant="outline"
                className={`w-full flex items-center justify-between p-4 h-auto hover:bg-gray-50 ${
                  method.recommended ? 'border-green-200 bg-green-50 hover:bg-green-100' : ''
                }`}
                onClick={() => handlePaymentMethod(method.id)}
              >
                <div className="flex items-center space-x-3">
                  {method.icon}
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${
                        method.recommended ? 'text-green-700' : ''
                      }`}>{method.name}</span>
                      {method.recommended && (
                        <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">Recommended</span>
                      )}
                    </div>
                    <span className={`text-sm ${
                      method.recommended ? 'text-green-600' : 'text-gray-500'
                    }`}>{method.description}</span>
                  </div>
                </div>
                <div className="text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Button>
            ))}
          </div>

          {/* Security Notice */}
          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500 text-center">
              Payments are secured with 256-bit SSL encryption
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
