import { Router } from "express";
import { db } from "./db";
import { users, milkmen, customers, orders, payments, bills } from "@shared/schema";
import { count, eq, sql, desc, sum } from "drizzle-orm";
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
        res.json(allUsers);
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

export default router;
