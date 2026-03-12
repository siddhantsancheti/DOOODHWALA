import { Router } from "express";
import { db } from "./db";
import { subscriptions, customers, milkmen } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

// Helper: extract userId from JWT
function getUserId(req: any): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    const token = authHeader.split(" ")[1];
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return payload.id;
}

// POST /api/subscriptions — Create subscription
router.post("/", async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, userId))
            .limit(1);

        if (!customer) {
            return res.status(404).json({ message: "Customer profile not found" });
        }

        const {
            milkmanId,
            productName,
            quantity,
            unit,
            priceSnapshot,
            frequencyType,
            daysOfWeek,
            startDate,
            endDate,
            specialInstructions,
        } = req.body;

        if (!milkmanId || !productName || !quantity || !frequencyType || !startDate) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const [newSubscription] = await db
            .insert(subscriptions)
            .values({
                customerId: customer.id,
                milkmanId,
                productName,
                quantity: quantity.toString(),
                unit: unit || "liter",
                priceSnapshot: priceSnapshot?.toString(),
                frequencyType,
                daysOfWeek: daysOfWeek || null,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                isActive: true,
                specialInstructions: specialInstructions || null,
            })
            .returning();

        res.json(newSubscription);
    } catch (error) {
        console.error("Create subscription error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/subscriptions/customer — List customer's subscriptions
router.get("/customer", async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, userId))
            .limit(1);

        if (!customer) {
            return res.status(404).json({ message: "Customer profile not found" });
        }

        const customerSubscriptions = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.customerId, customer.id))
            .orderBy(desc(subscriptions.createdAt));

        res.json(customerSubscriptions);
    } catch (error) {
        console.error("Get customer subscriptions error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/subscriptions/milkman — List subscriptions for milkman's customers
router.get("/milkman", async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const [milkman] = await db
            .select()
            .from(milkmen)
            .where(eq(milkmen.userId, userId))
            .limit(1);

        if (!milkman) {
            return res.status(404).json({ message: "Milkman profile not found" });
        }

        const milkmanSubscriptions = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.milkmanId, milkman.id))
            .orderBy(desc(subscriptions.createdAt));

        res.json(milkmanSubscriptions);
    } catch (error) {
        console.error("Get milkman subscriptions error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /api/subscriptions/:id/toggle — Toggle active/inactive
router.patch("/:id/toggle", async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const subscriptionId = parseInt(req.params.id);

        const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, userId))
            .limit(1);

        if (!customer) {
            return res.status(404).json({ message: "Customer profile not found" });
        }

        // Verify ownership
        const [existing] = await db
            .select()
            .from(subscriptions)
            .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.customerId, customer.id)))
            .limit(1);

        if (!existing) {
            return res.status(404).json({ message: "Subscription not found" });
        }

        const [updated] = await db
            .update(subscriptions)
            .set({
                isActive: !existing.isActive,
                updatedAt: new Date(),
            })
            .where(eq(subscriptions.id, subscriptionId))
            .returning();

        res.json(updated);
    } catch (error) {
        console.error("Toggle subscription error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /api/subscriptions/:id — Update subscription
router.patch("/:id", async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const subscriptionId = parseInt(req.params.id);

        const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, userId))
            .limit(1);

        if (!customer) {
            return res.status(404).json({ message: "Customer profile not found" });
        }

        // Verify ownership
        const [existing] = await db
            .select()
            .from(subscriptions)
            .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.customerId, customer.id)))
            .limit(1);

        if (!existing) {
            return res.status(404).json({ message: "Subscription not found" });
        }

        const updateData: any = { updatedAt: new Date() };
        if (req.body.quantity !== undefined) updateData.quantity = req.body.quantity.toString();
        if (req.body.frequencyType !== undefined) updateData.frequencyType = req.body.frequencyType;
        if (req.body.daysOfWeek !== undefined) updateData.daysOfWeek = req.body.daysOfWeek;
        if (req.body.endDate !== undefined) updateData.endDate = req.body.endDate ? new Date(req.body.endDate) : null;
        if (req.body.specialInstructions !== undefined) updateData.specialInstructions = req.body.specialInstructions;
        if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

        const [updated] = await db
            .update(subscriptions)
            .set(updateData)
            .where(eq(subscriptions.id, subscriptionId))
            .returning();

        res.json(updated);
    } catch (error) {
        console.error("Update subscription error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// DELETE /api/subscriptions/:id — Delete subscription
router.delete("/:id", async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const subscriptionId = parseInt(req.params.id);

        const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, userId))
            .limit(1);

        if (!customer) {
            return res.status(404).json({ message: "Customer profile not found" });
        }

        // Verify ownership
        const [existing] = await db
            .select()
            .from(subscriptions)
            .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.customerId, customer.id)))
            .limit(1);

        if (!existing) {
            return res.status(404).json({ message: "Subscription not found" });
        }

        await db.delete(subscriptions).where(eq(subscriptions.id, subscriptionId));

        res.json({ message: "Subscription deleted" });
    } catch (error) {
        console.error("Delete subscription error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
