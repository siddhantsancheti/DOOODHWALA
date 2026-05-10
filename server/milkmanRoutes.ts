import { Router } from "express";
import { db } from "./db";
import { milkmen, users, products, customers } from "@shared/schema";
import { eq, asc, and } from "drizzle-orm";
import jwt from "jsonwebtoken";

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
router.get("/profile", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
        const userId = payload.id;

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

// PATCH /api/milkmen/profile
router.patch("/profile", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
        const userId = payload.id;

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
router.post("/", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
        const userId = payload.id;
        const phone = payload.phone; // Extract phone from token

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
router.patch("/products", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
        const userId = payload.id;

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
router.patch("/availability", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(Buffer.from(base64, 'base64').toString());
        const userId = payload.id;

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
