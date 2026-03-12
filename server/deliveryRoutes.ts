
import { Router } from "express";
import { db } from "./db";
import { customers, orders, users, milkmen, locations } from "@shared/schema";
import { eq, and, asc, gt, desc } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { sendPushNotification } from "./services/fcmService";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// POST /api/delivery/complete
// Marks current delivery as complete and notifies the next customer
router.post("/complete", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        let decoded: any;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (e) {
            return res.status(401).json({ message: "Invalid token" });
        }

        const milkmanUserId = decoded.id; // User ID of the milkman
        const { customerId } = req.body;

        if (!customerId) {
            return res.status(400).json({ message: "Customer ID is required" });
        }

        // 1. Get Milkman Profile
        const [milkman] = await db
            .select()
            .from(milkmen)
            .where(eq(milkmen.userId, milkmanUserId))
            .limit(1);

        if (!milkman) {
            return res.status(404).json({ message: "Milkman profile not found" });
        }

        // 2. Validate the completed customer
        const [completedCustomer] = await db
            .select()
            .from(customers)
            .where(eq(customers.id, customerId))
            .limit(1);

        if (!completedCustomer || completedCustomer.assignedMilkmanId !== milkman.id) {
            return res.status(400).json({ message: "Invalid customer for this milkman" });
        }

        // 3. Mark today's order as delivered (if any pending/confirmed order exists)
        // Find today's order for this customer
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [activeOrder] = await db
            .select()
            .from(orders)
            .where(
                and(
                    eq(orders.customerId, customerId),
                    eq(orders.milkmanId, milkman.id),
                    eq(orders.status, "confirmed") // Assuming confirmed orders are being delivered
                    // In a real app, checking date might be needed, but 'confirmed' status implies active
                )
            )
            .limit(1);

        if (activeOrder) {
            await db
                .update(orders)
                .set({
                    status: "delivered",
                    deliveredAt: new Date(),
                    updatedAt: new Date()
                })
                .where(eq(orders.id, activeOrder.id));

            // Send push notification for delivery
            const customerUser = await db.query.users.findFirst({
                where: eq(users.id, completedCustomer.userId)
            });
            if (customerUser && customerUser.fcmToken) {
                await sendPushNotification(
                    customerUser.fcmToken,
                    "Order Delivered",
                    "Your order has been successfully delivered.",
                    {
                        type: 'order_status',
                        status: 'delivered',
                        orderId: String(activeOrder.id)
                    }
                );
            }
        }

        // 4. Find the NEXT customer in the route
        // We look for a customer with the same milkman and a higher routeOrder
        const [nextCustomer] = await db
            .select()
            .from(customers)
            .where(
                and(
                    eq(customers.assignedMilkmanId, milkman.id),
                    gt(customers.routeOrder, completedCustomer.routeOrder || 0)
                )
            )
            .orderBy(asc(customers.routeOrder))
            .limit(1);

        let notificationSent = false;
        let nextCustomerName = null;

        if (nextCustomer) {
            nextCustomerName = nextCustomer.name;
            // 5. Send Notification / Message to the next customer
            // In a real implementation, you'd call your notification service here.
            // For now, we'll simulate it by returning the info, and assuming the frontend 
            // might also trigger a WebSocket event if connected.

            console.log(`[Notification] Sending 'Get Ready' to ${nextCustomer.name} (${nextCustomer.phone})`);

            // Send push notification for 'out for delivery'
            const nextCustomerUser = await db.query.users.findFirst({
                where: eq(users.id, nextCustomer.userId)
            });
            if (nextCustomerUser && nextCustomerUser.fcmToken) {
                await sendPushNotification(
                    nextCustomerUser.fcmToken,
                    "Out for Delivery",
                    "Your milkman is arriving next! Get ready.",
                    {
                        type: 'order_status',
                        status: 'out_for_delivery'
                    }
                );
            }

            notificationSent = true;
        }

        res.json({
            message: "Delivery marked complete",
            orderUpdated: !!activeOrder,
            nextCustomer: nextCustomer ? {
                id: nextCustomer.id,
                name: nextCustomer.name,
                routeOrder: nextCustomer.routeOrder
            } : null,
            notificationSent
        });

    } catch (error) {
        console.error("Delivery complete error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/delivery/location/:orderId
// Fetches the live location of the milkman assigned to the given order
router.get("/location/:orderId", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        // Basic auth validation
        const token = authHeader.split(" ")[1];
        jwt.verify(token, JWT_SECRET);

        const orderId = parseInt(req.params.orderId);
        if (isNaN(orderId)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }

        // Find the order to get the milkmanId
        const [order] = await db
            .select()
            .from(orders)
            .where(eq(orders.id, orderId))
            .limit(1);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Get the latest location of that milkman
        const [latestLocation] = await db
            .select()
            .from(locations)
            .where(eq(locations.milkmanId, order.milkmanId))
            .orderBy(desc(locations.timestamp))
            .limit(1);

        if (!latestLocation) {
            return res.status(404).json({ message: "Milkman location not found" });
        }

        res.json({
            latitude: parseFloat(latestLocation.latitude),
            longitude: parseFloat(latestLocation.longitude),
            timestamp: latestLocation.timestamp
        });

    } catch (error) {
        console.error("Get milkman location error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/delivery/location
// Allows milkmen to post their live GPS coordinates
router.post("/location", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        let decoded: any;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (e) {
            return res.status(401).json({ message: "Invalid token" });
        }

        const milkmanUserId = decoded.id;
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ message: "Latitude and Longitude are required" });
        }

        const [milkman] = await db
            .select()
            .from(milkmen)
            .where(eq(milkmen.userId, milkmanUserId))
            .limit(1);

        if (!milkman) {
            return res.status(404).json({ message: "Milkman profile not found" });
        }

        // Save the location
        const [newLocation] = await db
            .insert(locations)
            .values({
                milkmanId: milkman.id,
                latitude: latitude.toString(),
                longitude: longitude.toString(),
            })
            .returning();

        res.json({ success: true, location: newLocation });

    } catch (error) {
        console.error("Update milkman location error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
