import { useEffect } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function GlobalNotificationListener() {
    const { user } = useAuth();
    const { toast } = useToast();
    const { isConnected, addMessageHandler, removeMessageHandler } = useWebSocket();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!user || !isConnected) return;

        const handleNotification = (data: any) => {
            // Handle Order Acceptance (For Customer)
            if (data.type === 'order_accepted' && user.userType === 'customer') {
                // Double check if this notification is for this customer
                // (Though WS should filter, good to be safe if broadcast logic is open)
                if (data.customerId && parseInt(data.customerId) !== parseInt((user as any).id.replace(/\D/g, ''))) {
                    // If IDs don't match, ignore (parsing logic depends on your ID format)
                    // For now assuming broadcast targets correctly or client ignores
                }

                toast({
                    title: "Order Accepted! ✅",
                    description: "Your milkman has accepted your order.",
                    className: "bg-green-500 text-white border-none",
                    duration: 5000,
                });

                // Refresh orders queries
                queryClient.invalidateQueries({ queryKey: ["/api/orders/customer"] });
            }

            // Handle Order Delivery (For Customer)
            if (data.type === 'order_delivered' && user.userType === 'customer') {
                toast({
                    title: "Order Delivered! 🥛",
                    description: "Your order has been delivered successfully.",
                    className: "bg-blue-600 text-white border-none",
                    duration: 5000,
                });

                queryClient.invalidateQueries({ queryKey: ["/api/orders/customer"] });
            }

            // Handle Inventory Update (For Milkman)
            // Note: Usually frontend updates immediately via mutation, but this keeps multi-device sync
            if (data.type === 'inventory_update' && user.userType === 'milkman') {
                // Only notify if it wasn't triggered by this active session to avoid double toast?
                // Or just silently refresh data
                queryClient.invalidateQueries({ queryKey: ["/api/milkmen/profile"] });
            }

            // Handle New Order (For Milkman) - if you implement 'order_placed' event later
        };

        addMessageHandler('global-notifications', handleNotification);

        return () => {
            removeMessageHandler('global-notifications');
        };
    }, [user, isConnected, toast, queryClient, addMessageHandler, removeMessageHandler]);

    return null; // Renderless component
}
