import { Router } from "express";
import { db } from "./db";
import { familyChats, familyChatMembers, customers, milkmen, bills } from "@shared/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { type AuthRequest } from "./middleware/auth";
import { BillingService } from "./services/billingService";
import { broadcast } from "./websocket";

const router = Router();

// Generate a short, human-friendly join code (e.g. "GRP7QX").
function makeChatCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "GRP";
    for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

// Ensure the caller has a customer profile, creating a stub if missing.
async function getOrCreateCustomer(req: AuthRequest) {
    const userId = req.user!.id;
    let [customer] = await db.select().from(customers).where(eq(customers.userId, userId)).limit(1);
    if (!customer) {
        [customer] = await db
            .insert(customers)
            .values({ userId, name: req.user!.username || null, phone: req.user!.phone || null })
            .returning();
    }
    return customer;
}

// POST /api/groups — create a household group for a milkman
router.post("/", async (req: AuthRequest, res) => {
    try {
        const { name, milkmanId } = req.body;
        if (!name || !milkmanId) {
            return res.status(400).json({ message: "name and milkmanId are required" });
        }

        const [milkman] = await db.select().from(milkmen).where(eq(milkmen.id, milkmanId)).limit(1);
        if (!milkman) return res.status(404).json({ message: "Milkman not found" });

        // Unique-ish code (retry a few times on collision).
        let chatCode = makeChatCode();
        for (let i = 0; i < 5; i++) {
            const [clash] = await db.select().from(familyChats).where(eq(familyChats.chatCode, chatCode)).limit(1);
            if (!clash) break;
            chatCode = makeChatCode();
        }

        const [group] = await db
            .insert(familyChats)
            .values({ chatName: name, milkmanId, createdBy: req.user!.id, chatCode, isActive: true })
            .returning();

        await db.insert(familyChatMembers).values({ chatId: group.id, userId: req.user!.id, isAdmin: true });

        // Creating a group also assigns the creator to this milkman.
        const customer = await getOrCreateCustomer(req);
        await db.update(customers).set({ assignedMilkmanId: milkmanId, updatedAt: new Date() }).where(eq(customers.id, customer.id));

        res.json(group);
    } catch (error) {
        console.error("Create group error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/groups/join — join an existing group by code
router.post("/join", async (req: AuthRequest, res) => {
    try {
        const { chatCode } = req.body;
        if (!chatCode) return res.status(400).json({ message: "chatCode is required" });

        const [group] = await db
            .select()
            .from(familyChats)
            .where(and(eq(familyChats.chatCode, String(chatCode).toUpperCase().trim()), eq(familyChats.isActive, true)))
            .limit(1);
        if (!group) return res.status(404).json({ message: "Group not found or inactive" });

        const [existing] = await db
            .select()
            .from(familyChatMembers)
            .where(and(eq(familyChatMembers.chatId, group.id), eq(familyChatMembers.userId, req.user!.id)))
            .limit(1);
        if (!existing) {
            await db.insert(familyChatMembers).values({ chatId: group.id, userId: req.user!.id, isAdmin: false });
        }

        const customer = await getOrCreateCustomer(req);
        await db.update(customers).set({ assignedMilkmanId: group.milkmanId, updatedAt: new Date() }).where(eq(customers.id, customer.id));

        res.json(group);
    } catch (error) {
        console.error("Join group error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/groups/mine — the caller's active group (with members + milkman) or null
router.get("/mine", async (req: AuthRequest, res) => {
    try {
        const memberships = await db
            .select()
            .from(familyChatMembers)
            .where(eq(familyChatMembers.userId, req.user!.id));
        if (memberships.length === 0) return res.json(null);

        const chatIds = memberships.map((m) => m.chatId);
        const [group] = await db
            .select()
            .from(familyChats)
            .where(and(inArray(familyChats.id, chatIds), eq(familyChats.isActive, true)))
            .orderBy(desc(familyChats.createdAt))
            .limit(1);
        if (!group) return res.json(null);

        const members = await db.select().from(familyChatMembers).where(eq(familyChatMembers.chatId, group.id));
        const [milkman] = await db.select().from(milkmen).where(eq(milkmen.id, group.milkmanId)).limit(1);

        res.json({ ...group, members, milkman, memberCount: members.length });
    } catch (error) {
        console.error("Get my group error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/groups/:id/bill — current combined bill for the group
router.get("/:id/bill", async (req: AuthRequest, res) => {
    try {
        const groupId = parseInt(req.params.id);
        if (isNaN(groupId)) return res.status(400).json({ message: "Invalid group ID" });
        const bill = await BillingService.generateGroupBill(groupId);
        res.json(bill || { totalAmount: "0", totalOrders: 0, items: [] });
    } catch (error) {
        console.error("Get group bill error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/groups/:id/discontinue — any member discontinues the group.
// Soft-deletes the group, drops memberships, and unassigns the milkman for ALL
// members. Refuses while a pending combined bill exists (settle first).
router.post("/:id/discontinue", async (req: AuthRequest, res) => {
    try {
        const groupId = parseInt(req.params.id);
        if (isNaN(groupId)) return res.status(400).json({ message: "Invalid group ID" });

        const [group] = await db.select().from(familyChats).where(eq(familyChats.id, groupId)).limit(1);
        if (!group) return res.status(404).json({ message: "Group not found" });

        // Caller must be a member.
        const [membership] = await db
            .select()
            .from(familyChatMembers)
            .where(and(eq(familyChatMembers.chatId, groupId), eq(familyChatMembers.userId, req.user!.id)))
            .limit(1);
        if (!membership) return res.status(403).json({ message: "Not a member of this group" });

        // Block if a pending combined bill remains unpaid.
        const pending = await db
            .select()
            .from(bills)
            .where(and(eq(bills.familyChatId, groupId), eq(bills.status, "pending")));
        if (pending.length > 0) {
            return res.status(400).json({
                message: "Pending group bill exists",
                pendingCount: pending.length,
                totalAmount: pending.reduce((s, b) => s + parseFloat(b.totalAmount), 0),
            });
        }

        // Members → customers → unassign all.
        const members = await db.select().from(familyChatMembers).where(eq(familyChatMembers.chatId, groupId));
        const memberUserIds = members.map((m) => m.userId);
        if (memberUserIds.length > 0) {
            await db
                .update(customers)
                .set({ assignedMilkmanId: null, updatedAt: new Date() })
                .where(inArray(customers.userId, memberUserIds));
        }

        await db.delete(familyChatMembers).where(eq(familyChatMembers.chatId, groupId));
        await db.update(familyChats).set({ isActive: false, updatedAt: new Date() }).where(eq(familyChats.id, groupId));

        broadcast({ type: "group_discontinued", groupId, milkmanId: group.milkmanId });

        res.json({ success: true });
    } catch (error) {
        console.error("Discontinue group error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
