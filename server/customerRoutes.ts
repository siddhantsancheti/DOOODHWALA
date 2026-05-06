import { Router } from "express";
import { db } from "./db";
import { customers, users, bills, milkmen } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Middleware to check if user is authenticated (simple version)
const requireAuth = (req: any, res: any, next: any) => {
    // In a real app, we'd verify the token here again or rely on the user object attached by a previous middleware
    // For now, we'll assume the user ID is passed in headers or we decode the token if needed
    // But since we don't have a global auth middleware yet that attaches user to req, let's do a quick check
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    next();
};

// GET /api/customers/profile
router.get("/profile", async (req, res) => {
    try {
        // Extract user ID from token (mock implementation for now, assuming token contains user info)
        // In a real implementation, use a proper auth middleware to populate req.user
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        // Decode token to get user ID (using a simple decode for now, verify properly in production)
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

        res.json(customer);
    } catch (error) {
        console.error("Get customer profile error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /api/customers/profile
router.patch("/profile", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        const userId = payload.id;
        const phone = payload.phone; // Extract phone from token

        const { name, email, address, latitude, longitude, settings } = req.body;

        // Check if customer profile exists
        const [existingCustomer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, userId))
            .limit(1);

        let updatedCustomer;

        if (existingCustomer) {
            // Update existing customer profile
            [updatedCustomer] = await db
                .update(customers)
                .set({
                    name,
                    phone, // Update phone number
                    address,
                    settings, // Persist JSON settings
                    latitude: latitude?.toString(),
                    longitude: longitude?.toString(),
                    updatedAt: new Date(),
                })
                .where(eq(customers.id, existingCustomer.id))
                .returning();
        } else {
            // Create new customer profile if it doesn't exist
            [updatedCustomer] = await db
                .insert(customers)
                .values({
                    userId,
                    name,
                    phone, // Save phone number
                    address,
                    settings, // Persist JSON settings
                    latitude: latitude?.toString(),
                    longitude: longitude?.toString(),
                })
                .returning();
        }

        // Update user email if provided
        if (email) {
            await db
                .update(users)
                .set({ email })
                .where(eq(users.id, userId));
        }

        // Ensure user type is set to customer
        await db
            .update(users)
            .set({ userType: "customer" })
            .where(eq(users.id, userId));

        res.json(updatedCustomer);
    } catch (error) {
        console.error("Update customer profile error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /api/customers/profile/preset-order
router.patch("/profile/preset-order", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        const userId = payload.id;

        const { presetOrder } = req.body;

        const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, userId))
            .limit(1);

        if (!customer) {
            return res.status(404).json({ message: "Customer profile not found" });
        }

        const [updatedCustomer] = await db
            .update(customers)
            .set({
                presetOrder,
                updatedAt: new Date(),
            })
            .where(eq(customers.id, customer.id))
            .returning();

        res.json(updatedCustomer);
    } catch (error) {
        console.error("Update preset order error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/customers
router.post("/", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        const userId = payload.id;

        const { name, address, latitude, longitude } = req.body;

        // Check if customer profile already exists
        const [existingCustomer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, userId))
            .limit(1);

        if (existingCustomer) {
            // Update existing
            const [updatedCustomer] = await db
                .update(customers)
                .set({
                    name,
                    address,
                    latitude: latitude?.toString(),
                    longitude: longitude?.toString(),
                    updatedAt: new Date(),
                })
                .where(eq(customers.id, existingCustomer.id))
                .returning();

            return res.json(updatedCustomer);
        }

        // Create new
        const [newCustomer] = await db
            .insert(customers)
            .values({
                userId,
                name,
                address,
                latitude: latitude?.toString(),
                longitude: longitude?.toString(),
            })
            .returning();

        // Also update user type if not set
        await db
            .update(users)
            .set({ userType: "customer" })
            .where(eq(users.id, userId));

        res.json(newCustomer);
    } catch (error) {
        console.error("Create/Update customer error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/customers/:id
router.get("/:id", async (req, res) => {
    try {
        const customerId = parseInt(req.params.id);
        if (isNaN(customerId)) {
            return res.status(400).json({ message: "Invalid customer ID" });
        }

        const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.id, customerId))
            .limit(1);

        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }

        res.json(customer);
    } catch (error) {
        console.error("Get customer error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /api/customers/assign-yd
router.post("/assign-yd", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        const userId = payload.id;

        const { milkmanId, groupPassword } = req.body;

        if (!milkmanId) {
            return res.status(400).json({ message: "Milkman ID is required" });
        }

        if (groupPassword !== undefined) {
            const [milkman] = await db.select().from(milkmen).where(eq(milkmen.id, milkmanId)).limit(1);
            if (!milkman) return res.status(404).json({ message: "Milkman not found" });
            const expectedPassword = `${milkman.businessName?.replace(/\s+/g, '').toLowerCase()}123`;
            if (groupPassword !== expectedPassword) {
                return res.status(403).json({ message: "Invalid group password" });
            }
        }

        const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, userId))
            .limit(1);

        if (!customer) {
            return res.status(404).json({ message: "Customer profile not found" });
        }

        const [updatedCustomer] = await db
            .update(customers)
            .set({
                assignedMilkmanId: milkmanId,
                updatedAt: new Date()
            })
            .where(eq(customers.id, customer.id))
            .returning();

        res.json(updatedCustomer);
    } catch (error) {
        console.error("Assign milkman error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /api/customers/assign-yd (Alias for PATCH support)
router.patch("/assign-yd", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        const userId = payload.id;

        const { milkmanId, groupPassword } = req.body;

        if (!milkmanId) {
            return res.status(400).json({ message: "Milkman ID is required" });
        }

        if (groupPassword !== undefined) {
            const [milkman] = await db.select().from(milkmen).where(eq(milkmen.id, milkmanId)).limit(1);
            if (!milkman) return res.status(404).json({ message: "Milkman not found" });
            const expectedPassword = `${milkman.businessName?.replace(/\s+/g, '').toLowerCase()}123`;
            if (groupPassword !== expectedPassword) {
                return res.status(403).json({ message: "Invalid group password" });
            }
        }

        const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, userId))
            .limit(1);

        if (!customer) {
            return res.status(404).json({ message: "Customer profile not found" });
        }

        const [updatedCustomer] = await db
            .update(customers)
            .set({
                assignedMilkmanId: milkmanId,
                updatedAt: new Date()
            })
            .where(eq(customers.id, customer.id))
            .returning();

        res.json(updatedCustomer);
    } catch (error) {
        console.error("Assign milkman error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/customers/unassign-yd
router.post("/unassign-yd", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        const userId = payload.id;

        // Get customer profile
        const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, userId))
            .limit(1);

        if (!customer) {
            return res.status(404).json({ message: "Customer profile not found" });
        }

        if (!customer.assignedMilkmanId) {
            return res.status(400).json({ message: "No milkman assigned" });
        }

        // Check for pending bills
        const pendingBills = await db
            .select()
            .from(bills)
            .where(
                and(
                    eq(bills.customerId, customer.id),
                    eq(bills.milkmanId, customer.assignedMilkmanId),
                    eq(bills.status, "pending")
                )
            );

        if (pendingBills.length > 0) {
            return res.status(400).json({
                message: "Pending bills exist",
                pendingCount: pendingBills.length,
                totalAmount: pendingBills.reduce((sum, bill) => sum + parseFloat(bill.totalAmount), 0)
            });
        }

        // Unassign milkman
        const [updatedCustomer] = await db
            .update(customers)
            .set({
                assignedMilkmanId: null,
                updatedAt: new Date()
            })
            .where(eq(customers.id, customer.id))
            .returning();

        res.json(updatedCustomer);
    } catch (error) {
        console.error("Unassign milkman error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
