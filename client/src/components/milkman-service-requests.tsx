import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, DollarSign, User, MessageSquare, Send, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ServiceRequest } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

export default function MilkmanServiceRequests({ milkmanProfile, onCustomerChat }: { milkmanProfile: any, onCustomerChat: (customer: any) => void }) {
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [quotingServices, setQuotingServices] = useState<any[]>([]);
  const [milkmanNotes, setMilkmanNotes] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: serviceRequests = [], isLoading } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/service-requests/milkman"],
    enabled: !!user,
  });

  const provideQuoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/service-requests/${data.requestId}/quote`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          services: data.services,
          notes: data.notes,
        }),
      });
      if (!response.ok) throw new Error('Failed to provide quote');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Quote Sent!",
        description: "Your price quote has been sent to the customer.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests/milkman"] });
      setSelectedRequest(null);
      setQuotingServices([]);
      setMilkmanNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const acceptServiceRequestMutation = useMutation({
    mutationFn: async ({ requestId, services }: { requestId: number; services: any[] }) => {
      const res = await apiRequest(`/api/service-requests/${requestId}/approve`, "POST", { services });
      return res.json();
    },
    onSuccess: async () => {
      // 1. Send automated welcome message - REMOVED to prevent duplicates
      /* 
      if (selectedRequest && milkmanProfile) {
        try {
          await apiRequest("/api/chat/messages", "POST", {
            milkmanId: milkmanProfile.id,
            customerId: selectedRequest.customerId,
            senderType: "milkman",
            message: "Hello! I have accepted your service request and updated the prices. I look forward to serving you! Please let me know if you have any questions.",
            messageType: "text"
          });
        } catch (err) {
          console.error("Failed to send welcome message", err);
        }
      }
      */

      toast({
        title: "Request Accepted",
        description: "Customer has been assigned and notified via chat.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests/milkman"] });
      queryClient.invalidateQueries({ queryKey: ["/api/milkmen/customers"] });

      // Open chat with the customer
      if (selectedRequest?.customer) {
        onCustomerChat(selectedRequest.customer);
      }

      setSelectedRequest(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectServiceRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await apiRequest(`/api/service-requests/${requestId}/reject`, "POST");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Rejected",
        description: "Customer has been notified.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests/milkman"] });
      setSelectedRequest(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openQuoteDialog = (request: any) => {
    setSelectedRequest(request);
    setQuotingServices(request.services.map((service: any) => ({
      ...service,
      quotedPrice: service.price || "",
    })));
    setMilkmanNotes("");
  };

  const updateQuotedPrice = (serviceIndex: number, price: string) => {
    setQuotingServices(prev =>
      prev.map((service, index) =>
        index === serviceIndex ? { ...service, quotedPrice: price } : service
      )
    );
  };

  const handleSubmitQuote = () => {
    // Validate all services have quoted prices
    const invalidServices = quotingServices.filter(service => !service.quotedPrice || parseFloat(service.quotedPrice) <= 0);
    if (invalidServices.length > 0) {
      toast({
        title: "Missing Prices",
        description: "Please provide valid prices for all services.",
        variant: "destructive",
      });
      return;
    }

    provideQuoteMutation.mutate({
      requestId: selectedRequest.id,
      services: quotingServices,
      notes: milkmanNotes,
    });
  };

  const calculateTotal = (services: any[]) => {
    return services.reduce((total, service) => {
      const price = parseFloat(service.quotedPrice || 0);
      const quantity = service.requestedQuantity || 1;
      return total + (price * quantity);
    }, 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending Response
        </Badge>;
      case 'quoted':
        return <Badge className="flex items-center gap-1">
          <DollarSign className="h-3 w-3" />
          Quote Sent
        </Badge>;
      case 'accepted':
        return <Badge variant="default" className="flex items-center gap-1 bg-green-600">
          Accepted
        </Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1">
          Rejected
        </Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Service Requests</h2>
        <Badge variant="outline">
          {serviceRequests?.filter((r: any) => r.status === 'pending').length || 0} Pending
        </Badge>
      </div>

      {!serviceRequests || serviceRequests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Service Requests</h3>
            <p className="text-gray-600">
              You haven't received any service requests yet. Customers will be able to request custom pricing for your services.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {serviceRequests.map((request: any) => (
            <Card key={request.id} className="overflow-hidden border-l-4 border-l-blue-500">
              <CardHeader className="bg-gray-50/50 pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-lg font-bold text-blue-600">
                        {request.customer?.name?.charAt(0) || 'C'}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-gray-900">
                        {request.customer?.name || "Unknown Customer"}
                      </CardTitle>
                      <div className="flex flex-col gap-1 mt-1">
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Requested on {new Date(request.createdAt).toLocaleDateString()}
                        </span>
                        {request.customer?.phone && (
                          <span className="text-sm text-gray-500">
                            Phone: {request.customer.phone}
                          </span>
                        )}
                        {request.customer?.address && (
                          <span className="text-xs text-gray-400 truncate max-w-[200px]" title={request.customer.address}>
                            {request.customer.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Services */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Requested Services</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {request.services.map((service: any, index: number) => (
                      <div key={index} className="flex flex-col justify-between p-3 bg-white border rounded-lg shadow-sm hover:border-blue-300 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold text-gray-900">{service.name}</span>
                          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                            {service.requestedQuantity} {service.unit}
                          </Badge>
                        </div>
                        {service.quotedPrice ? (
                          <div className="mt-auto text-right">
                            <div className="font-bold text-blue-600">
                              ₹{service.quotedPrice}/{service.unit}
                            </div>
                            <div className="text-xs text-gray-500">
                              Total: ₹{(parseFloat(service.quotedPrice) * service.requestedQuantity).toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-auto pt-2 text-xs text-gray-400 italic">
                            Price pending
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer Notes */}
                {request.customerNotes && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Customer Note</h4>
                    <p className="text-sm text-gray-700 p-3 bg-yellow-50 border border-yellow-100 rounded-md">
                      "{request.customerNotes}"
                    </p>
                  </div>
                )}

                {/* Milkman Response */}
                {request.milkmanNotes && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Your Response</h4>
                    <p className="text-sm text-gray-600 p-3 bg-blue-50 border border-blue-100 rounded-md">
                      {request.milkmanNotes}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t mt-4">
                  {request.status === 'pending' && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button onClick={() => openQuoteDialog(request)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                          <DollarSign className="h-4 w-4 mr-2" />
                          Review & Set Price
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Review Service Request</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                          {/* Request Summary in Dialog */}
                          <div className="bg-gray-50 p-4 rounded-lg flex items-start gap-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                              <span className="font-bold text-blue-600">{request.customer?.name?.charAt(0)}</span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{request.customer?.name}</h4>
                              <p className="text-sm text-gray-600">{request.customer?.phone}</p>
                            </div>
                          </div>

                          <div>
                            <Label className="text-base font-semibold mb-3 block">
                              Set Your Prices
                            </Label>
                            <div className="space-y-3">
                              {quotingServices.map((service, index) => (
                                <div key={index} className="flex items-center gap-4 p-3 border rounded hover:bg-gray-50 transition-colors">
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">{service.name}</div>
                                    <div className="text-sm text-gray-500">
                                      Req: {service.requestedQuantity} {service.unit}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Label htmlFor={`price-${index}`} className="text-gray-500">₹</Label>
                                    <Input
                                      id={`price-${index}`}
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      value={service.quotedPrice}
                                      onChange={(e) => updateQuotedPrice(index, e.target.value)}
                                      className="w-24 text-right font-mono"
                                    />
                                    <span className="text-sm text-gray-500 w-12">/{service.unit}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="notes" className="text-base font-semibold mb-2 block">
                              Note to Customer (Optional)
                            </Label>
                            <Textarea
                              id="notes"
                              placeholder="e.g., Delivery starts tomorrow morning..."
                              value={milkmanNotes}
                              onChange={(e) => setMilkmanNotes(e.target.value)}
                              className="min-h-[80px]"
                            />
                          </div>

                          <div className="p-4 bg-blue-50 rounded-lg flex justify-between items-center border border-blue-100">
                            <div>
                              <span className="text-sm font-medium text-blue-900 uppercase tracking-wide">Monthly Estimate</span>
                              <p className="text-xs text-blue-600 mt-0.5">*based on 30 days</p>
                            </div>
                            <span className="text-2xl font-bold text-blue-700">
                              ₹{(calculateTotal(quotingServices) * 30).toFixed(2)}
                            </span>
                          </div>

                          <div className="flex gap-4 pt-2">
                            <Button
                              variant="outline"
                              onClick={() => rejectServiceRequestMutation.mutate(request.id)}
                              disabled={rejectServiceRequestMutation.isPending}
                              className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                            >
                              Decline Request
                            </Button>
                            <Button
                              onClick={() => acceptServiceRequestMutation.mutate({
                                requestId: request.id,
                                services: quotingServices
                              })}
                              disabled={acceptServiceRequestMutation.isPending}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Accept & Assign
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  {request.status === 'quoted' && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-full">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      Quote sent • Total: <span className="font-semibold text-gray-900">₹{calculateTotal(request.services).toFixed(2)}</span>
                    </div>
                  )}
                  {request.status === 'accepted' && (
                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-full border border-green-100">
                      <CheckCircle className="w-4 h-4" />
                      Order Accepted • <span className="font-semibold">₹{calculateTotal(request.services).toFixed(2)}</span>
                    </div>
                  )}
                  {request.status === 'rejected' && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-full border border-red-100">
                      <span>Refused</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}