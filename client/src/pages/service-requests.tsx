import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Clock, CheckCircle, XCircle, DollarSign, ShoppingCart, Edit, Save, X, Plus, Minus } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLanguage, getTranslatedText } from '@/hooks/useLanguage';
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import type { ServiceRequest } from "@shared/schema";

export default function ServiceRequestsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [editingRequest, setEditingRequest] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});

  const { data: serviceRequests, isLoading } = useQuery<ServiceRequest[]>({
    queryKey: ["/api/service-requests/customer"],
    enabled: !!user,
  });

  const acceptQuoteMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await fetch(`/api/service-requests/${requestId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'accepted' }),
      });
      if (!response.ok) throw new Error('Failed to accept quote');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: getTranslatedText("Quote Accepted!", language),
        description: getTranslatedText("The milkman has been notified of your acceptance.", language),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests/customer"] });
    },
    onError: (error: any) => {
      toast({
        title: getTranslatedText("Error", language),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectQuoteMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const response = await fetch(`/api/service-requests/${requestId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      if (!response.ok) throw new Error('Failed to reject quote');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: getTranslatedText("Quote Rejected", language),
        description: getTranslatedText("The milkman has been notified of your decision.", language),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests/customer"] });
    },
    onError: (error: any) => {
      toast({
        title: getTranslatedText("Error", language),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ requestId, data }: { requestId: number; data: any }) => {
      const response = await apiRequest(`/api/service-requests/${requestId}`, 'PATCH', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: getTranslatedText("Request Updated!", language),
        description: getTranslatedText("Your service request has been updated successfully.", language),
      });
      setEditingRequest(null);
      setEditData({});
      queryClient.invalidateQueries({ queryKey: ["/api/service-requests/customer"] });
    },
    onError: (error: any) => {
      toast({
        title: getTranslatedText("Error", language),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditRequest = (request: any) => {
    setEditingRequest(request.id);
    setEditData({
      services: request.services,
      customerNotes: request.customerNotes || '',
    });
  };

  const handleSaveEdit = () => {
    if (editingRequest) {
      updateRequestMutation.mutate({
        requestId: editingRequest,
        data: editData,
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingRequest(null);
    setEditData({});
  };

  const updateServiceQuantity = (serviceIndex: number, quantity: number) => {
    const updatedServices = [...editData.services];
    updatedServices[serviceIndex] = {
      ...updatedServices[serviceIndex],
      quantity: quantity || 1
    };
    setEditData({ ...editData, services: updatedServices });
  };

  const removeService = (serviceIndex: number) => {
    const updatedServices = editData.services.filter((_: any, index: number) => index !== serviceIndex);
    setEditData({ ...editData, services: updatedServices });
  };

  const addService = () => {
    const newService = {
      name: "",
      unit: "",
      quantity: 1
    };
    const updatedServices = [...editData.services, newService];
    setEditData({ ...editData, services: updatedServices });
  };

  const updateServiceDetails = (serviceIndex: number, field: string, value: string) => {
    const updatedServices = [...editData.services];
    updatedServices[serviceIndex] = {
      ...updatedServices[serviceIndex],
      [field]: value
    };
    setEditData({ ...editData, services: updatedServices });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1 font-medium tracking-wide px-3 py-1">
          <Clock className="h-3 w-3" />
          {getTranslatedText("Pending", language)}
        </Badge>;
      case 'quoted':
        return <Badge className="flex items-center gap-1 font-medium tracking-wide px-3 py-1 bg-blue-600 hover:bg-blue-700 transition-colors">
          <DollarSign className="h-3 w-3" />
          {getTranslatedText("Quote Received", language)}
        </Badge>;
      case 'accepted':
        return <Badge variant="default" className="flex items-center gap-1 bg-green-600 hover:bg-green-700 font-medium tracking-wide px-3 py-1 transition-colors">
          <CheckCircle className="h-3 w-3" />
          {getTranslatedText("Accepted", language)}
        </Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1 font-medium tracking-wide px-3 py-1">
          <XCircle className="h-3 w-3" />
          {getTranslatedText("Rejected", language)}
        </Badge>;
      default:
        return <Badge variant="secondary" className="font-medium tracking-wide px-3 py-1">{status}</Badge>;
    }
  };

  const calculateTotal = (services: any[]) => {
    return services.reduce((total, service) => {
      const price = parseFloat(service.quotedPrice || service.price || 0);
      const quantity = service.requestedQuantity || 1;
      return total + (price * quantity);
    }, 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="relative flex items-center">
            <Button variant="ghost" size="sm" onClick={() => setLocation('/your-doodhwala')} className="absolute left-0 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2 py-1">
              <ArrowLeft className="h-3 w-3 mr-1" />
              Back
            </Button>
            <div className="flex-1 text-center">
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent dark:from-blue-400 dark:via-purple-400 dark:to-blue-300 tracking-tight">{getTranslatedText("Service Requests", language)}</h1>
              <p className="text-gray-600 dark:text-gray-300 font-medium tracking-wide mt-1">{getTranslatedText("Track your custom pricing requests", language)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {!serviceRequests || !Array.isArray(serviceRequests) || serviceRequests.length === 0 ? (
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-2xl font-bold mb-3 text-gray-900 dark:text-gray-100 tracking-tight">{getTranslatedText("No Service Requests", language)}</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 font-medium leading-relaxed">
                {getTranslatedText("You haven't made any service requests yet. Request custom pricing from your assigned milkman.", language)}
              </p>
              <Button onClick={() => setLocation('/your-doodhwala')} className="font-semibold tracking-wide px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-200">
                {getTranslatedText("Go to Your Doodhwala", language)}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Array.isArray(serviceRequests) && serviceRequests.map((request: any) => (
              <Card key={request.id} className="shadow-lg border-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                        {getTranslatedText("Service Request", language)} #{request.id}
                      </CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
                        {getTranslatedText("Requested on", language)} {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(request.status)}
                      {request.status === 'pending' && editingRequest !== request.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRequest(request)}
                          className="font-medium transition-colors"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          {getTranslatedText("Edit", language)}
                        </Button>
                      )}
                      {editingRequest === request.id && (
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={updateRequestMutation.isPending}
                            className="font-medium transition-colors text-xs sm:text-sm px-2 sm:px-3 py-1"
                          >
                            <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            {getTranslatedText("Save", language)}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancelEdit}
                            className="font-medium transition-colors text-xs sm:text-sm px-2 sm:px-3 py-1"
                          >
                            <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            {getTranslatedText("Cancel", language)}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Services */}
                  <div>
                    <h4 className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100 tracking-tight">{getTranslatedText("Requested Services", language)}:</h4>
                    <div className="space-y-2">
                      {(editingRequest === request.id ? editData.services : request.services).map((service: any, index: number) => (
                        <div key={index} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                          {editingRequest === request.id ? (
                            <div className="space-y-3">
                              {/* Service Name and Unit in editing mode */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-sm text-gray-600 dark:text-gray-400 mb-1">{getTranslatedText("Service Name", language)}</Label>
                                  <Input
                                    placeholder={getTranslatedText("Service name", language)}
                                    value={service.name || ""}
                                    onChange={(e) => updateServiceDetails(index, 'name', e.target.value)}
                                    className="text-sm border-green-300 bg-white"
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm text-gray-600 dark:text-gray-400 mb-1">{getTranslatedText("Unit Price", language)}</Label>
                                  <Input
                                    placeholder={getTranslatedText("Price per unit", language)}
                                    value={service.unit || ""}
                                    onChange={(e) => updateServiceDetails(index, 'unit', e.target.value)}
                                    className="text-sm border-green-300 bg-white"
                                  />
                                </div>
                              </div>

                              {/* Quantity controls */}
                              <div className="flex items-center gap-2">
                                <Label className="text-sm text-gray-600 dark:text-gray-400">{getTranslatedText("Quantity", language)}:</Label>
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-6 w-6 p-0 border-green-300 text-green-700 hover:bg-green-100"
                                    onClick={() => updateServiceQuantity(index, Math.max(1, (service.quantity || service.requestedQuantity || 1) - 1))}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <Input
                                    type="number"
                                    value={service.quantity || service.requestedQuantity || 1}
                                    onChange={(e) => updateServiceQuantity(index, parseInt(e.target.value) || 1)}
                                    className="w-16 h-6 text-xs text-center border-green-300 bg-white"
                                    min="1"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-6 w-6 p-0 border-green-300 text-green-700 hover:bg-green-100"
                                    onClick={() => updateServiceQuantity(index, (service.quantity || service.requestedQuantity || 1) + 1)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-6 w-6 p-0 border-red-300 text-red-700 hover:bg-red-100 ml-2"
                                    onClick={() => removeService(index)}
                                    title={getTranslatedText("Remove service", language)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Non-editing view */
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <span className="font-semibold text-gray-900 dark:text-gray-100 tracking-wide">{service.name}</span>
                                <div className="flex items-center gap-2 mt-2">
                                  <Label className="text-sm text-gray-600 dark:text-gray-400">{getTranslatedText("Quantity", language)}:</Label>
                                  <span className="text-sm text-gray-600 dark:text-gray-300">
                                    × {service.quantity || service.requestedQuantity || 1}
                                  </span>
                                </div>
                              </div>
                              {service.quotedPrice && (
                                <div className="text-right">
                                  <div className="font-bold text-gray-900 dark:text-gray-100">
                                    ₹{service.quotedPrice} {service.unit}
                                  </div>
                                  <div className="text-sm text-gray-600 dark:text-gray-300">
                                    {getTranslatedText("Total", language)}: ₹{(parseFloat(service.quotedPrice) * (service.quantity || service.requestedQuantity || 1)).toFixed(2)}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {editingRequest === request.id && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full border-dashed border-green-300 text-green-700 hover:bg-green-50 mt-3"
                          onClick={addService}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {getTranslatedText("Add Service", language)}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <h4 className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100 tracking-tight">{getTranslatedText("Your Notes", language)}:</h4>
                    {editingRequest === request.id ? (
                      <div>
                        <Label className="text-sm text-gray-600 dark:text-gray-400">{getTranslatedText("Additional notes or requirements", language)}</Label>
                        <Textarea
                          value={editData.customerNotes || ""}
                          onChange={(e) => setEditData({ ...editData, customerNotes: e.target.value })}
                          className="mt-2"
                          placeholder={getTranslatedText("Enter any special requirements or notes...", language)}
                          rows={3}
                        />
                      </div>
                    ) : request.customerNotes ? (
                      <p className="text-sm text-gray-600 dark:text-gray-300 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm font-medium leading-relaxed">
                        {request.customerNotes}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        {getTranslatedText("No notes provided", language)}
                      </p>
                    )}
                  </div>

                  {/* Milkman Response */}
                  {request.milkmanNotes && (
                    <div>
                      <h4 className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100 tracking-tight">{getTranslatedText("Milkman's Response", language)}:</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow-sm font-medium leading-relaxed border-l-4 border-blue-500">
                        {request.milkmanNotes}
                      </p>
                    </div>
                  )}

                  {/* Quote Summary */}
                  {request.status === 'quoted' && (
                    <div>
                      <Separator className="my-6 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">{getTranslatedText("Total Quote", language)}:</span>
                        <span className="text-2xl font-extrabold text-green-600 dark:text-green-400 tracking-tight">
                          ₹{calculateTotal(request.services).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => acceptQuoteMutation.mutate(request.id)}
                          disabled={acceptQuoteMutation.isPending}
                          className="flex-1 font-semibold tracking-wide text-white shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {getTranslatedText("Accept Quote", language)}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => rejectQuoteMutation.mutate(request.id)}
                          disabled={rejectQuoteMutation.isPending}
                          className="flex-1 font-semibold tracking-wide border-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          {getTranslatedText("Reject Quote", language)}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Status Timeline */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Clock className="h-4 w-4" />
                      <span>
                        {request.status === 'pending' && getTranslatedText('Waiting for milkman response...', language)}
                        {request.status === 'quoted' && `${getTranslatedText('Quote provided on', language)} ${new Date(request.quotedAt).toLocaleDateString()}`}
                        {request.status === 'accepted' && `${getTranslatedText('Accepted on', language)} ${new Date(request.respondedAt).toLocaleDateString()}`}
                        {request.status === 'rejected' && `${getTranslatedText('Rejected on', language)} ${new Date(request.respondedAt).toLocaleDateString()}`}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}