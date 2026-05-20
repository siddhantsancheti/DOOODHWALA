import { Router } from "express";
import { db } from "./db";
import { customers, users, bills } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { type AuthRequest } from "./middleware/auth";

const router = Router();

// GET /api/customers/profile
router.get("/profile", async (req: AuthRequest, res) => {
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

        res.json(customer);
    } catch (error) {
        console.error("Get customer profile error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /api/customers/profile
router.patch("/profile", async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const phone = req.user!.phone;
        const { name, email, address, latitude, longitude, settings } = req.body;

        const [existingCustomer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, userId))
            .limit(1);

        let updatedCustomer;

        if (existingCustomer) {
            [updatedCustomer] = await db
                .update(customers)
                .set({
                    name,
                    phone,
                    address,
                    settings,
                    latitude: latitude?.toString(),
                    longitude: longitude?.toString(),
                    updatedAt: new Date(),
                })
                .where(eq(customers.id, existingCustomer.id))
                .returning();
        } else {
            [updatedCustomer] = await db
                .insert(customers)
                .values({
                    userId,
                    name,
                    phone,
                    address,
                    settings,
                    latitude: latitude?.toString(),
                    longitude: longitude?.toString(),
                })
                .returning();
        }

        if (email) {
            await db
                .update(users)
                .set({ email })
                .where(eq(users.id, userId));
        }

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
router.patch("/profile/preset-order", async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
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
router.post("/", async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const { name, address, latitude, longitude } = req.body;

        const [existingCustomer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, userId))
            .limit(1);

        if (existingCustomer) {
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

// GET /api/customers/group/:milkmanId — customers assigned to a milkman
// (used to render the milkman group-chat member list). Declared before the
// "/:id" route so the literal "group" segment is matched first.
router.get("/group/:milkmanId", async (req: AuthRequest, res) => {
    try {
        const milkmanId = parseInt(req.params.milkmanId);
        if (isNaN(milkmanId)) {
            return res.status(400).json({ message: "Invalid milkman ID" });
        }

        const members = await db
            .select()
            .from(customers)
            .where(eq(customers.assignedMilkmanId, milkmanId));

        res.json(members);
    } catch (error) {
        console.error("Get group members error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/customers/:id
router.get("/:id", async (req: AuthRequest, res) => {
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

// POST /api/customers/assign-yd & PATCH alias (deduplicated)
const assignYdHandler = async (req: AuthRequest, res: any) => {
    try {
        const userId = req.user!.id;
        const { milkmanId } = req.body;

        if (!milkmanId) {
            return res.status(400).json({ message: "Milkman ID is required" });
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
};

router.post("/assign-yd", assignYdHandler);
router.patch("/assign-yd", assignYdHandler);

// POST /api/customers/unassign-yd
router.post("/unassign-yd", async (req: AuthRequest, res) => {
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

        if (!customer.assignedMilkmanId) {
            return res.status(400).json({ message: "No milkman assigned" });
        }

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
