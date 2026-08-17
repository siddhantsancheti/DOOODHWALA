import { db } from "../db";
import { customers, familyChats, familyChatMembers } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * A household is one `family_chats` row: one customer account, one bill, one
 * delivery stop, however many people order through it. Someone ordering alone
 * is a household of one.
 *
 * Chat rows used to exist only for groups created deliberately, so a solo
 * customer's conversation had nothing representing it — which is why counting
 * customers, billing them and routing to them each had to special-case
 * "customer with no chat". Creating the row at assignment makes
 * "one chat = one customer" true in the data instead of a rule enforced in
 * five different places.
 *
 * See docs/HOUSEHOLD_MODEL.md.
 */

function makeChatCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "GRP";
    for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

/** A chat code no active chat is using. */
async function uniqueChatCode(): Promise<string> {
    let code = makeChatCode();
    for (let i = 0; i < 5; i++) {
        const [clash] = await db
            .select({ id: familyChats.id })
            .from(familyChats)
            .where(eq(familyChats.chatCode, code))
            .limit(1);
        if (!clash) return code;
        code = makeChatCode();
    }
    // Five collisions on a 32^3 space means something is wrong; fall back to
    // something certainly unique rather than assigning a duplicate code.
    return `GRP${Date.now().toString(36).toUpperCase().slice(-3)}`;
}

/**
 * The household chat for this customer and milkman, creating it if missing.
 * Safe to call on every assignment — an existing membership is returned as-is,
 * so joining a family or re-assigning the same milkman does not create a
 * second household.
 *
 * Best-effort by design: it must never fail the assignment that triggered it.
 */
export async function ensureHouseholdChat(
    customerId: number,
    milkmanId: number,
): Promise<number | null> {
    try {
        const [customer] = await db
            .select({ id: customers.id, userId: customers.userId, name: customers.name })
            .from(customers)
            .where(eq(customers.id, customerId))
            .limit(1);

        if (!customer?.userId) return null;

        // Already in a household with this milkman? Use it. This is what makes
        // joining a family chat not spawn a second, competing household.
        const existing = await db
            .select({ chatId: familyChats.id })
            .from(familyChatMembers)
            .innerJoin(familyChats, eq(familyChatMembers.chatId, familyChats.id))
            .where(and(
                eq(familyChatMembers.userId, customer.userId),
                eq(familyChats.milkmanId, milkmanId),
                eq(familyChats.isActive, true),
            ))
            .limit(1);

        if (existing.length > 0) return existing[0].chatId;

        const [chat] = await db
            .insert(familyChats)
            .values({
                chatName: customer.name || "My household",
                milkmanId,
                createdBy: customer.userId,
                chatCode: await uniqueChatCode(),
                isActive: true,
            })
            .returning();

        await db.insert(familyChatMembers).values({
            chatId: chat.id,
            userId: customer.userId,
            isAdmin: true,
        });

        return chat.id;
    } catch (error) {
        // The customer is assigned either way; a missing household chat is
        // repaired by the backfill rather than blocking someone's signup.
        console.error("ensureHouseholdChat failed:", error);
        return null;
    }
}

/**
 * Close any other household this user has with the same milkman, keeping
 * `keepChatId`.
 *
 * Called when someone joins or creates a family group: they already had a
 * household of one from being assigned, and leaving both active would count
 * them twice, bill them twice and route to them twice — the exact bug the
 * household model removes.
 *
 * Only households where they are the sole member are closed. A chat with other
 * people in it belongs to those people too and is never touched. Closed chats
 * are deactivated, never deleted, because bills and orders reference them.
 */
export async function retireOtherSoloHouseholds(
    userId: string,
    milkmanId: number,
    keepChatId: number,
): Promise<number> {
    try {
        const mine = await db
            .select({ chatId: familyChats.id })
            .from(familyChatMembers)
            .innerJoin(familyChats, eq(familyChatMembers.chatId, familyChats.id))
            .where(and(
                eq(familyChatMembers.userId, userId),
                eq(familyChats.milkmanId, milkmanId),
                eq(familyChats.isActive, true),
            ));

        let closed = 0;
        for (const { chatId } of mine) {
            if (chatId === keepChatId) continue;

            const members = await db
                .select({ id: familyChatMembers.id })
                .from(familyChatMembers)
                .where(eq(familyChatMembers.chatId, chatId));

            if (members.length > 1) continue; // someone else's household too

            await db
                .update(familyChats)
                .set({ isActive: false, updatedAt: new Date() })
                .where(eq(familyChats.id, chatId));
            closed++;
        }
        return closed;
    } catch (error) {
        console.error("retireOtherSoloHouseholds failed:", error);
        return 0;
    }
}
