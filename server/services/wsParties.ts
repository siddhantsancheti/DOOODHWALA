import { db } from "../db";
import { customers, milkmen, familyChatMembers, familyChats } from "@shared/schema";
import { eq } from "drizzle-orm";

// Resolve the set of user UUIDs that are legitimately party to an event for a
// given customer / milkman / household-group context. Used to scope WebSocket
// broadcasts so events reach only the people involved (chat partners, the
// dairyman, group members) — never every connected client.
export async function partyUserIds(opts: {
    customerId?: number | null;
    milkmanId?: number | null;
    familyChatId?: number | null;
}): Promise<string[]> {
    const ids = new Set<string>();

    if (opts.customerId) {
        const c = await db.query.customers.findFirst({ where: eq(customers.id, opts.customerId) });
        if (c?.userId) ids.add(c.userId);
    }
    if (opts.milkmanId) {
        const m = await db.query.milkmen.findFirst({ where: eq(milkmen.id, opts.milkmanId) });
        if (m?.userId) ids.add(m.userId);
    }
    if (opts.familyChatId) {
        const members = await db.select().from(familyChatMembers).where(eq(familyChatMembers.chatId, opts.familyChatId));
        members.forEach((mm) => mm.userId && ids.add(mm.userId));
        const [grp] = await db.select().from(familyChats).where(eq(familyChats.id, opts.familyChatId)).limit(1);
        if (grp?.milkmanId) {
            const gm = await db.query.milkmen.findFirst({ where: eq(milkmen.id, grp.milkmanId) });
            if (gm?.userId) ids.add(gm.userId);
        }
    }
    return [...ids];
}
