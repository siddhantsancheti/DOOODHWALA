import { Router } from "express";
import { db } from "./db";
import { milkmen, users, products, customers, orders, bills, chatMessages } from "@shared/schema";
import { eq, asc, and } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { type AuthRequest } from "./middleware/auth";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET is required");

const router = Router();

// GET /api/milkmen
router.get("/", async (req, res) => {
    try {
        const allMilkmen = await db.select().from(milkmen);
        res.json(allMilkmen);
    } catch (error) {
        console.error("Get milkmen error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/milkmen/customers - Get customers assigned to this milkman
router.get("/customers", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as any;
        } catch (err) {
            console.error("Token verification failed:", err);
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

        const assignedCustomers = await db
            .select()
            .from(customers)
            .where(eq(customers.assignedMilkmanId, milkman.id))
            .orderBy(asc(customers.routeOrder));

        res.json(assignedCustomers);
    } catch (error) {
        console.error("Get assigned customers error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/milkmen/profile
router.get("/profile", async (req: AuthRequest, res) => {
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

        res.json(milkman);
    } catch (error) {
        console.error("Get milkman profile error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

/** The signed-in user's milkman row, or null. */
async function currentMilkman(req: AuthRequest) {
    const [milkman] = await db
        .select()
        .from(milkmen)
        .where(eq(milkmen.userId, req.user!.id))
        .limit(1);
    return milkman ?? null;
}

// GET /api/milkmen/hisaab — the milkman's account: what was earned, what the
// platform takes, what is left, and who still owes money.
router.get("/hisaab", async (req: AuthRequest, res) => {
    try {
        const milkman = await currentMilkman(req);
        if (!milkman) return res.status(404).json({ message: "Milkman profile not found" });

        // Commission is set per milkman by an admin. Until one is set we show
        // 0% rather than guessing a rate and misstating someone's income.
        const commissionPercent = parseFloat(milkman.commissionPercentage || "0") || 0;

        const deliveredOrders = await db
            .select({ totalAmount: orders.totalAmount })
            .from(orders)
            .where(and(eq(orders.milkmanId, milkman.id), eq(orders.status, "delivered")));

        const grossRevenue = deliveredOrders.reduce(
            (sum, o) => sum + (parseFloat(o.totalAmount || "0") || 0), 0,
        );
        const commissionAmount = (grossRevenue * commissionPercent) / 100;

        // Outstanding bills per customer.
        const billRows = await db
            .select({
                customerId: bills.customerId,
                customerName: customers.name,
                totalAmount: bills.totalAmount,
                status: bills.status,
            })
            .from(bills)
            .leftJoin(customers, eq(bills.customerId, customers.id))
            .where(eq(bills.milkmanId, milkman.id));

        const byCustomer = new Map<number, { customerId: number; customerName: string; pending: number; paid: number }>();
        for (const row of billRows) {
            if (row.customerId == null) continue;
            const entry = byCustomer.get(row.customerId)
                ?? { customerId: row.customerId, customerName: row.customerName || "Customer", pending: 0, paid: 0 };
            const amount = parseFloat(row.totalAmount || "0") || 0;
            if (row.status === "paid") entry.paid += amount;
            else entry.pending += amount;
            byCustomer.set(row.customerId, entry);
        }

        const customerBills = [...byCustomer.values()].sort((a, b) => b.pending - a.pending);

        res.json({
            grossRevenue,
            commissionPercent,
            commissionAmount,
            netRevenue: grossRevenue - commissionAmount,
            commissionSet: milkman.commissionPercentage != null,
            totalPending: customerBills.reduce((s, c) => s + c.pending, 0),
            customerBills,
        });
    } catch (error) {
        console.error("Get hisaab error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/milkmen/delivered-summary — how much of each product has actually
// been delivered, and what it came to.
router.get("/delivered-summary", async (req: AuthRequest, res) => {
    try {
        const milkman = await currentMilkman(req);
        if (!milkman) return res.status(404).json({ message: "Milkman profile not found" });

        // The orders table only stores a total — the per-product breakdown
        // lives on the chat message the customer ordered with, which is also
        // what the delivery run marks delivered. Same source, so the two
        // screens can never disagree.
        const deliveredOrders = await db
            .select({
                quantity: chatMessages.orderQuantity,
                totalAmount: chatMessages.orderTotal,
                items: chatMessages.orderItems,
                productName: chatMessages.orderProduct,
            })
            .from(chatMessages)
            .where(and(
                eq(chatMessages.milkmanId, milkman.id),
                eq(chatMessages.isDelivered, true),
            ));

        // A message carries either a multi-product items array or a single
        // quantity/product pair — fold both into one per-product tally.
        const tally = new Map<string, { product: string; quantity: number; amount: number; orders: number }>();
        const add = (product: string, quantity: number, amount: number) => {
            const key = product || "Milk";
            const entry = tally.get(key) ?? { product: key, quantity: 0, amount: 0, orders: 0 };
            entry.quantity += quantity;
            entry.amount += amount;
            entry.orders += 1;
            tally.set(key, entry);
        };

        for (const order of deliveredOrders) {
            const items = Array.isArray(order.items) ? (order.items as any[]) : [];
            if (items.length) {
                for (const item of items) {
                    const qty = parseFloat(item.quantity ?? "0") || 0;
                    const price = parseFloat(item.price ?? item.pricePerLiter ?? "0") || 0;
                    add(item.name || item.productName || "Milk", qty, qty * price);
                }
            } else {
                add(
                    order.productName || "Milk",
                    parseFloat(order.quantity || "0") || 0,
                    parseFloat(order.totalAmount || "0") || 0,
                );
            }
        }

        const productTotals = [...tally.values()].sort((a, b) => b.amount - a.amount);

        res.json({
            products: productTotals,
            totalOrders: deliveredOrders.length,
            totalAmount: productTotals.reduce((sum, p) => sum + p.amount, 0),
        });
    } catch (error) {
        console.error("Get delivered summary error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /api/milkmen/profile
router.patch("/profile", async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;

        const {
            businessName,
            pricePerLiter,
            deliveryTimeStart,
            deliveryTimeEnd,
            address,
            phone
        } = req.body;

        const [milkman] = await db
            .select()
            .from(milkmen)
            .where(eq(milkmen.userId, userId))
            .limit(1);

        if (!milkman) {
            return res.status(404).json({ message: "Milkman profile not found" });
        }

        const [updatedMilkman] = await db
            .update(milkmen)
            .set({
                businessName,
                pricePerLiter: pricePerLiter?.toString(),
                deliveryTimeStart,
                deliveryTimeEnd,
                address,
                phone,
                updatedAt: new Date(),
            })
            .where(eq(milkmen.id, milkman.id))
            .returning();

        res.json(updatedMilkman);
    } catch (error) {
        console.error("Update milkman profile error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/milkmen
router.post("/", async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const phone = req.user!.phone;

        const {
            contactName,
            businessName,
            // phone, // Remove from body destructuring
            address,
            pricePerLiter,
            deliveryTimeStart,
            deliveryTimeEnd,
            dairyItems,
            deliverySlots
        } = req.body;

        // Check if milkman profile already exists
        const [existingMilkman] = await db
            .select()
            .from(milkmen)
            .where(eq(milkmen.userId, userId))
            .limit(1);

        if (existingMilkman) {
            // Update existing
            const [updatedMilkman] = await db
                .update(milkmen)
                .set({
                    contactName,
                    businessName,
                    phone, // Use extracted phone
                    address,
                    pricePerLiter: pricePerLiter?.toString(),
                    deliveryTimeStart,
                    deliveryTimeEnd,
                    dairyItems,
                    deliverySlots,
                    updatedAt: new Date(),
                })
                .where(eq(milkmen.id, existingMilkman.id))
                .returning();

            // Sync products table
            if (dairyItems && Array.isArray(dairyItems)) {
                // First delete existing products for this milkman to ensure clean sync
                await db.delete(products).where(eq(products.milkmanId, existingMilkman.id));

                // Insert new products
                for (const item of dairyItems) {
                    await db.insert(products).values({
                        milkmanId: existingMilkman.id,
                        name: item.name,
                        price: item.price?.toString() || "0",
                        unit: item.unit,
                        quantity: parseInt(item.quantity) || 0,
                        isAvailable: item.isAvailable !== false,
                        isCustom: item.isCustom || false
                    });
                }
            }

            return res.json(updatedMilkman);
        }

        // Create new
        const [newMilkman] = await db
            .insert(milkmen)
            .values({
                userId,
                contactName,
                businessName,
                phone, // Use extracted phone
                address,
                pricePerLiter: pricePerLiter?.toString() || "60",
                deliveryTimeStart: deliveryTimeStart || "06:00",
                deliveryTimeEnd: deliveryTimeEnd || "09:00",
                dairyItems: dairyItems || [],
                deliverySlots: deliverySlots || [
                    { id: 1, name: "Morning", startTime: "06:00", endTime: "09:00", isActive: true },
                    { id: 2, name: "Evening", startTime: "17:00", endTime: "20:00", isActive: true }
                ],
            })
            .returning();

        // Sync products table
        if (dairyItems && Array.isArray(dairyItems)) {
            // First delete existing products for this milkman to ensure clean sync
            await db.delete(products).where(eq(products.milkmanId, newMilkman.id));

            // Insert new products
            for (const item of dairyItems) {
                await db.insert(products).values({
                    milkmanId: newMilkman.id,
                    name: item.name,
                    price: item.price?.toString() || "0",
                    unit: item.unit,
                    quantity: parseInt(item.quantity) || 0,
                    isAvailable: item.isAvailable !== false,
                    isCustom: item.isCustom || false
                });
            }
        }

        // Also update user type if not set
        await db
            .update(users)
            .set({ userType: "milkman" })
            .where(eq(users.id, userId));

        res.json(newMilkman);
    } catch (error) {
        console.error("Create/Update milkman error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// PATCH /api/milkmen/products
router.patch("/products", async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;

        const { dairyItems } = req.body;

        if (!dairyItems || !Array.isArray(dairyItems)) {
            return res.status(400).json({ message: "Invalid dairy items" });
        }

        const [milkman] = await db
            .select()
            .from(milkmen)
            .where(eq(milkmen.userId, userId))
            .limit(1);

        if (!milkman) {
            return res.status(404).json({ message: "Milkman profile not found" });
        }

        // Update dairy items JSON
        await db
            .update(milkmen)
            .set({
                dairyItems,
                updatedAt: new Date(),
            })
            .where(eq(milkmen.id, milkman.id));

        // Sync products table
        // First delete existing products for this milkman
        await db.delete(products).where(eq(products.milkmanId, milkman.id));

        // Insert new products
        for (const item of dairyItems) {
            await db.insert(products).values({
                milkmanId: milkman.id,
                name: item.name,
                price: item.price?.toString() || "0",
                unit: item.unit,
                quantity: parseInt(item.quantity) || 0,
                isAvailable: item.isAvailable !== false,
                isCustom: item.isCustom || false
            });
        }

        res.json({ message: "Products updated successfully", dairyItems });
    } catch (error) {
        console.error("Update products error:", error);
        res.status(500).json({ message: "Server error" });
    }
});// PATCH /api/milkmen/availability
router.patch("/availability", async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;

        const { isAvailable } = req.body;

        if (typeof isAvailable !== 'boolean') {
            return res.status(400).json({ message: "Invalid availability status" });
        }

        const [milkman] = await db
            .select()
            .from(milkmen)
            .where(eq(milkmen.userId, userId))
            .limit(1);

        if (!milkman) {
            return res.status(404).json({ message: "Milkman profile not found" });
        }

        await db
            .update(milkmen)
            .set({
                isAvailable,
                updatedAt: new Date(),
            })
            .where(eq(milkmen.id, milkman.id));

        res.json({ message: "Availability updated successfully", isAvailable });
    } catch (error) {
        console.error("Update availability error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/milkmen/:id
router.get("/:id", async (req, res) => {
    try {
        const milkmanId = parseInt(req.params.id);
        if (isNaN(milkmanId)) {
            return res.status(400).json({ message: "Invalid milkman ID" });
        }

        const [milkman] = await db
            .select()
            .from(milkmen)
            .where(eq(milkmen.id, milkmanId))
            .limit(1);

        if (!milkman) {
            return res.status(404).json({ message: "Milkman not found" });
        }

        res.json(milkman);
    } catch (error) {
        console.error("Get milkman error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /api/milkmen/routes
router.patch("/routes", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) throw new Error("JWT_SECRET is required");
        let decoded: any;
        try {
            decoded = jwt.verify(token, jwtSecret);
        } catch (e) {
            return res.status(401).json({ message: "Invalid token" });
        }

        const userId = decoded.id;
        const { orderedCustomerIds } = req.body; // Array of customer IDs in desired order

        if (!Array.isArray(orderedCustomerIds)) {
            return res.status(400).json({ message: "Invalid data format" });
        }

        const [milkman] = await db
            .select()
            .from(milkmen)
            .where(eq(milkmen.userId, userId))
            .limit(1);

        if (!milkman) {
            return res.status(404).json({ message: "Milkman profile not found" });
        }

        // Update each customer's route order
        await db.transaction(async (tx) => {
            for (let i = 0; i < orderedCustomerIds.length; i++) {
                const customerId = orderedCustomerIds[i];
                await tx
                    .update(customers)
                    .set({ routeOrder: i + 1 })
                    .where(and(eq(customers.id, customerId), eq(customers.assignedMilkmanId, milkman.id)));
            }
        });

        res.json({ message: "Route updated successfully" });
    } catch (error) {
        console.error("Update route error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
