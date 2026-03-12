
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { GripVertical, MapPin, Phone } from "lucide-react";

interface RouteManagerProps {
    customers: any[];
}

export function RouteManager({ customers }: RouteManagerProps) {
    const { toast } = useToast();
    const [orderedCustomers, setOrderedCustomers] = useState<any[]>([]);

    useEffect(() => {
        if (customers) {
            // Ensure customers are sorted by routeOrder initially
            const sorted = [...customers].sort((a, b) => (a.routeOrder || 0) - (b.routeOrder || 0));
            setOrderedCustomers(sorted);
        }
    }, [customers]);

    const updateRouteMutation = useMutation({
        mutationFn: async (orderedIds: number[]) => {
            await apiRequest("/api/milkmen/routes", "PATCH", { orderedCustomerIds: orderedIds });
        },
        onSuccess: () => {
            toast({
                title: "Route Updated",
                description: "Delivery route order has been saved.",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/milkmen/customers"] });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: "Failed to update route order.",
                variant: "destructive",
            });
        }
    });

    const onDragEnd = (result: any) => {
        if (!result.destination) {
            return;
        }

        const items = Array.from(orderedCustomers);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setOrderedCustomers(items);

        // Save to server
        const orderedIds = items.map(c => c.id);
        updateRouteMutation.mutate(orderedIds);
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-indigo-600" />
                    Delivery Route Sequence
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                    Drag and drop customers to set your delivery sequence. The "Next Delivery" feature will follow this order.
                </p>

                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="route-list">
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="space-y-2"
                            >
                                {orderedCustomers.map((customer, index) => (
                                    <Draggable key={customer.id} draggableId={customer.id.toString()} index={index}>
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className="flex items-center p-3 bg-white dark:bg-gray-800 border rounded-md shadow-sm"
                                            >
                                                <div {...provided.dragHandleProps} className="mr-3 text-gray-400 cursor-move">
                                                    <GripVertical className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-medium">{index + 1}. {customer.name}</div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                                        <span>{customer.address || "No address"}</span>
                                                    </div>
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {customer.phone && (
                                                        <a href={`tel:${customer.phone}`} className="flex items-center gap-1 text-indigo-600">
                                                            <Phone className="h-3 w-3" /> Call
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </CardContent>
        </Card>
    );
}
