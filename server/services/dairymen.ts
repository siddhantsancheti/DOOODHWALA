import { db } from "../db";
import { customerMilkmen, customers, milkmen, bills } from "@shared/schema";
import { and, eq, ne, inArray } from "drizzle-orm";
import { ensureHouseholdChat } from "./households";

/**
 * A customer's dairymen.
 *
 * A customer used to have exactly one, in `customers.assignedMilkmanId`. That
 * column is now the *primary* — what a screen falls back to when it only knows
 * how to show one — and `customer_milkmen` holds the full list. Every write
 * goes through here so the two never disagree, which is the failure mode a
 * second source of truth invites.
 */

/** Every active dairyman for this customer, primary first. */
export async function listDairymen(customerId: number) {
    const rows = await db
        .select({
            linkId: customerMilkmen.id,
            milkmanId: customerMilkmen.milkmanId,
            isPrimary: customerMilkmen.isPrimary,
            since: customerMilkmen.createdAt,
            businessName: milkmen.businessName,
            contactName: milkmen.contactName,
            phone: milkmen.phone,
            address: milkmen.address,
            pricePerLiter: milkmen.pricePerLiter,
            deliveryTimeStart: milkmen.deliveryTimeStart,
            deliveryTimeEnd: milkmen.deliveryTimeEnd,
        })
        .from(customerMilkmen)
        .innerJoin(milkmen, eq(customerMilkmen.milkmanId, milkmen.id))
        .where(and(eq(customerMilkmen.customerId, customerId), eq(customerMilkmen.isActive, true)));

    // Oldest first, so the order is stable and implies no ranking. There is no
    // primary or secondary dairyman as far as a customer is concerned — they
    // are all simply people she buys from. `isPrimary` below is plumbing for
    // the screens that still read customers.assignedMilkmanId, and must not
    // reach the UI.
    return rows.sort((a, b) => {
        const ta = a.since ? new Date(a.since).getTime() : 0;
        const tb = b.since ? new Date(b.since).getTime() : 0;
        return ta - tb;
    });
}

/**
 * Attach a dairyman to a customer. Idempotent: asking twice is a no-op rather
 * than a duplicate, because a customer tapping "Select" twice on a slow
 * connection should not end up with two of the same relationship.
 *
 * The first dairyman becomes the primary and is mirrored onto
 * customers.assignedMilkmanId, so every screen that still reads that column
 * keeps working.
 */
export async function addDairyman(customerId: number, milkmanId: number): Promise<void> {
    const [existing] = await db
        .select()
        .from(customerMilkmen)
        .where(and(
            eq(customerMilkmen.customerId, customerId),
            eq(customerMilkmen.milkmanId, milkmanId),
        ))
        .limit(1);

    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    const isFirst = !customer?.assignedMilkmanId;

    if (existing) {
        if (!existing.isActive) {
            await db.update(customerMilkmen)
                .set({ isActive: true })
                .where(eq(customerMilkmen.id, existing.id));
        }
    } else {
        await db.insert(customerMilkmen).values({
            customerId, milkmanId, isPrimary: isFirst, isActive: true,
        });
    }

    if (isFirst) {
        await db.update(customers)
            .set({ assignedMilkmanId: milkmanId, updatedAt: new Date() })
            .where(eq(customers.id, customerId));
    }

    // Each dairyman gets their own household chat — that chat is where orders
    // are placed, so a relationship without one cannot be ordered from.
    await ensureHouseholdChat(customerId, milkmanId);
}

/**
 * Detach a dairyman. Refuses while money is outstanding: a customer must not be
 * able to walk away from a pending bill by removing the person owed.
 *
 * Returns why it refused, or null when it went through.
 */
export async function removeDairyman(customerId: number, milkmanId: number): Promise<string | null> {
    const pending = await db
        .select({ id: bills.id })
        .from(bills)
        .where(and(
            eq(bills.customerId, customerId),
            eq(bills.milkmanId, milkmanId),
            eq(bills.status, "pending"),
        ));

    if (pending.length > 0) {
        return "Clear your pending bills with this dairyman first.";
    }

    await db.update(customerMilkmen)
        .set({ isActive: false, isPrimary: false })
        .where(and(
            eq(customerMilkmen.customerId, customerId),
            eq(customerMilkmen.milkmanId, milkmanId),
        ));

    // If the primary just left, promote whoever remains rather than leaving the
    // customer with dairymen but no primary — screens that read the old column
    // would show them as unassigned.
    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    if (customer?.assignedMilkmanId === milkmanId) {
        const [next] = await db
            .select({ milkmanId: customerMilkmen.milkmanId, id: customerMilkmen.id })
            .from(customerMilkmen)
            .where(and(
                eq(customerMilkmen.customerId, customerId),
                eq(customerMilkmen.isActive, true),
                ne(customerMilkmen.milkmanId, milkmanId),
            ))
            .limit(1);

        await db.update(customers)
            .set({ assignedMilkmanId: next?.milkmanId ?? null, updatedAt: new Date() })
            .where(eq(customers.id, customerId));

        if (next) {
            await db.update(customerMilkmen)
                .set({ isPrimary: true })
                .where(eq(customerMilkmen.id, next.id));
        }
    }

    return null;
}

/** True when this customer buys from this milkman. */
export async function hasDairyman(customerId: number, milkmanId: number): Promise<boolean> {
    const [row] = await db
        .select({ id: customerMilkmen.id })
        .from(customerMilkmen)
        .where(and(
            eq(customerMilkmen.customerId, customerId),
            eq(customerMilkmen.milkmanId, milkmanId),
            eq(customerMilkmen.isActive, true),
        ))
        .limit(1);
    return !!row;
}

/** Every customer of this milkman, by id. Replaces reading assignedMilkmanId. */
export async function customerIdsFor(milkmanId: number): Promise<number[]> {
    const rows = await db
        .select({ customerId: customerMilkmen.customerId })
        .from(customerMilkmen)
        .where(and(eq(customerMilkmen.milkmanId, milkmanId), eq(customerMilkmen.isActive, true)));
    return [...new Set(rows.map((r) => r.customerId))];
}
