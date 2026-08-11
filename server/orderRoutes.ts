import { Router } from "express";
import { db } from "./db";
import { orders, customers, milkmen, notifications, chatMessages } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { type AuthRequest } from "./middleware/auth";
import { broadcast } from "./websocket";
import { partyUserIds } from "./services/wsParties";

const router = Router();

// GET /api/orders/customer
router.get("/customer", async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;

        const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, userId))
            .limit(1);

        if (!customer) {
            return res.status(404).json({ message: "Customer profile not found" });
        }

        const customerOrders = await db
            .select()
            .from(orders)
            .where(eq(orders.customerId, customer.id))
            .orderBy(desc(orders.createdAt));

        res.json(customerOrders);
    } catch (error) {
        console.error("Get customer orders error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/orders/customer/:customerId (for milkmen to view their own customer's orders)
router.get("/customer/:customerId", async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const customerId = parseInt(req.params.customerId);
        if (isNaN(customerId)) {
            return res.status(400).json({ message: "Invalid customer ID" });
        }

        // Authorization: verify the requesting milkman owns this customer
        const [milkman] = await db
            .select()
            .from(milkmen)
            .where(eq(milkmen.userId, userId))
            .limit(1);

        if (milkman) {
            const [customer] = await db
                .select()
                .from(customers)
                .where(eq(customers.id, customerId))
                .limit(1);

            if (customer && customer.assignedMilkmanId !== milkman.id) {
                return res.status(403).json({ message: "Not authorized to view this customer's orders" });
            }
        }

        const customerOrders = await db
            .select()
            .from(orders)
            .where(eq(orders.customerId, customerId))
            .orderBy(desc(orders.createdAt));

        res.json(customerOrders);
    } catch (error) {
        console.error("Get specific customer orders error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/orders/milkman
router.get("/milkman", async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;

        const [milkman] = await db
            .select()
            .from(milkmen)
            .where(eq(milkmen.userId, userId))
            .limit(1);

        if (!milkman) {
            return res.status(404).json({ message: "Milkman profile not found" });
        }

        const milkmanOrders = await db
            .select()
            .from(orders)
            .where(eq(orders.milkmanId, milkman.id))
            .orderBy(desc(orders.createdAt));

        res.json(milkmanOrders);
    } catch (error) {
        console.error("Get milkman orders error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/orders
router.post("/", async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const { milkmanId, quantity, pricePerLiter, deliveryDate, deliveryTime, specialInstructions, itemName } = req.body;

        const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, userId))
            .limit(1);

        if (!customer) {
            return res.status(400).json({ message: "Complete your profile before ordering" });
        }

        const totalAmount = (parseFloat(quantity) * parseFloat(pricePerLiter)).toString();

        // Every order must also appear in the chat conversation. The milkman's
        // delivery run is built from chat order messages, and the subscription
        // and daily-preset jobs already post one — an order placed here with no
        // message would be invisible to the milkman and impossible to mark
        // delivered.
        const [orderMessage] = await db
            .insert(chatMessages)
            .values({
                customerId: customer.id,
                milkmanId,
                senderId: userId,
                senderType: "customer",
                message: `${quantity} ${itemName ? `× ${itemName}` : "L"}`
                    + (specialInstructions ? ` (${specialInstructions})` : ""),
                messageType: "order",
                orderQuantity: quantity.toString(),
                orderProduct: itemName || null,
                orderTotal: totalAmount,
            })
            .returning();

        const [newOrder] = await db
            .insert(orders)
            .values({
                customerId: customer.id,
                milkmanId,
                orderedBy: userId,
                quantity: quantity.toString(),
                pricePerLiter: pricePerLiter.toString(),
                totalAmount,
                status: "pending",
                deliveryDate: new Date(deliveryDate),
                deliveryTime,
                // Tag links this order to the message, so marking the message
                // delivered updates exactly this order. The customer's own note
                // is kept on the message above rather than lost.
                specialInstructions: `chatMsg:${orderMessage.id}`,
            })
            .returning();

        res.json(newOrder);

        // Let the milkman's delivery run and chat update without a refresh.
        broadcast({
            type: "new_message",
            message: orderMessage,
            customerId: customer.id,
            milkmanId,
        }, await partyUserIds({ customerId: customer.id, milkmanId }));

        // Notify Milkman about New Order
        try {
            const [milkman] = await db
                .select()
                .from(milkmen)
                .where(eq(milkmen.id, milkmanId))
                .limit(1);

            if (milkman) {
                await db.insert(notifications).values({
                    userId: milkman.userId,
                    title: "New Order Received",
                    message: `New order for ${quantity}L milk from a customer.`,
                    type: "order",
                    relatedId: newOrder.id,
                    isRead: false
                });
            }
        } catch (notifError) {
            console.error("Failed to send notification:", notifError);
        }
    } catch (error) {
        console.error("Create order error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /api/orders/:id/status
router.patch("/:id/status", async (req: AuthRequest, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const { status } = req.body;

        if (isNaN(orderId) || !status) {
            return res.status(400).json({ message: "Invalid request parameters" });
        }

        const userId = req.user!.id;

        // Verify the milkman owns this order
        const [milkman] = await db
            .select()
            .from(milkmen)
            .where(eq(milkmen.userId, userId))
            .limit(1);

        if (!milkman) {
            return res.status(403).json({ message: "Only milkmen can update order status" });
        }

        const [existingOrder] = await db
            .select()
            .from(orders)
            .where(eq(orders.id, orderId))
            .limit(1);

        if (!existingOrder || existingOrder.milkmanId !== milkman.id) {
            return res.status(404).json({ message: "Order not found or unauthorized" });
        }

        const [updatedOrder] = await db
            .update(orders)
            .set({
                status,
                deliveredAt: status === "delivered" ? new Date() : existingOrder.deliveredAt,
                updatedAt: new Date()
            })
            .where(eq(orders.id, orderId))
            .returning();

        // Notify customer
        try {
            const [customer] = await db.select().from(customers).where(eq(customers.id, updatedOrder.customerId ?? -1)).limit(1);
            if (customer) {
                await db.insert(notifications).values({
                    userId: customer.userId,
                    title: "Order Status Updated",
                    message: `Your order status is now: ${status}`,
                    type: "order",
                    relatedId: updatedOrder.id,
                    isRead: false
                });
            }
        } catch (e) {
            console.error("Failed to notify customer:", e);
        }

        res.json(updatedOrder);
    } catch (error) {
        console.error("Update order status error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
