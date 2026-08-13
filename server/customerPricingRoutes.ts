import { Router } from "express";
import { db } from "./db";
import { customerPricings, milkmen, chatMessages, customers } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import { broadcast } from "./websocket";
import { partyUserIds } from "./services/wsParties";
import { type AuthRequest } from "./middleware/auth";

const router = Router();

/**
 * Tell the customer, in the conversation, that their price changed. Posted by
 * the server rather than the milkman's app so the notice cannot be skipped by
 * a client that fails or is closed mid-save — a silent price change on a
 * recurring order is exactly the kind of thing that turns into a dispute.
 */
async function announcePriceChange(
    milkmanId: number,
    customerId: number,
    productName: string | null,
    newPrice: number,
    oldPrice: string | null,
) {
    try {
        const [milkman] = await db.select().from(milkmen).where(eq(milkmen.id, milkmanId)).limit(1);
        if (!milkman) return;

        const item = productName || "milk";
        const wasSame = oldPrice != null && Number(oldPrice) === newPrice;
        if (wasSame) return;

        const text = oldPrice != null
            ? `Price updated — ${item}: ₹${Number(oldPrice).toFixed(2)} → ₹${newPrice.toFixed(2)} per unit.`
            : `Price set — ${item}: ₹${newPrice.toFixed(2)} per unit.`;

        const [msg] = await db
            .insert(chatMessages)
            .values({
                customerId,
                milkmanId,
                senderId: milkman.userId,
                senderType: "milkman",
                message: text,
                messageType: "notification",
            })
            .returning();

        broadcast(
            { type: "new_message", message: msg, customerId, milkmanId },
            await partyUserIds({ customerId, milkmanId }),
        );
    } catch (err) {
        // Best effort: the price is already saved, and failing to post the
        // notice must not fail the request.
        console.error("Failed to announce price change:", err);
    }
}

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

// GET /api/customer-pricings/customer/:customerId — the services this customer
// actually orders, each with the price that applies to them.
//
// "Opted" is derived from what they have ordered rather than a separate list,
// so it can never drift out of date with reality.
router.get("/customer/:customerId", async (req: AuthRequest, res) => {
    try {
        const milkman = await getMilkmanForUser(req.user!.id);
        if (!milkman) {
            return res.status(404).json({ message: "Milkman profile not found" });
        }
        const customerId = parseInt(req.params.customerId);
        if (isNaN(customerId)) {
            return res.status(400).json({ message: "Invalid customer id" });
        }

        const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.id, customerId))
            .limit(1);
        if (!customer || customer.assignedMilkmanId !== milkman.id) {
            return res.status(403).json({ message: "Not your customer" });
        }

        const overrides = await db
            .select()
            .from(customerPricings)
            .where(and(
                eq(customerPricings.milkmanId, milkman.id),
                eq(customerPricings.customerId, customerId),
            ));

        const orderMessages = await db
            .select({ product: chatMessages.orderProduct, items: chatMessages.orderItems })
            .from(chatMessages)
            .where(and(
                eq(chatMessages.milkmanId, milkman.id),
                eq(chatMessages.customerId, customerId),
                eq(chatMessages.messageType, "order"),
            ));

        const ordered = new Set<string>();
        for (const m of orderMessages) {
            if (m.product) ordered.add(m.product);
            const items = Array.isArray(m.items) ? (m.items as any[]) : [];
            for (const it of items) {
                const name = it.product || it.name || it.productName;
                if (name) ordered.add(String(name));
            }
        }

        const catalogue = Array.isArray(milkman.dairyItems) ? (milkman.dairyItems as any[]) : [];
        const blanket = overrides.find((o) => o.productName == null);

        const services = catalogue.map((item: any) => {
            const override = overrides.find((o) => o.productName === item.name);
            const listPrice = parseFloat(item.price || "0") || 0;
            const custom = override
                ? parseFloat(override.pricePerLiter)
                : blanket ? parseFloat(blanket.pricePerLiter) : null;
            return {
                product: item.name,
                unit: item.unit || "litre",
                listPrice,
                customPrice: custom,
                effectivePrice: custom ?? listPrice,
                isCustom: custom != null,
                opted: ordered.has(item.name),
            };
        });

        // Sort what they actually buy to the top.
        services.sort((a, b) => Number(b.opted) - Number(a.opted));

        res.json({ customerId, customerName: customer.name, services });
    } catch (error) {
        console.error("Get customer services error:", error);
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

        const { customerId, pricePerLiter, notes, productName } = req.body;
        if (!customerId || pricePerLiter === undefined || pricePerLiter === null) {
            return res.status(400).json({ message: "customerId and pricePerLiter are required" });
        }
        const price = Number(pricePerLiter);
        if (!Number.isFinite(price) || price <= 0) {
            return res.status(400).json({ message: "pricePerLiter must be greater than zero" });
        }
        const product: string | null = productName ?? null;

        // One rule per milkman-customer-product — update if it already exists.
        const [existing] = await db
            .select()
            .from(customerPricings)
            .where(
                and(
                    eq(customerPricings.milkmanId, milkman.id),
                    eq(customerPricings.customerId, customerId),
                    product === null
                        ? isNull(customerPricings.productName)
                        : eq(customerPricings.productName, product)
                )
            )
            .limit(1);

        if (existing) {
            const [updated] = await db
                .update(customerPricings)
                .set({
                    pricePerLiter: String(price),
                    notes: notes ?? existing.notes,
                    isActive: true,
                    updatedAt: new Date(),
                })
                .where(eq(customerPricings.id, existing.id))
                .returning();
            res.json(updated);
            await announcePriceChange(milkman.id, customerId, product, price, existing.pricePerLiter);
            return;
        }

        const [created] = await db
            .insert(customerPricings)
            .values({
                milkmanId: milkman.id,
                customerId,
                productName: product,
                pricePerLiter: String(price),
                notes: notes ?? null,
            })
            .returning();

        res.json(created);
        await announcePriceChange(milkman.id, customerId, product, price, null);
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
