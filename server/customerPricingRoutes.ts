import { Router } from "express";
import { db } from "./db";
import { customerPricings, milkmen } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { type AuthRequest } from "./middleware/auth";

const router = Router();

// Resolve the milkman profile for the authenticated user.
async function getMilkmanForUser(userId: string) {
    const [milkman] = await db
        .select()
        .from(milkmen)
        .where(eq(milkmen.userId, userId))
        .limit(1);
    return milkman;
}

// GET /api/customer-pricings — all custom pricing rules for the logged-in milkman
router.get("/", async (req: AuthRequest, res) => {
    try {
        const milkman = await getMilkmanForUser(req.user!.id);
        if (!milkman) {
            return res.status(404).json({ message: "Milkman profile not found" });
        }

        const rows = await db
            .select()
            .from(customerPricings)
            .where(eq(customerPricings.milkmanId, milkman.id));

        res.json(rows);
    } catch (error) {
        console.error("Get customer pricings error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/customer-pricings — create (or update existing) a pricing rule
router.post("/", async (req: AuthRequest, res) => {
    try {
        const milkman = await getMilkmanForUser(req.user!.id);
        if (!milkman) {
            return res.status(404).json({ message: "Milkman profile not found" });
        }

        const { customerId, pricePerLiter, notes } = req.body;
        if (!customerId || pricePerLiter === undefined || pricePerLiter === null) {
            return res.status(400).json({ message: "customerId and pricePerLiter are required" });
        }

        // One pricing rule per milkman-customer pair — update if it already exists.
        const [existing] = await db
            .select()
            .from(customerPricings)
            .where(
                and(
                    eq(customerPricings.milkmanId, milkman.id),
                    eq(customerPricings.customerId, customerId)
                )
            )
            .limit(1);

        if (existing) {
            const [updated] = await db
                .update(customerPricings)
                .set({
                    pricePerLiter: String(pricePerLiter),
                    notes: notes ?? existing.notes,
                    isActive: true,
                    updatedAt: new Date(),
                })
                .where(eq(customerPricings.id, existing.id))
                .returning();
            return res.json(updated);
        }

        const [created] = await db
            .insert(customerPricings)
            .values({
                milkmanId: milkman.id,
                customerId,
                pricePerLiter: String(pricePerLiter),
                notes: notes ?? null,
            })
            .returning();

        res.json(created);
    } catch (error) {
        console.error("Create customer pricing error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// PUT /api/customer-pricings/:id — update a pricing rule the milkman owns
router.put("/:id", async (req: AuthRequest, res) => {
    try {
        const milkman = await getMilkmanForUser(req.user!.id);
        if (!milkman) {
            return res.status(404).json({ message: "Milkman profile not found" });
        }

        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid pricing ID" });
        }

        const [existing] = await db
            .select()
            .from(customerPricings)
            .where(
                and(
                    eq(customerPricings.id, id),
                    eq(customerPricings.milkmanId, milkman.id)
                )
            )
            .limit(1);

        if (!existing) {
            return res.status(404).json({ message: "Pricing rule not found" });
        }

        const { pricePerLiter, notes, isActive } = req.body;
        const [updated] = await db
            .update(customerPricings)
            .set({
                ...(pricePerLiter !== undefined && pricePerLiter !== null
                    ? { pricePerLiter: String(pricePerLiter) }
                    : {}),
                ...(notes !== undefined ? { notes } : {}),
                ...(isActive !== undefined ? { isActive } : {}),
                updatedAt: new Date(),
            })
            .where(eq(customerPricings.id, id))
            .returning();

        res.json(updated);
    } catch (error) {
        console.error("Update customer pricing error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// DELETE /api/customer-pricings/:id — remove a pricing rule the milkman owns
router.delete("/:id", async (req: AuthRequest, res) => {
    try {
        const milkman = await getMilkmanForUser(req.user!.id);
        if (!milkman) {
            return res.status(404).json({ message: "Milkman profile not found" });
        }

        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid pricing ID" });
        }

        const [existing] = await db
            .select()
            .from(customerPricings)
            .where(
                and(
                    eq(customerPricings.id, id),
                    eq(customerPricings.milkmanId, milkman.id)
                )
            )
            .limit(1);

        if (!existing) {
            return res.status(404).json({ message: "Pricing rule not found" });
        }

        await db.delete(customerPricings).where(eq(customerPricings.id, id));

        res.json({ success: true, message: "Pricing rule deleted" });
    } catch (error) {
        console.error("Delete customer pricing error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
