import { IndiaMap } from "./india-map";

interface TrackingMapProps {
  customerLocation: { lat: number; lng: number };
  orders: any[];
}

export function TrackingMap({ customerLocation, orders }: TrackingMapProps) {
  if (!orders || orders.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <p className="text-gray-500">No active orders to track</p>
        </div>
      </div>
    );
  }

  const activeOrder = orders[0]; // Use first active order for tracking

  // Mock milkman location (in real app, this would come from GPS)
  const milkmanLocation = {
    lat: customerLocation.lat + 0.01,
    lng: customerLocation.lng + 0.01,
    name: "Rajesh Kumar",
    phone: "+919876543200"
  };

  return (
    <IndiaMap
      customerLocation={customerLocation}
      milkmanLocation={milkmanLocation}
      deliveryStatus="out_for_delivery"
      estimatedTime="8 mins"
      orderDetails={{
        items: [
          { name: activeOrder.product, quantity: activeOrder.quantity, price: activeOrder.totalAmount }
        ],
        total: activeOrder.totalAmount
      }}
      onCallMilkman={() => {
        window.location.href = `tel:${milkmanLocation.phone}`;
      }}
    />
  );
}
