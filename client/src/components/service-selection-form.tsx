import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Send, X, Star, MapPin, Phone, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ServiceSelectionFormProps {
  milkman: any;
  onClose: () => void;
  onAssignComplete: (milkman: any, selectedServices: any[], selectedDeliverySlots?: any[]) => void;
}

export function ServiceSelectionForm({ milkman, onClose, onAssignComplete }: ServiceSelectionFormProps) {
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [selectedDeliverySlots, setSelectedDeliverySlots] = useState<any[]>([]);
  const { toast } = useToast();

  const availableServices = milkman.dairyItems || [];
  const availableSlots = milkman.deliverySlots?.filter((slot: any) => slot.isAvailable) || [];

  const toggleService = (service: any) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.name === service.name);
      if (exists) {
        return prev.filter(s => s.name !== service.name);
      } else {
        return [...prev, { name: service.name, unit: service.unit }];
      }
    });
  };

  const toggleDeliverySlot = (slot: any) => {
    setSelectedDeliverySlots(prev => {
      const exists = prev.find(s => s.id === slot.id);
      if (exists) {
        return prev.filter(s => s.id !== slot.id);
      } else {
        return [...prev, slot];
      }
    });
  };

  const handleAssignAndRequest = async () => {
    if (selectedServices.length === 0) {
      toast({
        title: "Please Select Services",
        description: "You must select at least one service before assigning a milkman.",
        variant: "destructive",
      });
      return;
    }

    if (selectedDeliverySlots.length === 0) {
      toast({
        title: "Please Select Delivery Slots",
        description: "You must select at least one delivery slot for your orders.",
        variant: "destructive",
      });
      return;
    }

    // Call parent handler with milkman and selected services
    onAssignComplete(milkman, selectedServices, selectedDeliverySlots);
  };

  return (
    <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Select Services from Your New Milkman
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Milkman Profile */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-blue-600">
                {milkman.contactName.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-semibold">{milkman.contactName}</h3>
              <p className="text-gray-600">{milkman.businessName}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-600" />
              <span className="text-sm">{milkman.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-600" />
              <span className="text-sm">{milkman.address}</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">{milkman.rating} ({milkman.totalReviews} reviews)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-green-600">
                Base Price: ₹{milkman.pricePerLiter}/L
              </span>
            </div>
          </div>
        </div>

        {/* Service Selection */}
        <div>
          <h3 className="text-lg font-semibold mb-3">
            Available Services
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Select the services you're interested in. Your milkman will provide personalized pricing for these items.
          </p>

          <div className="grid gap-3">
            {availableServices.map((service: any) => {
              const isSelected = selectedServices.find(s => s.name === service.name);
              return (
                <div
                  key={service.name}
                  className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  onClick={() => toggleService(service)}
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={!!isSelected}
                      onChange={() => toggleService(service)}
                    />
                    <div>
                      <div className="font-medium">{service.name}</div>
                      <div className="text-sm text-gray-500">{service.unit}</div>
                    </div>
                  </div>
                  <Badge variant={service.isAvailable ? "default" : "secondary"}>
                    {service.isAvailable ? "Available" : "Limited"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Slot Selection */}
        <div>
          <h3 className="text-lg font-semibold mb-3">
            Available Delivery Slots
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Select your preferred delivery time slots. You can choose multiple slots for flexibility.
          </p>

          <div className="grid gap-3">
            {milkman.deliverySlots && milkman.deliverySlots.length > 0 ? (
              milkman.deliverySlots
                .filter((slot: any) => slot.isAvailable !== false && slot.isActive !== false)
                .map((slot: any) => {
                  const isSelected = selectedDeliverySlots.find(s => s.id === slot.id);
                  const label = slot.label || `${slot.name} (${slot.startTime} - ${slot.endTime})`;

                  return (
                    <div
                      key={slot.id}
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      onClick={() => toggleDeliverySlot(slot)}
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={!!isSelected}
                          onChange={() => toggleDeliverySlot(slot)}
                        />
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <div>
                            <div className="font-medium">{label}</div>
                          </div>
                        </div>
                      </div>
                      <Badge variant="default">
                        Available
                      </Badge>
                    </div>
                  );
                })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No delivery slots available</p>
                <p className="text-sm">Contact the milkman to set up delivery times</p>
              </div>
            )}
          </div>
        </div>

        {/* Selected Services Summary */}
        {selectedServices.length > 0 && (
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-semibold mb-2">Selected Services:</h4>
            <div className="space-y-1">
              {selectedServices.map((service, index) => (
                <div key={index} className="text-sm">
                  <span>{service.name}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-green-700 mt-2">
              Your milkman will provide personalized pricing for these services.
            </p>
          </div>
        )}

        {/* Selected Delivery Slots Summary */}
        {selectedDeliverySlots.length > 0 && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold mb-2">Selected Delivery Slots:</h4>
            <div className="space-y-1">
              {selectedDeliverySlots.map((slot, index) => (
                <div key={index} className="text-sm flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>{slot.label || `${slot.name} (${slot.startTime} - ${slot.endTime})`}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-blue-700 mt-2">
              These are your preferred delivery time slots.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleAssignAndRequest}
            className="flex-1"
          >
            <Send className="h-4 w-4 mr-2" />
            {selectedServices.length > 0 && selectedDeliverySlots.length > 0
              ? "Assign Milkman & Request Pricing"
              : "Assign Milkman"
            }
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>

        {/* Info Note */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Note:</strong> After assignment, your milkman will be notified and can provide personalized pricing for your selected services. Your preferred delivery slots will be saved for future orders. You can always modify your preferences later.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}