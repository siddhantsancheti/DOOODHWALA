
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle, Navigation, BellRing } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface DeliveryModeProps {
    customers: any[];
}

export function DeliveryMode({ customers }: DeliveryModeProps) {
    const { toast } = useToast();
    const [activeCustomerIndex, setActiveCustomerIndex] = useState(0);
    const [isDeliveryModeActive, setIsDeliveryModeActive] = useState(false);
    const [sortedCustomers, setSortedCustomers] = useState<any[]>([]);

    useEffect(() => {
        if (customers) {
            const sorted = [...customers].sort((a, b) => (a.routeOrder || 0) - (b.routeOrder || 0));
            setSortedCustomers(sorted);
        }
    }, [customers]);

    const completeDeliveryMutation = useMutation({
        mutationFn: async (customerId: number) => {
            const res = await apiRequest("/api/delivery/complete", "POST", { customerId });
            return await res.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Delivery Completed",
                description: data.notificationSent
                    ? `Marked complete. Notification sent to ${data.nextCustomer?.name || 'next customer'}.`
                    : "Delivery marked complete.",
            });

            // Advance to next customer
            if (activeCustomerIndex < sortedCustomers.length - 1) {
                setActiveCustomerIndex(prev => prev + 1);
            } else {
                setIsDeliveryModeActive(false);
                toast({
                    title: "Route Completed!",
                    description: "All deliveries for this route are done.",
                });
            }
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: "Failed to mark delivery complete.",
                variant: "destructive",
            });
        }
    });

    const startRoute = () => {
        setIsDeliveryModeActive(true);
        setActiveCustomerIndex(0);
        toast({
            title: "Delivery Route Started",
            description: "Focus on the first customer in your list.",
        });
    };

    const skipCustomer = () => {
        if (activeCustomerIndex < sortedCustomers.length - 1) {
            setActiveCustomerIndex(prev => prev + 1);
            toast({
                title: "Customer Skipped",
                description: "Moved to next customer.",
            });

            // Optionally notify next customer even on skip?
            // For now, simple skip.
        }
    };

    const currentCustomer = sortedCustomers[activeCustomerIndex];

    if (!isDeliveryModeActive) {
        return (
            <div className="text-center py-6">
                <p className="text-gray-500 mb-4">
                    Ready to start deliveries? We'll guide you customer by customer and notify them automatically.
                </p>
                <Button onClick={startRoute} className="w-full bg-green-600 hover:bg-green-700 text-white">
                    <Navigation className="mr-2 h-4 w-4" /> Start Delivery Route
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">
                    Delivery {activeCustomerIndex + 1} of {sortedCustomers.length}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setIsDeliveryModeActive(false)} className="text-red-500 text-xs">
                    Exit Mode
                </Button>
            </div>

            {currentCustomer ? (
                <Card className="border-2 border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-900/20">
                    <CardContent className="pt-6">
                        <h3 className="text-lg font-bold text-center mb-1">{currentCustomer.name}</h3>
                        <p className="text-sm text-center text-gray-500 mb-4">{currentCustomer.address}</p>

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                onClick={skipCustomer}
                                className="w-full"
                            >
                                Skip
                            </Button>
                            <Button
                                onClick={() => completeDeliveryMutation.mutate(currentCustomer.id)}
                                className="w-full bg-green-600 hover:bg-green-700"
                                disabled={completeDeliveryMutation.isPending}
                            >
                                {completeDeliveryMutation.isPending ? "Updating..." : (
                                    <>
                                        <CheckCircle className="mr-2 h-4 w-4" /> Complete
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="text-center">No customers found.</div>
            )}

            {/* Up Next Preview */}
            {activeCustomerIndex < sortedCustomers.length - 1 && (
                <div className="text-xs text-gray-400 text-center mt-2">
                    Up Next: {sortedCustomers[activeCustomerIndex + 1].name}
                </div>
            )}
        </div>
    );
}
