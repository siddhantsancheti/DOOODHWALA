import { Router } from "express";
import { db } from "./db";
import { chatMessages, users, orders, milkmen, products, notifications, customers } from "@shared/schema";
import { eq, or, and, asc, gt, gte, lt } from "drizzle-orm";
import { broadcast } from "./websocket";

const router = Router();

// GET /api/chat/group/:milkmanId
router.get("/group/:milkmanId", async (req, res) => {
    try {
        const milkmanId = parseInt(req.params.milkmanId);

        const messages = await db
            .select()
            .from(chatMessages)
            .where(eq(chatMessages.milkmanId, milkmanId))
            .orderBy(asc(chatMessages.createdAt));

        res.json(messages);
    } catch (error) {
        console.error("Get group messages error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/chat/messages
router.get("/messages", async (req, res) => {
    try {
        const { milkmanId, customerId } = req.query;

        if (!milkmanId || !customerId) {
            return res.status(400).json({ message: "Milkman ID and Customer ID required" });
        }

        const messages = await db
            .select()
            .from(chatMessages)
            .where(
                and(
                    eq(chatMessages.milkmanId, parseInt(milkmanId as string)),
                    eq(chatMessages.customerId, parseInt(customerId as string))
                )
            )
            .orderBy(asc(chatMessages.createdAt));

        res.json(messages);
    } catch (error) {
        console.error("Get messages error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/chat/messages
router.post("/messages", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        const userId = payload.id;

        const {
            milkmanId,
            customerId,
            message,
            senderType,
            messageType = "text",
            orderQuantity,
            orderProduct,
            orderTotal,
            orderItems,
            voiceUrl,
            voiceDuration
        } = req.body;

        const [newMessage] = await db
            .insert(chatMessages)
            .values({
                milkmanId,
                customerId,
                senderId: userId,
                message,
                senderType,
                messageType,
                orderQuantity: orderQuantity ? orderQuantity.toString() : null,
                orderProduct,
                orderTotal: orderTotal ? orderTotal.toString() : null,
                orderItems,
                voiceUrl,
                voiceDuration,
                isRead: false,
            })
            .returning();

        res.json(newMessage);
    } catch (error) {
        console.error("Send message error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/chat/send (Alias for POST /messages)
router.post("/send", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        const userId = payload.id;

        const {
            milkmanId,
            customerId,
            message,
            senderType,
            messageType = "text",
            orderQuantity,
            orderProduct,
            orderTotal,
            orderItems,
            voiceUrl,
            voiceDuration
        } = req.body;

        const [newMessage] = await db
            .insert(chatMessages)
            .values({
                milkmanId,
                customerId,
                senderId: userId,
                message,
                senderType,
                messageType,
                orderQuantity: orderQuantity ? orderQuantity.toString() : null,
                orderProduct,
                orderTotal: orderTotal ? orderTotal.toString() : null,
                orderItems,
                voiceUrl,
                voiceDuration,
                isRead: false,
            })
            .returning();

        res.json(newMessage);
    } catch (error) {
        console.error("Send message error:", error);
        res.status(500).json({ message: "Server error" });
    }
});


// POST /api/chat/messages/:id/accepted
router.post("/messages/:id/accepted", async (req, res) => {
    try {
        const messageId = parseInt(req.params.id);
        if (isNaN(messageId)) {
            return res.status(400).json({ message: "Invalid message ID" });
        }

        const [updatedMessage] = await db
            .update(chatMessages)
            .set({
                isAccepted: true,
                acceptedAt: new Date(),
            })
            .where(eq(chatMessages.id, messageId))
            .returning();

        if (!updatedMessage) {
            return res.status(404).json({ message: "Message not found" });
        }

        res.json(updatedMessage);

        // Create an official order record from this accepted chat request
        if (updatedMessage.orderQuantity) {
            // Fetch milkman's default price first (optimization: could be a join or separate query)
            // For now, simpler separate query to be safe
            const milkman = await db.query.milkmen.findFirst({
                where: eq(milkmen.id, updatedMessage.milkmanId)
            });

            if (milkman) {
                await db.insert(orders).values({
                    milkmanId: updatedMessage.milkmanId,
                    customerId: updatedMessage.customerId,
                    orderedBy: updatedMessage.senderId,
                    quantity: updatedMessage.orderQuantity,
                    pricePerLiter: milkman.pricePerLiter,
                    totalAmount: (parseFloat(updatedMessage.orderQuantity) * parseFloat(milkman.pricePerLiter)).toString(),
                    status: "pending", // Or "confirmed" since it's accepted? Let's say "confirmed" or "pending" delivery
                    deliveryDate: new Date(), // Today
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            }
        }

        // Update inventory in milkmen.dairyItems JSONB (Source of Truth for Dashboard)
        if (updatedMessage.orderProduct && updatedMessage.orderQuantity) {
            try {
                const milkman = await db.query.milkmen.findFirst({
                    where: eq(milkmen.id, updatedMessage.milkmanId)
                });

                if (milkman && milkman.dairyItems) {
                    const dairyItems = milkman.dairyItems as any[];
                    const orderQty = parseFloat(updatedMessage.orderQuantity);
                    const productName = updatedMessage.orderProduct.toLowerCase();

                    // Find and update item
                    const updatedItems = dairyItems.map(item => {
                        if (item.name.toLowerCase() === productName) {
                            const currentQty = parseFloat(item.quantity || "0");
                            const newQty = Math.max(0, currentQty - orderQty);
                            console.log(`Updating JSONB inventory for ${item.name}: ${currentQty} -> ${newQty}`);
                            return { ...item, quantity: newQty };
                        }
                        return item;
                    });

                    // Save back to DB
                    await db
                        .update(milkmen)
                        .set({
                            dairyItems: updatedItems,
                            updatedAt: new Date()
                        })
                        .where(eq(milkmen.id, updatedMessage.milkmanId));

                    // Broadcast inventory update
                    broadcast({
                        type: "inventory_update",
                        milkmanId: updatedMessage.milkmanId,
                        data: {
                            message: `Inventory updated: ${updatedMessage.orderProduct}`,
                            dairyItems: updatedItems
                        }
                    });
                }
            } catch (invError) {
                console.error("Failed to update JSONB inventory:", invError);
            }
        }

        // Notify Customer about Order Acceptance
        if (updatedMessage.senderType === 'customer' && updatedMessage.customerId) {
            try {
                await db.insert(notifications).values({
                    userId: updatedMessage.senderId, // The customer who sent the order
                    title: "Order Accepted",
                    message: `Your order for ${updatedMessage.orderProduct || 'items'} has been accepted.`,
                    type: "order",
                    relatedId: updatedMessage.id, // chat message id
                    isRead: false
                });
            } catch (notifError) {
                console.error("Failed to send notification:", notifError);
            }
        }

        broadcast({
            type: "order_accepted",
            messageId: updatedMessage.id,
            customerId: updatedMessage.customerId,
            milkmanId: updatedMessage.milkmanId
        });

    } catch (error) {
        console.error("Accept order error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/chat/messages/:id/delivered
router.post("/messages/:id/delivered", async (req, res) => {
    try {
        const messageId = parseInt(req.params.id);
        if (isNaN(messageId)) {
            return res.status(400).json({ message: "Invalid message ID" });
        }

        const [updatedMessage] = await db
            .update(chatMessages)
            .set({
                isDelivered: true,
                deliveredAt: new Date(),
                isEditable: false, // Lock editing
            })
            .where(eq(chatMessages.id, messageId))
            .returning();

        if (!updatedMessage) {
            return res.status(404).json({ message: "Message not found" });
        }

        // Update the corresponding order record to 'delivered'
        // We use heuristics since we don't have a direct link (milkmanId, customerId, quantity, pending status)
        if (updatedMessage.orderQuantity) {
            const [updatedOrder] = await db
                .update(orders)
                .set({
                    status: "delivered",
                    deliveredAt: new Date(),
                    updatedAt: new Date()
                })
                .where(
                    and(
                        eq(orders.milkmanId, updatedMessage.milkmanId),
                        updatedMessage.customerId !== null ? eq(orders.customerId, updatedMessage.customerId) : undefined,
                        // eq(orders.orderedBy, updatedMessage.senderId), // Sender might be user ID but orderedBy is also user ID. Secure match.
                        // Actually, simplified check: match quantity and 'pending' status created today
                        eq(orders.quantity, updatedMessage.orderQuantity),
                        eq(orders.status, "pending")
                        // We could also check date but let's assume FIFO or matching quantity on pending is enough for now.
                    )
                )
                .returning();

            if (updatedOrder) {
                console.log(`Order ${updatedOrder.id} confirmed as delivered from chat message ${messageId}`);
            }
        }


        // Check for next customer notification (Route Optimization Feature)
        if (updatedMessage.customerId && updatedMessage.milkmanId) {
            const [currentCustomer] = await db.select().from(customers).where(eq(customers.id, updatedMessage.customerId)).limit(1);

            if (currentCustomer && currentCustomer.routeOrder !== null) {
                const [nextCustomer] = await db.select()
                    .from(customers)
                    .where(and(
                        eq(customers.assignedMilkmanId, updatedMessage.milkmanId),
                        gt(customers.routeOrder, currentCustomer.routeOrder)
                    ))
                    .orderBy(asc(customers.routeOrder))
                    .limit(1);

                if (nextCustomer) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);

                    const [nextOrder] = await db.select()
                        .from(orders)
                        .where(and(
                            eq(orders.milkmanId, updatedMessage.milkmanId),
                            eq(orders.customerId, nextCustomer.id),
                            gte(orders.deliveryDate, today),
                            lt(orders.deliveryDate, tomorrow)
                        ))
                        .limit(1);

                    if (!nextOrder) {
                        // Get milkman user id for sender
                        const [milkmanData] = await db.select().from(milkmen).where(eq(milkmen.id, updatedMessage.milkmanId)).limit(1);
                        if (milkmanData) {
                            // Send proactive chat message
                            await db.insert(chatMessages).values({
                                milkmanId: updatedMessage.milkmanId,
                                customerId: nextCustomer.id,
                                senderId: milkmanData.userId,
                                senderType: "milkman",
                                message: "Hello! I am nearby (at the previous stop). Do you want to place an order today?",
                                messageType: "text",
                                isRead: false
                            });

                            // Also send a push notification
                            await db.insert(notifications).values({
                                userId: nextCustomer.userId,
                                title: "Milkman Nearby",
                                message: "Your milkman is at the previous stop. Place your order now if you haven't!",
                                type: "proximity",
                                isRead: false
                            });

                            console.log(`Proactive notification sent to Customer ${nextCustomer.id}`);
                        }
                    }
                }
            }
        }

        res.json(updatedMessage);

        broadcast({
            type: "order_delivered",
            messageId: updatedMessage.id,
            customerId: updatedMessage.customerId,
            milkmanId: updatedMessage.milkmanId
        });

    } catch (error) {
        console.error("Mark delivered error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
