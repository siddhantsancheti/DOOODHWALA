
import { Router } from "express";
import { db } from "./db";
import { customers, orders, users, milkmen, locations } from "@shared/schema";
import { eq, and, asc, gt, desc, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { sendPushNotification } from "./services/fcmService";
import { broadcastLocationUpdate } from "./websocket";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET is required");
// Use server token if available, fall back to public token
const MAPBOX_TOKEN = process.env.MAPBOX_SECRET_TOKEN
    || process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

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
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [activeOrder] = await db
            .select()
            .from(orders)
            .where(
                and(
                    eq(orders.customerId, customerId),
                    eq(orders.milkmanId, milkman.id),
                    eq(orders.status, "confirmed")
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
            console.log(`[Notification] Sending 'Get Ready' to ${nextCustomer.name} (${nextCustomer.phone})`);

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

// GET /api/delivery/geocode?address=<text>
// Geocodes an address text to lat/lng via Mapbox — keeps token server-side
router.get("/geocode", async (req, res) => {
    try {
        const { address } = req.query;
        if (!address || typeof address !== 'string') {
            return res.status(400).json({ message: "Address is required" });
        }

        if (!MAPBOX_TOKEN) {
            return res.status(500).json({ message: "Mapbox token not configured" });
        }

        const encoded = encodeURIComponent(address);
        // Bias results towards India
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?country=IN&limit=1&access_token=${MAPBOX_TOKEN}`;

        const response = await fetch(url);
        const data: any = await response.json();

        if (!data.features || data.features.length === 0) {
            return res.status(404).json({ message: "Address not found" });
        }

        const [longitude, latitude] = data.features[0].center;
        const placeName = data.features[0].place_name;

        res.json({ latitude, longitude, placeName });
    } catch (error) {
        console.error("Geocode error:", error);
        res.status(500).json({ message: "Geocoding failed" });
    }
});

// GET /api/delivery/location/:orderId
// Fetches the live location of the milkman assigned to the given order
router.get("/location/:orderId", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

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
            milkmanId: order.milkmanId,
            latitude: parseFloat(latestLocation.latitude),
            longitude: parseFloat(latestLocation.longitude),
            timestamp: latestLocation.timestamp
        });

    } catch (error) {
        console.error("Get milkman location error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/delivery/location/:orderId/history
// Returns last 25 location points for the milkman — used to draw the breadcrumb trail
router.get("/location/:orderId/history", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        jwt.verify(token, JWT_SECRET);

        const orderId = parseInt(req.params.orderId);
        if (isNaN(orderId)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }

        const [order] = await db
            .select()
            .from(orders)
            .where(eq(orders.id, orderId))
            .limit(1);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const history = await db
            .select()
            .from(locations)
            .where(eq(locations.milkmanId, order.milkmanId))
            .orderBy(desc(locations.timestamp))
            .limit(25);

        // Return in chronological order (oldest first) for drawing the trail
        const coords = history.reverse().map(loc => ({
            longitude: parseFloat(loc.longitude),
            latitude: parseFloat(loc.latitude),
            timestamp: loc.timestamp,
        }));

        res.json({ milkmanId: order.milkmanId, history: coords });
    } catch (error) {
        console.error("Location history error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/delivery/location
// Allows milkmen to post their live GPS coordinates — broadcasts instantly via WebSocket
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

        // 🔴 Instantly push to all connected customers via WebSocket
        broadcastLocationUpdate(milkman.id, parseFloat(latitude), parseFloat(longitude));

        // Cleanup old entries — keep only latest 200 per milkman to prevent DB bloat
        await db.execute(
            sql`DELETE FROM locations WHERE milkman_id = ${milkman.id} AND id NOT IN (
                SELECT id FROM locations WHERE milkman_id = ${milkman.id}
                ORDER BY timestamp DESC LIMIT 200
            )`
        );

        res.json({ success: true, location: newLocation });

    } catch (error) {
        console.error("Update milkman location error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
