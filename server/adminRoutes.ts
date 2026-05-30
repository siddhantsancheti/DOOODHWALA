import { Router } from "express";
import { db } from "./db";
import { users, milkmen, customers, orders, payments, bills, chatMessages, familyChats } from "@shared/schema";
import { count, eq, sql, desc, sum, and } from "drizzle-orm";
import { BillingService } from "./services/billingService";

const router = Router();

// GET /api/admin/stats
router.get("/stats", async (req, res) => {
    try {
        const [{ count: totalUsers }] = await db.select({ count: count() }).from(users);
        const [{ count: totalMilkmen }] = await db.select({ count: count() }).from(milkmen);
        const [{ count: totalOrders }] = await db.select({ count: count() }).from(orders);

        // Sum total revenue from completed payments
        const [{ totalRevenue }] = await db
            .select({ totalRevenue: sum(payments.amount) })
            .from(payments)
            .where(eq(payments.status, 'completed'));

        // Daily orders (orders created today)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const [{ count: dailyOrders }] = await db
            .select({ count: count() })
            .from(orders)
            .where(sql`${orders.createdAt} >= ${todayStart.toISOString()}`);

        const lastWeekStart = new Date();
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const [{ weeklyRevenue }] = await db
            .select({ weeklyRevenue: sum(payments.amount) })
            .from(payments)
            .where(
                sql`${payments.status} = 'completed' AND ${payments.createdAt} >= ${lastWeekStart.toISOString()}`
            );

        // Active users this week
        const [{ count: activeUsers }] = await db
            .select({ count: count() })
            .from(users)
            .where(sql`${users.lastActiveAt} >= ${lastWeekStart.toISOString()}`);

        res.json({
            totalUsers,
            totalMilkmen,
            totalOrders,
            totalRevenue: totalRevenue || 0,
            dailyOrders,
            weeklyRevenue: weeklyRevenue || 0,
            pendingOrders: 0, // Simplified for this view
            activeUsers
        });
    } catch (error: any) {
        console.error("Admin stats error:", error);
        res.status(500).json({ success: false, message: "Error fetching admin stats", error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
});

// GET /api/admin/users
router.get("/users", async (req, res) => {
    try {
        const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

        // Names are stored on the customer/milkman profile, not on the user row.
        // Resolve a display name for each user so the admin table isn't all "N/A".
        const custRows = await db.select({ userId: customers.userId, name: customers.name }).from(customers);
        const milkRows = await db.select({ userId: milkmen.userId, id: milkmen.id, name: milkmen.contactName }).from(milkmen);
        const nameByUser = new Map<string, string>();
        const milkmanIdByUser = new Map<string, number>();
        for (const c of custRows) if (c.userId && c.name) nameByUser.set(c.userId, c.name);
        for (const m of milkRows) {
            if (m.userId && m.name) nameByUser.set(m.userId, m.name);
            if (m.userId) milkmanIdByUser.set(m.userId, m.id);
        }

        const enriched = allUsers.map((u) => ({
            ...u,
            name: nameByUser.get(u.id) || [u.firstName, u.lastName].filter(Boolean).join(" ") || null,
            milkmanId: milkmanIdByUser.get(u.id) ?? null,
        }));
        res.json(enriched);
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
});

// GET /api/admin/customers/:userId/details — drill-down for one customer
router.get("/customers/:userId/details", async (req, res) => {
    try {
        const userId = req.params.userId;
        const [customer] = await db.select().from(customers).where(eq(customers.userId, userId)).limit(1);
        if (!customer) return res.status(404).json({ success: false, message: "Customer profile not found" });

        let assignedMilkman: any = null;
        if (customer.assignedMilkmanId) {
            [assignedMilkman] = await db.select().from(milkmen).where(eq(milkmen.id, customer.assignedMilkmanId)).limit(1);
        }

        // Total orders = order messages this customer placed in chat.
        const [{ c: chatOrders }] = await db
            .select({ c: count() })
            .from(chatMessages)
            .where(and(eq(chatMessages.customerId, customer.id), eq(chatMessages.messageType, "order")));
        // Plus any rows in the orders table.
        const [{ c: tableOrders }] = await db
            .select({ c: count() })
            .from(orders)
            .where(eq(orders.customerId, customer.id));

        res.json({
            customer,
            assignedMilkman,
            totalOrders: Number(chatOrders || 0) + Number(tableOrders || 0),
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
});

// GET /api/admin/milkmen/:id/details — drill-down for one milkman
router.get("/milkmen/:id/details", async (req, res) => {
    try {
        const milkmanId = parseInt(req.params.id);
        const [milkman] = await db.select().from(milkmen).where(eq(milkmen.id, milkmanId)).limit(1);
        if (!milkman) return res.status(404).json({ success: false, message: "Milkman not found" });

        // Total customers assigned to this milkman.
        const [{ c: totalCustomers }] = await db
            .select({ c: count() })
            .from(customers)
            .where(eq(customers.assignedMilkmanId, milkmanId));
        // Active household groups for this milkman.
        const [{ c: totalGroups }] = await db
            .select({ c: count() })
            .from(familyChats)
            .where(and(eq(familyChats.milkmanId, milkmanId), eq(familyChats.isActive, true)));

        res.json({
            milkman, // includes bank details + full profile
            totalCustomers: Number(totalCustomers || 0),
            totalGroups: Number(totalGroups || 0),
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
});

// GET /api/admin/milkmen
router.get("/milkmen", async (req, res) => {
    try {
        const allMilkmen = await db.select().from(milkmen).orderBy(desc(milkmen.createdAt));
        res.json(allMilkmen);
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
});

// GET /api/admin/orders
router.get("/orders", async (req, res) => {
    try {
        const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(100);
        res.json(allOrders);
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
});

// GET /api/admin/payments
router.get("/payments", async (req, res) => {
    try {
        const allPayments = await db.select().from(payments).orderBy(desc(payments.createdAt)).limit(100);
        res.json(allPayments);
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
});

// PATCH /api/admin/milkmen/:id/verify
router.patch("/milkmen/:id/verify", async (req, res) => {
    try {
        const milkmanId = parseInt(req.params.id);
        const { verified } = req.body;

        const [updatedMilkman] = await db
            .update(milkmen)
            .set({ verified, updatedAt: new Date() })
            .where(eq(milkmen.id, milkmanId))
            .returning();

        if (!updatedMilkman) return res.status(404).json({ success: false, message: "Milkman not found" });

        res.json({ success: true, milkman: updatedMilkman });
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
});

// PATCH /api/admin/orders/:id/status
router.patch("/orders/:id/status", async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const { status } = req.body;

        const [updatedOrder] = await db
            .update(orders)
            .set({ status, updatedAt: new Date() })
            .where(eq(orders.id, orderId))
            .returning();

        if (!updatedOrder) return res.status(404).json({ success: false, message: "Order not found" });

        res.json({ success: true, order: updatedOrder });
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
});

// POST /api/admin/generate-monthly-bills
router.post("/generate-monthly-bills", async (req, res) => {
    try {
        await BillingService.generateAllMonthlyBills();
        const generatedBills = await db.select().from(bills).orderBy(desc(bills.createdAt)).limit(50);
        res.json({ success: true, bills: generatedBills });
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
});

// GET /api/admin/earnings
router.get("/earnings", async (req, res) => {
    try {
        const earningsData = await db
            .select({
                milkmanId: milkmen.id,
                businessName: milkmen.businessName,
                contactName: milkmen.contactName,
                commissionPercentage: milkmen.commissionPercentage,
                totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${payments.status} = 'completed' THEN ${payments.amount} ELSE 0 END), 0)`,
            })
            .from(milkmen)
            .leftJoin(payments, eq(milkmen.id, payments.milkmanId))
            .where(sql`${milkmen.commissionPercentage} IS NOT NULL`)
            .groupBy(milkmen.id, milkmen.businessName, milkmen.contactName, milkmen.commissionPercentage);

        const formattedEarnings = earningsData.map(item => {
            const revenue = parseFloat(item.totalRevenue || "0");
            const sharePercentage = parseFloat(item.commissionPercentage || "0");
            const adminEarnings = (revenue * sharePercentage) / 100;
            
            return {
                ...item,
                totalRevenue: revenue,
                sharePercentage,
                adminEarnings
            };
        });

        res.json(formattedEarnings);
    } catch (error: any) {
        console.error("Admin earnings error:", error);
        res.status(500).json({ success: false, message: "Error fetching admin earnings", error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
});

// GET /api/admin/milkmen/pending-commission
router.get("/milkmen/pending-commission", async (req, res) => {
    try {
        const pendingMilkmen = await db
            .select()
            .from(milkmen)
            .where(sql`${milkmen.commissionPercentage} IS NULL`)
            .orderBy(desc(milkmen.createdAt));
        res.json(pendingMilkmen);
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
});

// PATCH /api/admin/milkmen/:id/commission
router.patch("/milkmen/:id/commission", async (req, res) => {
    try {
        const milkmanId = parseInt(req.params.id);
        const { percentage } = req.body;

        if (percentage === undefined || isNaN(parseFloat(percentage))) {
            return res.status(400).json({ success: false, message: "Valid percentage is required" });
        }

        const [updatedMilkman] = await db
            .update(milkmen)
            .set({ 
                commissionPercentage: percentage.toString(), 
                updatedAt: new Date() 
            })
            .where(eq(milkmen.id, milkmanId))
            .returning();

        if (!updatedMilkman) return res.status(404).json({ success: false, message: "Milkman not found" });

        res.json({ success: true, milkman: updatedMilkman });
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === 'development' ? error.message : undefined });
    }
});

export default router;
