import { Router } from "express";
import { db } from "./db";
import { notifications } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { type AuthRequest } from "./middleware/auth";

const router = Router();

// GET /api/notifications — the authenticated user's notifications, newest first
router.get("/", async (req: AuthRequest, res) => {
    try {
        const rows = await db
            .select()
            .from(notifications)
            .where(eq(notifications.userId, req.user!.id))
            .orderBy(desc(notifications.createdAt))
            .limit(100);
        res.json(rows);
    } catch (error) {
        console.error("Get notifications error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/notifications — create a notification
router.post("/", async (req: AuthRequest, res) => {
    try {
        const { userId, title, message, type, relatedId } = req.body;
        if (!userId || !title || !message || !type) {
            return res.status(400).json({ message: "userId, title, message and type are required" });
        }

        const [created] = await db
            .insert(notifications)
            .values({
                userId,
                title,
                message,
                type,
                relatedId: relatedId ?? null,
                isRead: false,
            })
            .returning();

        res.json(created);
    } catch (error) {
        console.error("Create notification error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /api/notifications/mark-all-read — mark all of the user's notifications read.
// Declared before "/:id/read" for clarity (the paths do not actually overlap).
router.patch("/mark-all-read", async (req: AuthRequest, res) => {
    try {
        await db
            .update(notifications)
            .set({ isRead: true })
            .where(eq(notifications.userId, req.user!.id));
        res.json({ success: true });
    } catch (error) {
        console.error("Mark all notifications read error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /api/notifications/:id/read — mark a single notification read
router.patch("/:id/read", async (req: AuthRequest, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ message: "Invalid notification ID" });
        }

        const [updated] = await db
            .update(notifications)
            .set({ isRead: true })
            .where(
                and(
                    eq(notifications.id, id),
                    eq(notifications.userId, req.user!.id)
                )
            )
            .returning();

        if (!updated) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.json(updated);
    } catch (error) {
        console.error("Mark notification read error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
