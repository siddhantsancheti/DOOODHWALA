import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Truck } from "lucide-react";

interface OrderCardProps {
  order: {
    id: number;
    quantity: string;
    totalAmount: string;
    status: string;
    deliveryTime?: string;
    deliveredAt?: string;
    createdAt: string;
  };
}

export function OrderCard({ order }: OrderCardProps) {
  const getStatusIcon = () => {
    switch (order.status) {
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-secondary-green" />;
      case "out_for_delivery":
        return <Truck className="h-4 w-4 text-primary-blue" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (order.status) {
      case "delivered":
        return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400";
      case "out_for_delivery":
        return "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400";
      case "confirmed":
        return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400";
      default:
        return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400";
    }
  };

  const getStatusText = () => {
    switch (order.status) {
      case "delivered":
        return "Delivered";
      case "out_for_delivery":
        return "Out for Delivery";
      case "confirmed":
        return "Confirmed";
      case "pending":
        return "Pending";
      default:
        return order.status;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-gray-600 dark:text-gray-300">{order.quantity}L Milk</span>
        <span className="font-medium text-gray-900 dark:text-gray-100">₹{order.totalAmount}</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {order.status === "delivered" ? "Order delivered" : getStatusText()}
          </span>
        </div>
        
        {order.status === "out_for_delivery" && (
          <div className="flex items-center space-x-2">
            <div className="bg-yellow-400 text-white p-1 rounded-full">
              <Truck className="h-3 w-3" />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-300">Out for delivery</span>
          </div>
        )}
        
        {order.deliveryTime && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Delivery time: {order.deliveryTime}
          </div>
        )}
        
        <Badge className={getStatusColor()}>
          {getStatusText()}
        </Badge>
      </div>
    </div>
  );
}
