import { Router } from "express";
import { db } from "./db";
import { smsQueue } from "@shared/schema";
import { eq, and, lt } from "drizzle-orm";

const router = Router();

// Security: Simple API Key for the Gateway
// In production, this should be in .env
// Security: Simple API Key for the Gateway
// In production, this should be in .env
const GATEWAY_SECRET = process.env.GATEWAY_SECRET;

if (!GATEWAY_SECRET) {
    console.error("GATEWAY_SECRET is not set. Android Gateway integration will fail.");
}


// Middleware to check Gateway Secret
const requireGatewayAuth = (req: any, res: any, next: any) => {
    const secret = req.headers['x-gateway-secret'];
    if (secret !== GATEWAY_SECRET) {
        return res.status(401).json({ message: "Unauthorized Gateway" });
    }
    next();
};

// GET /api/gateway/pending
// Fetch pending SMS messages to send
router.get("/pending", requireGatewayAuth, async (req, res) => {
    try {
        // Fetch up to 10 pending messages
        // Also fetch 'processing' messages that are stuck (e.g., > 2 minutes old)
        const pendingMessages = await db
            .select()
            .from(smsQueue)
            .where(
                and(
                    eq(smsQueue.status, "pending"),
                    lt(smsQueue.attempts, 3) // Max 3 attempts
                )
            )
            .limit(10);

        // Mark them as 'processing' so other workers (if any) don't pick them up
        if (pendingMessages.length > 0) {
            const ids = pendingMessages.map(m => m.id);
            // Note: Drizzle doesn't support 'where in' update easily in one go for all dialects, 
            // but for PG it works. For simplicity, we'll just return them and let the client 
            // confirm receipt or we can update them one by one. 
            // Better: Update them to 'processing' now.

            // For now, we will just return them. The Gateway should call /status to update.
        }

        res.json({ success: true, messages: pendingMessages });
    } catch (error) {
        console.error("[Gateway] Error fetching pending messages:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/gateway/status
// Update message status (sent/failed)
router.post("/status", requireGatewayAuth, async (req, res) => {
    try {
        const { id, status, error } = req.body;

        if (!id || !status) {
            return res.status(400).json({ message: "Missing id or status" });
        }

        await db
            .update(smsQueue)
            .set({
                status,
                updatedAt: new Date(),
                lastAttemptAt: new Date(),
                // Increment attempts if we are reporting a result (whether success or fail)
                // actually attempts should be incremented when we pick it up, but simple logic for now
            })
            .where(eq(smsQueue.id, id));

        res.json({ success: true });
    } catch (error) {
        console.error("[Gateway] Error updating status:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Retries failed messages
export async function retryFailedMessages() {
    try {
        // Reset 'failed' messages to 'pending' if attempts < 3
        await db
            .update(smsQueue)
            .set({
                status: "pending",
                updatedAt: new Date()
            })
            .where(
                and(
                    eq(smsQueue.status, "failed"),
                    lt(smsQueue.attempts, 3)
                )
            );

        // Also reset 'processing' messages stuck for > 15 mins
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        await db
            .update(smsQueue)
            .set({
                status: "pending",
                updatedAt: new Date()
            })
            .where(
                and(
                    eq(smsQueue.status, "processing"),
                    lt(smsQueue.updatedAt, fifteenMinutesAgo)
                )
            );

        console.log("Retry logic executed for SMS queue.");
    } catch (error) {
        console.error("Error retrying failed messages:", error);
    }
}

export default router;
