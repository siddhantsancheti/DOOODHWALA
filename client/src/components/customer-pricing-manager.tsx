import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, IndianRupee } from "lucide-react";
import type { CustomerPricing } from "@shared/schema";

interface CustomerPricingManagerProps {
  milkmanId: number;
}

export function CustomerPricingManager({ milkmanId }: CustomerPricingManagerProps) {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPricing, setEditingPricing] = useState<CustomerPricing | null>(null);

  const { data: pricings, isLoading } = useQuery({
    queryKey: ["/api/milkmen", milkmanId, "customer-pricings"],
    enabled: !!milkmanId,
  });

  const { data: customers } = useQuery({
    queryKey: ["/api/customers"],
  });

  const addPricingMutation = useMutation({
    mutationFn: async (data: { customerId: number; pricePerLiter: string; notes?: string }) => {
      return await apiRequest("/api/customer-pricings", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/milkmen", milkmanId, "customer-pricings"] });
      setIsAddDialogOpen(false);
      toast({
        title: "Success",
        description: "Customer pricing added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePricingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CustomerPricing> }) => {
      return await apiRequest(`/api/customer-pricings/${id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/milkmen", milkmanId, "customer-pricings"] });
      setEditingPricing(null);
      toast({
        title: "Success",
        description: "Customer pricing updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePricingMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/customer-pricings/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/milkmen", milkmanId, "customer-pricings"] });
      toast({
        title: "Success",
        description: "Customer pricing deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (editingPricing) {
      updatePricingMutation.mutate({
        id: editingPricing.id,
        data: {
          pricePerLiter: formData.get("pricePerLiter") as string,
          notes: formData.get("notes") as string,
          isActive: true,
        },
      });
    } else {
      addPricingMutation.mutate({
        customerId: parseInt(formData.get("customerId") as string),
        pricePerLiter: formData.get("pricePerLiter") as string,
        notes: formData.get("notes") as string,
      });
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading customer pricing...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <IndianRupee className="h-5 w-5" />
          Customer Pricing
        </CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Price
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Customer Pricing</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="customerId">Customer</Label>
                <select 
                  name="customerId" 
                  required 
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Select a customer</option>
                  {customers && Array.isArray(customers) && customers.map((customer: any) => (
                    <option key={customer.id} value={customer.id}>
                      Customer #{customer.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="pricePerLiter">Price per Liter (₹)</Label>
                <Input
                  name="pricePerLiter"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="45.00"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  name="notes"
                  placeholder="Special pricing reason or notes..."
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={addPricingMutation.isPending}>
                  {addPricingMutation.isPending ? "Adding..." : "Add Pricing"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {!pricings || !Array.isArray(pricings) || pricings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <IndianRupee className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No custom pricing set yet</p>
            <p className="text-sm">Add special prices for specific customers</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pricings.map((pricing: CustomerPricing) => (
              <div
                key={pricing.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">Customer #{pricing.customerId}</span>
                    <Badge variant={pricing.isActive ? "default" : "secondary"}>
                      {pricing.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-green-600">
                      ₹{pricing.pricePerLiter}/liter
                    </span>
                    {pricing.notes && (
                      <span className="ml-2">• {pricing.notes}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Dialog 
                    open={editingPricing?.id === pricing.id} 
                    onOpenChange={(open) => setEditingPricing(open ? pricing : null)}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Customer Pricing</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <Label>Customer</Label>
                          <Input 
                            value={`Customer #${pricing.customerId}`} 
                            disabled 
                          />
                        </div>
                        <div>
                          <Label htmlFor="pricePerLiter">Price per Liter (₹)</Label>
                          <Input
                            name="pricePerLiter"
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            defaultValue={pricing.pricePerLiter}
                          />
                        </div>
                        <div>
                          <Label htmlFor="notes">Notes (Optional)</Label>
                          <Textarea
                            name="notes"
                            defaultValue={pricing.notes || ""}
                            placeholder="Special pricing reason or notes..."
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" disabled={updatePricingMutation.isPending}>
                            {updatePricingMutation.isPending ? "Updating..." : "Update Pricing"}
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setEditingPricing(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deletePricingMutation.mutate(pricing.id)}
                    disabled={deletePricingMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}