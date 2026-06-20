import { Router } from "express";
import multer from "multer";
import { getStorage } from "firebase-admin/storage";
import { db } from "./db";
import { chatMessages, users, orders, milkmen, products, notifications, customers } from "@shared/schema";
import { eq, or, and, asc, desc, gt } from "drizzle-orm";
import { broadcast } from "./websocket";
import { sendPushNotification } from "./services/fcmService";
import "./services/fcmService"; // ensure firebase-admin is initialized for Storage
import { nudgeCustomerToOrder } from "./services/routeNotify";
import { partyUserIds } from "./services/wsParties";
import { type AuthRequest } from "./middleware/auth";

const router = Router();

// Firebase Storage bucket for chat media (photos, documents, voice).
const STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || "dooodhwala-7dce6.firebasestorage.app";
const memUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

// POST /api/chat/upload — upload a chat attachment to Firebase Storage and
// return a long-lived signed URL. Server-side upload bypasses Storage rules.
router.post("/upload", memUpload.single("file"), async (req: AuthRequest, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file provided" });

        const bucket = getStorage().bucket(STORAGE_BUCKET);
        const safeName = (req.file.originalname || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `chat/${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;
        const fileRef = bucket.file(path);

        await fileRef.save(req.file.buffer, {
            contentType: req.file.mimetype,
            resumable: false,
            metadata: { contentType: req.file.mimetype },
        });

        // Long-lived signed read URL (works regardless of bucket access rules).
        const [url] = await fileRef.getSignedUrl({ action: "read", expires: "03-09-2491" });

        res.json({ url, name: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size });
    } catch (error: any) {
        console.error("Chat upload error:", error?.message || error);
        res.status(500).json({ message: "Upload failed", error: process.env.NODE_ENV === "development" ? error?.message : undefined });
    }
});

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

// Shared handler for POST /api/chat/messages and POST /api/chat/send
const sendMessageHandler = async (req: AuthRequest, res: any) => {
    try {
        const userId = req.user!.id;

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

        // Push the new message/order to all connected clients in real time so
        // the recipient's group chat updates without a manual refresh.
        // Mirrors the order_accepted / order_delivered broadcasts.
        broadcast({
            type: "new_message",
            message: newMessage,
            customerId: newMessage.customerId,
            milkmanId: newMessage.milkmanId,
        }, await partyUserIds({
            customerId: newMessage.customerId,
            milkmanId: newMessage.milkmanId,
            familyChatId: newMessage.familyChatId,
        }));

        // Create the order row IMMEDIATELY when a customer places an order via
        // chat, so it shows up under "Active Orders" right away (status pending)
        // instead of only after the milkman accepts. The order is tagged with the
        // source chat message id so acceptance updates THIS order rather than
        // inserting a duplicate.
        if (newMessage.messageType === "order" && newMessage.senderType === "customer") {
            try {
                const items: any[] = Array.isArray(newMessage.orderItems) ? (newMessage.orderItems as any[]) : [];
                const qtyFromItems = items.reduce((s, it) => s + (parseFloat(it.quantity) || 0), 0);
                const qty = newMessage.orderQuantity ? parseFloat(newMessage.orderQuantity) : qtyFromItems;
                if (qty > 0 && newMessage.customerId) {
                    const mk = await db.query.milkmen.findFirst({ where: eq(milkmen.id, newMessage.milkmanId) });
                    const ppl = mk?.pricePerLiter || "0";
                    const total = newMessage.orderTotal && parseFloat(newMessage.orderTotal) > 0
                        ? String(newMessage.orderTotal)
                        : (qty * parseFloat(ppl)).toString();
                    await db.insert(orders).values({
                        milkmanId: newMessage.milkmanId,
                        customerId: newMessage.customerId,
                        orderedBy: newMessage.senderId,
                        quantity: qty.toString(),
                        pricePerLiter: ppl,
                        totalAmount: total,
                        status: "pending",
                        deliveryDate: new Date(),
                        specialInstructions: `chatMsg:${newMessage.id}`,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                }
            } catch (orderErr) {
                console.error("Failed to create order from chat message:", orderErr);
            }
        }

        // Notify the milkman when a customer places an order via chat.
        if (newMessage.messageType === "order" && newMessage.senderType === "customer") {
            try {
                const milkmanRow = await db.query.milkmen.findFirst({
                    where: eq(milkmen.id, newMessage.milkmanId),
                });
                if (milkmanRow) {
                    await db.insert(notifications).values({
                        userId: milkmanRow.userId,
                        title: "New Order Request",
                        message: `New order request for ${newMessage.orderProduct || "items"}.`,
                        type: "order",
                        relatedId: newMessage.id,
                        isRead: false,
                    });
                    const milkmanUser = await db.query.users.findFirst({
                        where: eq(users.id, milkmanRow.userId),
                    });
                    if (milkmanUser && milkmanUser.fcmToken) {
                        await sendPushNotification(
                            milkmanUser.fcmToken,
                            "New Order Request",
                            `New order request for ${newMessage.orderProduct || "items"}.`,
                            { type: "order_request", messageId: String(newMessage.id) }
                        );
                    }
                }
            } catch (notifError) {
                console.error("Failed to notify milkman of new order:", notifError);
            }
        }
    } catch (error) {
        console.error("Send message error:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: "Server error" });
        }
    }
};

// POST /api/chat/messages
router.post("/messages", sendMessageHandler);
// POST /api/chat/send (alias — deduplicated)
router.post("/send", sendMessageHandler);


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

        // Push the 2-tick (accepted) state immediately — before any best-effort
        // follow-up work, so a failure there can never suppress the tick.
        broadcast({
            type: "order_accepted",
            messageId: updatedMessage.id,
            customerId: updatedMessage.customerId,
            milkmanId: updatedMessage.milkmanId
        }, await partyUserIds({
            customerId: updatedMessage.customerId,
            milkmanId: updatedMessage.milkmanId,
            familyChatId: updatedMessage.familyChatId,
        }));

        // An order message may carry an explicit orderQuantity (ChatScreen) or
        // only an orderItems array (ChatComponent). Normalise both here.
        const acceptedItems: any[] = Array.isArray(updatedMessage.orderItems)
            ? (updatedMessage.orderItems as any[])
            : [];
        const qtyFromItems = acceptedItems.reduce(
            (sum, it) => sum + (parseFloat(it.quantity) || 0), 0
        );
        const acceptedQty = updatedMessage.orderQuantity
            ? parseFloat(updatedMessage.orderQuantity)
            : qtyFromItems;

        // The order row is normally created up-front when the customer places it
        // (tagged specialInstructions = "chatMsg:<id>"). On acceptance, mark that
        // same order "confirmed" rather than inserting a duplicate. Only insert as
        // a fallback for legacy orders that were never created at send time.
        if (acceptedQty > 0) {
            const milkman = await db.query.milkmen.findFirst({
                where: eq(milkmen.id, updatedMessage.milkmanId)
            });

            if (milkman) {
                const existingOrder = await db.query.orders.findFirst({
                    where: eq(orders.specialInstructions, `chatMsg:${updatedMessage.id}`),
                });

                if (existingOrder) {
                    await db.update(orders)
                        .set({ status: "confirmed", updatedAt: new Date() })
                        .where(eq(orders.id, existingOrder.id));
                } else {
                    const pricePerLiter = parseFloat(milkman.pricePerLiter || "0");
                    // Prefer the customer-facing total (correct for multi-product /
                    // custom-priced orders); fall back to qty × the standard rate.
                    const totalAmount = updatedMessage.orderTotal && parseFloat(updatedMessage.orderTotal) > 0
                        ? String(updatedMessage.orderTotal)
                        : (acceptedQty * pricePerLiter).toString();

                    await db.insert(orders).values({
                        milkmanId: updatedMessage.milkmanId,
                        customerId: updatedMessage.customerId,
                        orderedBy: updatedMessage.senderId,
                        quantity: acceptedQty.toString(),
                        pricePerLiter: milkman.pricePerLiter,
                        totalAmount,
                        status: "confirmed",
                        deliveryDate: new Date(),
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                }
            }
        }

        // Update inventory in milkmen.dairyItems JSONB
        if (updatedMessage.orderProduct || acceptedItems.length > 0) {
            try {
                const milkman = await db.query.milkmen.findFirst({
                    where: eq(milkmen.id, updatedMessage.milkmanId)
                });

                if (milkman && milkman.dairyItems) {
                    const dairyItems = milkman.dairyItems as any[];

                    // Build {productNameLower: quantityToDeduct} from whichever
                    // shape the order message carries.
                    const deduction: Record<string, number> = {};
                    if (acceptedItems.length > 0) {
                        for (const it of acceptedItems) {
                            if (!it.product) continue;
                            const key = String(it.product).toLowerCase();
                            deduction[key] = (deduction[key] || 0) + (parseFloat(it.quantity) || 0);
                        }
                    } else if (updatedMessage.orderProduct && updatedMessage.orderQuantity) {
                        deduction[updatedMessage.orderProduct.toLowerCase()] =
                            parseFloat(updatedMessage.orderQuantity);
                    }

                    const updatedItems = dairyItems.map(item => {
                        const deduct = deduction[String(item.name).toLowerCase()];
                        if (deduct) {
                            const currentQty = parseFloat(item.quantity || "0");
                            const newQty = Math.max(0, currentQty - deduct);
                            return { ...item, quantity: newQty };
                        }
                        return item;
                    });

                    await db
                        .update(milkmen)
                        .set({
                            dairyItems: updatedItems,
                            updatedAt: new Date()
                        })
                        .where(eq(milkmen.id, updatedMessage.milkmanId));

                    broadcast({
                        type: "inventory_update",
                        milkmanId: updatedMessage.milkmanId,
                        data: {
                            message: `Inventory updated: ${updatedMessage.orderProduct || Object.keys(deduction).join(', ') || 'order'}`,
                            dairyItems: updatedItems
                        }
                    }, await partyUserIds({ milkmanId: updatedMessage.milkmanId }));
                }
            } catch (invError) {
                console.error("Failed to update JSONB inventory:", invError);
            }
        }

        // Notify Customer about Order Acceptance
        if (updatedMessage.senderType === 'customer' && updatedMessage.customerId) {
            try {
                await db.insert(notifications).values({
                    userId: updatedMessage.senderId,
                    title: "Order Accepted",
                    message: `Your order for ${updatedMessage.orderProduct || 'items'} has been accepted.`,
                    type: "order",
                    relatedId: updatedMessage.id,
                    isRead: false
                });

                const customerUser = await db.query.users.findFirst({
                    where: eq(users.id, updatedMessage.senderId)
                });

                if (customerUser && customerUser.fcmToken) {
                    await sendPushNotification(
                        customerUser.fcmToken,
                        "Order Confirmed",
                        `Your order for ${updatedMessage.orderProduct || 'items'} has been confirmed.`,
                        {
                            type: 'order_status',
                            status: 'confirmed',
                            orderId: String(updatedMessage.id)
                        }
                    );
                }
            } catch (notifError) {
                console.error("Failed to send notification:", notifError);
            }
        }

    } catch (error) {
        console.error("Accept order error:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: "Server error" });
        }
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
                isEditable: false,
            })
            .where(eq(chatMessages.id, messageId))
            .returning();

        if (!updatedMessage) {
            return res.status(404).json({ message: "Message not found" });
        }

        res.json(updatedMessage);

        // Push the 3-tick (delivered) state immediately — before best-effort
        // order-status sync and route-optimisation, so neither can suppress it.
        broadcast({
            type: "order_delivered",
            messageId: updatedMessage.id,
            customerId: updatedMessage.customerId,
            milkmanId: updatedMessage.milkmanId
        }, await partyUserIds({
            customerId: updatedMessage.customerId,
            milkmanId: updatedMessage.milkmanId,
            familyChatId: updatedMessage.familyChatId,
        }));

        // Update the corresponding order record to 'delivered'.
        // An order message carries orderQuantity (ChatScreen) or orderItems
        // (ChatComponent) — treat either as "this message was an order".
        const deliveredItems: any[] = Array.isArray(updatedMessage.orderItems)
            ? (updatedMessage.orderItems as any[])
            : [];
        const isOrderMessage = !!updatedMessage.orderQuantity || deliveredItems.length > 0;

        if (isOrderMessage && updatedMessage.customerId !== null) {
            // Mark the most recent still-pending order for this customer+milkman
            // delivered (the orders table has no chat-message link, so match the
            // latest pending one rather than a fragile quantity comparison).
            const [pendingOrder] = await db
                .select()
                .from(orders)
                .where(
                    and(
                        eq(orders.milkmanId, updatedMessage.milkmanId),
                        eq(orders.customerId, updatedMessage.customerId),
                        eq(orders.status, "pending")
                    )
                )
                .orderBy(desc(orders.createdAt))
                .limit(1);

            if (pendingOrder) {
                await db
                    .update(orders)
                    .set({
                        status: "delivered",
                        deliveredAt: new Date(),
                        updatedAt: new Date()
                    })
                    .where(eq(orders.id, pendingOrder.id));
                console.log(`Order ${pendingOrder.id} confirmed as delivered from chat message ${messageId}`);
            }

            // Send push notification for delivery
            if (updatedMessage.customerId) {
                const customerUser = await db.query.users.findFirst({
                    where: eq(users.id, updatedMessage.senderId)
                });

                if (customerUser && customerUser.fcmToken) {
                    await sendPushNotification(
                        customerUser.fcmToken,
                        "Order Delivered",
                        `Your order for ${updatedMessage.orderProduct || 'items'} has been successfully delivered.`,
                        {
                            type: 'order_status',
                            status: 'delivered',
                            orderId: String(updatedMessage.id)
                        }
                    );
                }
            }
        }

        // When a delivery is completed, nudge the NEXT customer in the route to
        // place their order. This complements the GPS-proximity trigger in
        // /api/delivery/location — whichever fires first wins, the shared
        // nudgeCustomerToOrder helper dedups so the customer is nudged once.
        if (updatedMessage.customerId && updatedMessage.milkmanId) {
            const [currentCustomer] = await db.select().from(customers)
                .where(eq(customers.id, updatedMessage.customerId)).limit(1);

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
                    const [milkmanData] = await db.select().from(milkmen)
                        .where(eq(milkmen.id, updatedMessage.milkmanId)).limit(1);
                    if (milkmanData) {
                        await nudgeCustomerToOrder(milkmanData, nextCustomer);
                    }
                }
            }
        }

    } catch (error) {
        console.error("Mark delivered error:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: "Server error" });
        }
    }
});

export default router;
