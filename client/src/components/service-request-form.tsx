import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Send, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ServiceRequestFormProps {
  milkman: any;
  onClose: () => void;
}

export function ServiceRequestForm({ milkman, onClose }: ServiceRequestFormProps) {
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [customerNotes, setCustomerNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const availableServices = milkman.dairyItems || [];

  const toggleService = (service: any) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.name === service.name);
      if (exists) {
        return prev.filter(s => s.name !== service.name);
      } else {
        return [...prev, { ...service, requestedQuantity: 1 }];
      }
    });
  };

  const updateQuantity = (serviceName: string, quantity: number) => {
    setSelectedServices(prev => 
      prev.map(service => 
        service.name === serviceName 
          ? { ...service, requestedQuantity: Math.max(1, quantity) }
          : service
      )
    );
  };

  const createServiceRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("/api/service-requests", "POST", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Service Request Sent!",
        description: "Your request has been sent to the milkman for pricing.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests/customer"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send service request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (selectedServices.length === 0) {
      toast({
        title: "No Services Selected",
        description: "Please select at least one service before sending the request.",
        variant: "destructive",
      });
      return;
    }

    createServiceRequestMutation.mutate({
      milkmanId: milkman.id,
      services: selectedServices,
      customerNotes,
    });
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Request Custom Pricing
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Milkman Info */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold">{milkman.businessName}</h3>
          <p className="text-sm text-gray-600">Contact: {milkman.contactName}</p>
          <p className="text-sm text-gray-600">Phone: {milkman.phone}</p>
        </div>

        {/* Service Selection */}
        <div>
          <Label className="text-base font-semibold mb-3 block">
            Select Services (Prices will be provided by milkman)
          </Label>
          <div className="grid gap-3">
            {availableServices.map((service: any) => {
              const isSelected = selectedServices.find(s => s.name === service.name);
              return (
                <div
                  key={service.name}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
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
                  <div className="flex items-center gap-2">
                    <Badge variant={service.isAvailable ? "default" : "secondary"}>
                      {service.isAvailable ? "Available" : "Limited"}
                    </Badge>
                    {isSelected && (
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`qty-${service.name}`} className="text-sm">
                          Qty:
                        </Label>
                        <input
                          id={`qty-${service.name}`}
                          type="number"
                          min="1"
                          value={isSelected.requestedQuantity}
                          onChange={(e) => updateQuantity(service.name, parseInt(e.target.value))}
                          className="w-16 p-1 text-sm border rounded text-center"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer Notes */}
        <div>
          <Label htmlFor="notes" className="text-base font-semibold mb-2 block">
            Additional Notes (Optional)
          </Label>
          <Textarea
            id="notes"
            placeholder="Any special requirements or preferred delivery details..."
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        {/* Selected Services Summary */}
        {selectedServices.length > 0 && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold mb-2">Selected Services:</h4>
            <div className="space-y-1">
              {selectedServices.map((service, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{service.name}</span>
                  <span>Quantity: {service.requestedQuantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3">
          <Button
            onClick={handleSubmit}
            disabled={selectedServices.length === 0 || createServiceRequestMutation.isPending}
            className="flex-1"
          >
            <Send className="h-4 w-4 mr-2" />
            {createServiceRequestMutation.isPending ? "Sending..." : "Send Request"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}