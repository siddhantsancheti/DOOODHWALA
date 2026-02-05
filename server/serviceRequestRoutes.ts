import { Router } from "express";
import { db } from "./db";
import { serviceRequests, customers, milkmen } from "@shared/schema";
import { eq, desc, ne, and } from "drizzle-orm";
import jwt from "jsonwebtoken";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// GET /api/service-requests/test
router.get("/test", (req, res) => res.json({ message: "Service requests route working" }));

// GET /api/service-requests/customer
router.get("/customer", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        // Legacy manual decode - ideally should be updated too but leaving as is if it works for existing
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        const userId = payload.id;

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
router.get("/milkman", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as any;
        } catch (err) {
            return res.status(401).json({ message: "Invalid token" });
        }

        const userId = decoded.id;

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

// POST /api/service-requests
router.post("/", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as any;
        } catch (err) {
            return res.status(401).json({ message: "Invalid token" });
        }

        const userId = decoded.id;

        const { milkmanId, services, customerNotes } = req.body;

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
    } catch (error) {
        console.error("Create service request error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/service-requests/:id/approve
router.post("/:id/approve", async (req, res) => {
    try {
        const requestId = parseInt(req.params.id);
        const { services } = req.body; // Optional: updated services with final prices

        // 1. Get the request
        const [request] = await db
            .select()
            .from(serviceRequests)
            .where(eq(serviceRequests.id, requestId))
            .limit(1);

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        // 2. Update request status to accepted
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

        // Assign milkman to customer
        await db
            .update(customers)
            .set({
                assignedMilkmanId: request.milkmanId,
                updatedAt: new Date()
            })
            .where(eq(customers.id, request.customerId));

        // 4. Create customer pricing entries if services have prices
        if (updatedRequest.services && Array.isArray(updatedRequest.services)) {
            // This is optional but good for data consistency - we might want to save agreed prices
            // Implementation depends on if we want to overwrite existing pricing
        }

        res.json(updatedRequest);
    } catch (error) {
        console.error("Approve request error:", error);
        res.status(500).json({ message: "Server error" });
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

        res.json(updatedRequest);
    } catch (error) {
        console.error("Reject request error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /api/service-requests/:id/status
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

        res.json(updatedRequest);
    } catch (error) {
        console.error("Update request status error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
