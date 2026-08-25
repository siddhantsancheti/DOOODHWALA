import { Router } from "express";
import { db } from "./db";
import { customers, users, bills, familyChatMembers } from "@shared/schema";
import { eq, and, desc, or, inArray } from "drizzle-orm";
import { type AuthRequest } from "./middleware/auth";
import { BillingService } from "./services/billingService";
import { ensureHouseholdChat } from "./services/households";
import { canAccessCustomer, isSelfMilkman, callerIdentities } from "./services/access";

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

        // The milkman gets his whole roster. A customer calls this too — it
        // renders the member list in their own chat — so they get their own
        // household only, never every family this milkman serves.
        const me = await callerIdentities(req);
        const isTheMilkman = me.isAdmin || me.milkmanId === milkmanId;

        if (isTheMilkman) {
            const members = await db
                .select()
                .from(customers)
                .where(eq(customers.assignedMilkmanId, milkmanId));
            return res.json(members);
        }

        if (me.customerId == null) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const memberships = await db
            .select({ chatId: familyChatMembers.chatId })
            .from(familyChatMembers)
            .where(eq(familyChatMembers.userId, req.user!.id));
        const chatIds = memberships.map((m) => m.chatId);

        if (chatIds.length === 0) {
            // Not in a household yet — they are their own household of one.
            const solo = await db
                .select()
                .from(customers)
                .where(eq(customers.id, me.customerId));
            return res.json(solo);
        }

        const householdUserIds = await db
            .select({ userId: familyChatMembers.userId })
            .from(familyChatMembers)
            .where(inArray(familyChatMembers.chatId, chatIds));

        const members = await db
            .select()
            .from(customers)
            .where(inArray(customers.userId, householdUserIds.map((u) => u.userId)));

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

        // Name, phone and home address live on this row. Only the customer,
        // their assigned milkman, or an admin may read it.
        if (!(await canAccessCustomer(req, customerId))) {
            return res.status(403).json({ message: "Not authorized" });
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

        // Every customer is a household of one until family joins them.
        await ensureHouseholdChat(customer.id, milkmanId);

        res.json(updatedCustomer);
    } catch (error) {
        console.error("Assign milkman error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

router.post("/assign-yd", assignYdHandler);
router.patch("/assign-yd", assignYdHandler);

// POST /api/customers/finalize-bill
// Generates/refreshes the final outstanding bill for the caller + their assigned
// milkman so they can settle it before unassigning. Returns the pending bill
// (or { bill: null } when nothing is due).
router.post("/finalize-bill", async (req: AuthRequest, res) => {
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

        // Roll this household's unbilled orders into its pending bill. Bills
        // are per household now, so generating and reading per customer would
        // miss everything a family member ordered.
        const chatId = await ensureHouseholdChat(customer.id, customer.assignedMilkmanId);
        if (chatId) await BillingService.generateGroupBill(chatId);

        const [pendingBill] = await db
            .select()
            .from(bills)
            .where(
                and(
                    eq(bills.milkmanId, customer.assignedMilkmanId),
                    eq(bills.status, "pending"),
                    chatId
                        ? eq(bills.familyChatId, chatId)
                        : eq(bills.customerId, customer.id),
                )
            )
            .orderBy(desc(bills.createdAt))
            .limit(1);

        if (!pendingBill || parseFloat(pendingBill.totalAmount) <= 0) {
            return res.json({ bill: null, amount: 0 });
        }

        res.json({ bill: pendingBill, amount: parseFloat(pendingBill.totalAmount) });
    } catch (error) {
        console.error("Finalize bill error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

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

        // Both shapes count: bills raised against this customer directly, and
        // the household bill their family shares. Leaving with either unpaid
        // would walk away from money owed.
        const householdChatId = await ensureHouseholdChat(customer.id, customer.assignedMilkmanId);
        const pendingBills = await db
            .select()
            .from(bills)
            .where(
                and(
                    eq(bills.milkmanId, customer.assignedMilkmanId),
                    eq(bills.status, "pending"),
                    householdChatId
                        ? or(eq(bills.customerId, customer.id), eq(bills.familyChatId, householdChatId))
                        : eq(bills.customerId, customer.id),
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
