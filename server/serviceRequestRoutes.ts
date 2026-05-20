import { Router } from "express";
import { db } from "./db";
import { serviceRequests, customers, milkmen, notifications, users } from "@shared/schema";
import { eq, desc, ne, and } from "drizzle-orm";
import { type AuthRequest } from "./middleware/auth";
import { broadcast } from "./websocket";
import { sendPushNotification } from "./services/fcmService";

const router = Router();

// Push a real-time update so both the customer's and milkman's open screens
// refresh their service-request lists without a manual reload.
function broadcastServiceRequest(event: string, request: { id: number; customerId: number; milkmanId: number }) {
    broadcast({
        type: "service_request_update",
        event,
        requestId: request.id,
        customerId: request.customerId,
        milkmanId: request.milkmanId,
    });
}

// Best-effort in-app notification + FCM push to a user.
async function notifyUser(userId: string, title: string, message: string, relatedId: number) {
    try {
        await db.insert(notifications).values({
            userId,
            title,
            message,
            type: "service_request",
            relatedId,
            isRead: false,
        });
        const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
        if (user?.fcmToken) {
            await sendPushNotification(user.fcmToken, title, message, {
                type: "service_request",
                requestId: String(relatedId),
            });
        }
    } catch (err) {
        console.error("Service request notification failed:", err);
    }
}

// GET /api/service-requests/test
router.get("/test", (req, res) => res.json({ message: "Service requests route working" }));

// GET /api/service-requests/customer
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

        const requests = await db
            .select()
            .from(serviceRequests)
            .where(eq(serviceRequests.customerId, customer.id))
            .orderBy(desc(serviceRequests.createdAt));

        res.json(requests);
    } catch (error) {
        console.error("Get service requests error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/service-requests/milkman
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

        const requests = await db
            .select({
                id: serviceRequests.id,
                customerId: serviceRequests.customerId,
                milkmanId: serviceRequests.milkmanId,
                services: serviceRequests.services,
                status: serviceRequests.status,
                milkmanNotes: serviceRequests.milkmanNotes,
                customerNotes: serviceRequests.customerNotes,
                createdAt: serviceRequests.createdAt,
                customer: {
                    id: customers.id,
                    name: customers.name,
                    phone: customers.phone,
                    address: customers.address,
                    userId: customers.userId
                }
            })
            .from(serviceRequests)
            .leftJoin(customers, eq(serviceRequests.customerId, customers.id))
            .where(
                and(
                    eq(serviceRequests.milkmanId, milkman.id),
                    ne(serviceRequests.status, "rejected"),
                    ne(serviceRequests.status, "accepted")
                )
            )
            .orderBy(desc(serviceRequests.createdAt));

        res.json(requests);
    } catch (error) {
        console.error("Get milkman requests error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/service-requests — customer sends a new service request to a milkman
router.post("/", async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const { milkmanId, services, customerNotes } = req.body;

        if (!milkmanId || !services) {
            return res.status(400).json({ message: "milkmanId and services are required" });
        }

        const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, userId))
            .limit(1);

        if (!customer) {
            return res.status(400).json({ message: "Complete your profile first" });
        }

        const [newRequest] = await db
            .insert(serviceRequests)
            .values({
                customerId: customer.id,
                milkmanId,
                services,
                customerNotes,
                status: "pending",
            })
            .returning();

        res.json(newRequest);

        // Real-time: refresh both dashboards and alert the milkman.
        broadcastServiceRequest("created", newRequest);
        const milkman = await db.query.milkmen.findFirst({ where: eq(milkmen.id, milkmanId) });
        if (milkman) {
            await notifyUser(
                milkman.userId,
                "New Service Request",
                `${customer.name || "A customer"} sent you a new service request.`,
                newRequest.id
            );
        }
    } catch (error) {
        console.error("Create service request error:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: "Server error" });
        }
    }
});

// PATCH /api/service-requests/:id/quote — milkman provides a quote
router.patch("/:id/quote", async (req: AuthRequest, res) => {
    try {
        const requestId = parseInt(req.params.id);
        if (isNaN(requestId)) {
            return res.status(400).json({ message: "Invalid request ID" });
        }

        const { services, notes } = req.body;

        const [milkman] = await db
            .select()
            .from(milkmen)
            .where(eq(milkmen.userId, req.user!.id))
            .limit(1);

        if (!milkman) {
            return res.status(404).json({ message: "Milkman profile not found" });
        }

        const [request] = await db
            .select()
            .from(serviceRequests)
            .where(eq(serviceRequests.id, requestId))
            .limit(1);

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }
        if (request.milkmanId !== milkman.id) {
            return res.status(403).json({ message: "Not authorized for this request" });
        }

        const [updated] = await db
            .update(serviceRequests)
            .set({
                status: "quoted",
                services: services || request.services,
                milkmanNotes: notes ?? request.milkmanNotes,
                quotedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(serviceRequests.id, requestId))
            .returning();

        res.json(updated);

        broadcastServiceRequest("quoted", updated);
        const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.id, updated.customerId))
            .limit(1);
        if (customer) {
            await notifyUser(
                customer.userId,
                "Quote Received",
                "Your milkman sent a quote for your service request.",
                requestId
            );
        }
    } catch (error) {
        console.error("Quote service request error:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: "Server error" });
        }
    }
});

// POST /api/service-requests/:id/approve
router.post("/:id/approve", async (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        const { services } = req.body;

        const [request] = await db
            .select()
            .from(serviceRequests)
            .where(eq(serviceRequests.id, requestId))
            .limit(1);

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        const [updatedRequest] = await db
            .update(serviceRequests)
            .set({
                status: "accepted",
                services: services || request.services,
                respondedAt: new Date(),
                updatedAt: new Date()
            })
            .where(eq(serviceRequests.id, requestId))
            .returning();

        // Accepting a request also assigns the customer to this milkman (YD link).
        await db
            .update(customers)
            .set({
                assignedMilkmanId: request.milkmanId,
                updatedAt: new Date()
            })
            .where(eq(customers.id, request.customerId));

        res.json(updatedRequest);

        broadcastServiceRequest("accepted", updatedRequest);
        const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.id, updatedRequest.customerId))
            .limit(1);
        if (customer) {
            await notifyUser(
                customer.userId,
                "Service Request Accepted",
                "Your milkman accepted your service request.",
                requestId
            );
        }
    } catch (error) {
        console.error("Approve request error:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: "Server error" });
        }
    }
});

// POST /api/service-requests/:id/reject
router.post("/:id/reject", async (req, res) => {
    try {
        const requestId = parseInt(req.params.id);

        const [updatedRequest] = await db
            .update(serviceRequests)
            .set({
                status: "rejected",
                respondedAt: new Date(),
                updatedAt: new Date()
            })
            .where(eq(serviceRequests.id, requestId))
            .returning();

        if (!updatedRequest) {
            return res.status(404).json({ message: "Request not found" });
        }

        res.json(updatedRequest);

        broadcastServiceRequest("rejected", updatedRequest);
        const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.id, updatedRequest.customerId))
            .limit(1);
        if (customer) {
            await notifyUser(
                customer.userId,
                "Service Request Declined",
                "Your milkman declined your service request.",
                requestId
            );
        }
    } catch (error) {
        console.error("Reject request error:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: "Server error" });
        }
    }
});

// PATCH /api/service-requests/:id/status — customer accepts/rejects a quote
router.patch("/:id/status", async (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        const { status } = req.body;

        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const [updatedRequest] = await db
            .update(serviceRequests)
            .set({
                status,
                respondedAt: new Date()
            })
            .where(eq(serviceRequests.id, requestId))
            .returning();

        if (!updatedRequest) {
            return res.status(404).json({ message: "Request not found" });
        }

        // If the customer accepted the quote, link them to this milkman.
        if (status === "accepted") {
            await db
                .update(customers)
                .set({ assignedMilkmanId: updatedRequest.milkmanId, updatedAt: new Date() })
                .where(eq(customers.id, updatedRequest.customerId));
        }

        res.json(updatedRequest);

        broadcastServiceRequest(status === "accepted" ? "accepted" : "rejected", updatedRequest);
        const milkman = await db.query.milkmen.findFirst({ where: eq(milkmen.id, updatedRequest.milkmanId) });
        if (milkman) {
            await notifyUser(
                milkman.userId,
                status === "accepted" ? "Quote Accepted" : "Quote Declined",
                status === "accepted"
                    ? "The customer accepted your quote."
                    : "The customer declined your quote.",
                requestId
            );
        }
    } catch (error) {
        console.error("Update request status error:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: "Server error" });
        }
    }
});

// PATCH /api/service-requests/:id — customer edits a still-pending request.
// Registered last so the literal sub-routes above match first.
router.patch("/:id", async (req: AuthRequest, res) => {
    try {
        const requestId = parseInt(req.params.id);
        if (isNaN(requestId)) {
            return res.status(400).json({ message: "Invalid request ID" });
        }

        const { services, customerNotes } = req.body;

        const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, req.user!.id))
            .limit(1);

        if (!customer) {
            return res.status(404).json({ message: "Customer profile not found" });
        }

        const [request] = await db
            .select()
            .from(serviceRequests)
            .where(eq(serviceRequests.id, requestId))
            .limit(1);

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }
        if (request.customerId !== customer.id) {
            return res.status(403).json({ message: "Not authorized for this request" });
        }
        if (request.status !== "pending") {
            return res.status(400).json({ message: "Only pending requests can be edited" });
        }

        const [updated] = await db
            .update(serviceRequests)
            .set({
                services: services || request.services,
                customerNotes: customerNotes ?? request.customerNotes,
                updatedAt: new Date(),
            })
            .where(eq(serviceRequests.id, requestId))
            .returning();

        res.json(updated);

        broadcastServiceRequest("edited", updated);
    } catch (error) {
        console.error("Update service request error:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: "Server error" });
        }
    }
});

export default router;
