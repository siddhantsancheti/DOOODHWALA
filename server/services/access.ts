import { db } from "../db";
import { milkmen, customers } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { AuthRequest } from "../middleware/auth";

/**
 * Who the signed-in user actually *is*, in domain terms.
 *
 * `authenticateToken` proves someone holds a valid token; it says nothing about
 * whose data they may read. Several routes took `milkmanId`/`customerId`
 * straight from the query string and trusted them, which let any signed-in
 * account read any other household's chats and bills just by changing a number
 * in the URL. These helpers turn "is logged in" into "is a party to this".
 *
 * A user may be both a milkman and a customer (a milkman who also buys milk),
 * so both ids are looked up, and either one matching is enough.
 */
export async function callerIdentities(req: AuthRequest): Promise<{
    milkmanId: number | null;
    customerId: number | null;
    isAdmin: boolean;
}> {
    const userId = req.user?.id;
    if (!userId) return { milkmanId: null, customerId: null, isAdmin: false };

    const [milkmanRows, customerRows] = await Promise.all([
        db.select({ id: milkmen.id }).from(milkmen).where(eq(milkmen.userId, userId)).limit(1),
        db.select({ id: customers.id }).from(customers).where(eq(customers.userId, userId)).limit(1),
    ]);

    return {
        milkmanId: milkmanRows[0]?.id ?? null,
        customerId: customerRows[0]?.id ?? null,
        isAdmin: req.user?.userType === "admin",
    };
}

/**
 * True when the caller may see this customer's record: the customer
 * themselves, the milkman they are assigned to, or an admin.
 *
 * A customer row carries name, phone and home address, so this gate is what
 * stops an account enumerating every household on the platform by counting
 * upwards through `/api/customers/:id`.
 */
export async function canAccessCustomer(req: AuthRequest, customerId: number): Promise<boolean> {
    const me = await callerIdentities(req);
    if (me.isAdmin) return true;
    if (me.customerId === customerId) return true;
    if (me.milkmanId == null) return false;

    const [row] = await db
        .select({ assigned: customers.assignedMilkmanId })
        .from(customers)
        .where(eq(customers.id, customerId))
        .limit(1);
    return row?.assigned === me.milkmanId;
}

/**
 * True when the caller may see this milkman's live location: the milkman
 * themselves, a customer assigned to them, or an admin.
 *
 * This is a safety gate as much as a privacy one — an open endpoint here lets
 * anyone follow a named person's real-time movements around a neighbourhood.
 */
export async function canTrackMilkman(req: AuthRequest, milkmanId: number): Promise<boolean> {
    const me = await callerIdentities(req);
    if (me.isAdmin) return true;
    if (me.milkmanId === milkmanId) return true;
    if (me.customerId == null) return false;

    const [row] = await db
        .select({ assigned: customers.assignedMilkmanId })
        .from(customers)
        .where(eq(customers.id, me.customerId))
        .limit(1);
    return row?.assigned === milkmanId;
}

/** True when the caller is this milkman, or an admin. */
export async function isSelfMilkman(req: AuthRequest, milkmanId: number): Promise<boolean> {
    const me = await callerIdentities(req);
    return me.isAdmin || me.milkmanId === milkmanId;
}

/**
 * True when the caller is one of the two parties to a milkman↔customer
 * conversation (or an admin). Used to gate chat history and bills.
 */
export async function isPartyToChat(
    req: AuthRequest,
    milkmanId: number,
    customerId: number,
): Promise<boolean> {
    const me = await callerIdentities(req);
    if (me.isAdmin) return true;
    return me.milkmanId === milkmanId || me.customerId === customerId;
}
