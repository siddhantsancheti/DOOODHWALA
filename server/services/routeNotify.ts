import { db } from "../db";
import { chatMessages, notifications, users, familyChats, familyChatMembers, customers } from "@shared/schema";
import { eq, and, gte, or, inArray } from "drizzle-orm";
import { broadcast } from "../websocket";
import { sendPushNotification } from "./fcmService";

// Distance (metres) within which the milkman is treated as having "reached"
// a delivery stop. ~150 m comfortably covers arriving at a doorstep/building.
export const PROXIMITY_THRESHOLD_M = 150;

// Great-circle distance between two lat/lng points, in metres.
export function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Nudges a customer in the chat to place their order — but only if they have
 * NOT already placed an order in chat today and have NOT already been nudged
 * today. Sends an in-chat message, a notification record, an FCM push, and a
 * real-time `new_message` broadcast.
 *
 * Best-effort: all errors are logged and swallowed so a caller (a location
 * ping, a delivery completion) can never be broken by it.
 *
 * @returns true if a fresh nudge was sent, false if skipped/failed.
 */
export async function nudgeCustomerToOrder(milkman: any, customer: any): Promise<boolean> {
    try {
        if (!milkman || !customer || !customer.id || !customer.userId) return false;

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Work out whose order "counts" for today. For a lone customer that's
        // just them; for a household group it's ANY member — so once one member
        // places today's order, no member gets nudged for the rest of the day.
        let orderCustomerIds: number[] = [customer.id];
        let groupId: number | null = null;
        try {
            const memberships = await db
                .select()
                .from(familyChatMembers)
                .where(eq(familyChatMembers.userId, customer.userId));
            if (memberships.length) {
                const chatIds = memberships.map((m) => m.chatId);
                const [group] = await db
                    .select()
                    .from(familyChats)
                    .where(and(inArray(familyChats.id, chatIds), eq(familyChats.isActive, true)))
                    .limit(1);
                if (group) {
                    groupId = group.id;
                    const members = await db
                        .select()
                        .from(familyChatMembers)
                        .where(eq(familyChatMembers.chatId, group.id));
                    const memberUserIds = members.map((m) => m.userId);
                    const memberCustomers = await db
                        .select()
                        .from(customers)
                        .where(inArray(customers.userId, memberUserIds));
                    if (memberCustomers.length) orderCustomerIds = memberCustomers.map((c) => c.id);
                }
            }
        } catch (e) {
            console.error("[routeNotify] group lookup failed (falling back to single customer):", e);
        }

        // Skip if today's order has already been placed — by this customer, by
        // any household-group member, or tagged to the group chat.
        const orderedTodayWhere = groupId
            ? or(inArray(chatMessages.customerId, orderCustomerIds), eq(chatMessages.familyChatId, groupId))
            : eq(chatMessages.customerId, customer.id);

        const [existingOrder] = await db
            .select()
            .from(chatMessages)
            .where(
                and(
                    orderedTodayWhere,
                    eq(chatMessages.milkmanId, milkman.id),
                    eq(chatMessages.messageType, "order"),
                    eq(chatMessages.senderType, "customer"),
                    gte(chatMessages.createdAt, todayStart)
                )
            )
            .limit(1);
        if (existingOrder) return false;

        // Skip if this customer was already nudged today (dedup across both the
        // GPS-proximity trigger and the delivery-completion trigger).
        const [alreadyNudged] = await db
            .select()
            .from(chatMessages)
            .where(
                and(
                    eq(chatMessages.customerId, customer.id),
                    eq(chatMessages.milkmanId, milkman.id),
                    eq(chatMessages.messageType, "notification"),
                    eq(chatMessages.senderType, "milkman"),
                    gte(chatMessages.createdAt, todayStart)
                )
            )
            .limit(1);
        if (alreadyNudged) return false;

        const text =
            "🛵 Your milkman is one stop away! Please place your order now if you haven't already.";

        const [msg] = await db
            .insert(chatMessages)
            .values({
                milkmanId: milkman.id,
                customerId: customer.id,
                senderId: milkman.userId,
                senderType: "milkman",
                message: text,
                messageType: "notification",
                isRead: false,
            })
            .returning();

        await db.insert(notifications).values({
            userId: customer.userId,
            title: "Milkman Almost There",
            message: "Your milkman is one stop away — place your order now!",
            type: "proximity",
            isRead: false,
        });

        const customerUser = await db.query.users.findFirst({
            where: eq(users.id, customer.userId),
        });
        if (customerUser && customerUser.fcmToken) {
            await sendPushNotification(
                customerUser.fcmToken,
                "Milkman Almost There",
                "Your milkman is one stop away — place your order now!",
                { type: "order_status", status: "out_for_delivery" }
            );
        }

        // Real-time push so the customer's chat updates immediately.
        broadcast({
            type: "new_message",
            message: msg,
            customerId: customer.id,
            milkmanId: milkman.id,
        });

        return true;
    } catch (e) {
        console.error("[routeNotify] nudgeCustomerToOrder failed:", e);
        return false;
    }
}
