import { db } from "../db";
import { users, notifications } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sendPushNotification } from "./fcmService";

/**
 * Tell a user something happened: an in-app notification row and a push, from
 * one call.
 *
 * Every route was doing this by hand — insert a row, look up the user, check
 * for a token, push — which is why some events notified and some silently did
 * not. One helper means adding an event is one line, and the two halves cannot
 * drift apart.
 *
 * Best effort by design: a failed notification must never fail the action that
 * triggered it. Nobody should lose an order because a phone had a stale token.
 */
export async function notifyUser(
    userId: string | null | undefined,
    title: string,
    message: string,
    opts: { type?: string; relatedId?: number; data?: Record<string, string> } = {},
): Promise<void> {
    if (!userId) return;
    try {
        await db.insert(notifications).values({
            userId,
            title,
            message,
            type: opts.type || "general",
            relatedId: opts.relatedId ?? null,
            isRead: false,
        });

        const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
        if (user?.fcmToken) {
            await sendPushNotification(user.fcmToken, title, message, {
                type: opts.type || "general",
                ...(opts.relatedId != null ? { relatedId: String(opts.relatedId) } : {}),
                ...(opts.data || {}),
            });
        }
    } catch (err) {
        console.error(`notifyUser failed for ${userId}:`, err);
    }
}

/** Notify several people about the same thing, in parallel. */
export async function notifyUsers(
    userIds: (string | null | undefined)[],
    title: string,
    message: string,
    opts: { type?: string; relatedId?: number; data?: Record<string, string> } = {},
): Promise<void> {
    const unique = [...new Set(userIds.filter(Boolean) as string[])];
    await Promise.all(unique.map((id) => notifyUser(id, title, message, opts)));
}

/** A short, readable summary of a chat message for a notification body. */
export function describeMessage(msg: {
    messageType?: string | null;
    message?: string | null;
    orderProduct?: string | null;
    orderQuantity?: string | null;
    orderTotal?: string | null;
}): { title: string; body: string } {
    switch (msg.messageType) {
        case "order":
            return {
                title: "New order",
                body: msg.orderQuantity
                    ? `${msg.orderQuantity}${msg.orderProduct ? ` × ${msg.orderProduct}` : " L"}`
                    : msg.message || "New order placed",
            };
        case "bill":
            return {
                title: "Bill ready",
                body: msg.orderTotal ? `Your bill of ₹${msg.orderTotal} is ready` : "Your bill is ready",
            };
        case "voice":
            return { title: "Voice message", body: "Sent you a voice message" };
        case "notification":
            return { title: "Update", body: msg.message || "You have an update" };
        default:
            // Truncate: a notification tray shows very little, and a long
            // message pushed in full just gets cut off mid-word anyway.
            const text = (msg.message || "Sent you a message").trim();
            return { title: "New message", body: text.length > 80 ? `${text.slice(0, 77)}…` : text };
    }
}
