import { db } from "../db";
import { bills, chatMessages, milkmen, familyChats, familyChatMembers, customers } from "@shared/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";
import { customerFeePercent, splitBill } from "./platformFees";

// Canonical "YYYY-MM" month key so the bills list (paymentRoutes) can split on "-"
// to render the month name. Used for every bill row this service creates.
function currentMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export class BillingService {
    // Aggregate every member's order messages for a household group into ONE
    // combined bill (familyChatId set, customerId null). Any member may pay it.
    // Returns the pending group bill (existing or freshly created), or null if
    // there is nothing to bill.
    static async generateGroupBill(familyChatId: number) {
        const [group] = await db.select().from(familyChats).where(eq(familyChats.id, familyChatId)).limit(1);
        if (!group) return null;
        const milkmanId = group.milkmanId;

        // Members → their customer rows → customerIds
        const members = await db
            .select()
            .from(familyChatMembers)
            .where(eq(familyChatMembers.chatId, familyChatId));
        const memberUserIds = members.map((m) => m.userId);
        if (memberUserIds.length === 0) return null;

        const memberCustomers = await db
            .select()
            .from(customers)
            .where(inArray(customers.userId, memberUserIds));
        const customerIds = memberCustomers.map((c) => c.id);
        if (customerIds.length === 0) return null;

        // Only UN-BILLED order messages for this milkman placed by any member
        // (either tagged to the group chat or to a member's individual chat).
        // Filtering on billId IS NULL prevents the same order being re-billed.
        const orderMessages = await db
            .select()
            .from(chatMessages)
            .where(
                and(
                    eq(chatMessages.milkmanId, milkmanId),
                    eq(chatMessages.messageType, "order"),
                    isNull(chatMessages.billId),
                ),
            );

        let total = 0;
        const items: any[] = [];
        const billedMsgIds: number[] = [];
        for (const msg of orderMessages) {
            const belongs =
                msg.familyChatId === familyChatId ||
                (msg.customerId != null && customerIds.includes(msg.customerId));
            if (!belongs) continue;
            const amount = msg.orderTotal ? parseFloat(msg.orderTotal) : 0;
            total += amount;
            billedMsgIds.push(msg.id);
            const oi = Array.isArray(msg.orderItems) ? (msg.orderItems as any[]) : [];
            const qty = parseFloat(msg.orderQuantity?.toString() || "0")
                || oi.reduce((s, it) => s + (parseFloat(it.quantity) || 0), 0);
            items.push({
                product: msg.orderProduct || oi.map((i) => i.product).join(", ") || "Order",
                quantity: qty,
                price: qty > 0 ? amount / qty : amount,
                amount,
                customerId: msg.customerId,
            });
        }

        const currentMonth = currentMonthKey();

        const existing = await db
            .select()
            .from(bills)
            .where(
                and(
                    eq(bills.familyChatId, familyChatId),
                    eq(bills.billMonth, currentMonth),
                    eq(bills.status, "pending"),
                ),
            );

        if (existing.length > 0) {
            // Nothing new to add — return the existing bill untouched.
            if (items.length === 0) return existing[0];
            // Append the new un-billed orders to the pending bill.
            const ex = existing[0];
            const prevItems = Array.isArray(ex.items) ? (ex.items as any[]) : [];
            const newItems = [...prevItems, ...items];
            // Recompute the whole split on the new subtotal rather than adding to
            // the old total — the previous total already had a fee inside it, so
            // adding to it would charge the fee on the fee.
            const newSubtotal = (parseFloat(ex.subtotal ?? ex.totalAmount) || 0) + total;
            const split = splitBill(
                newSubtotal,
                // The rates this bill was raised under, not today's. A bill the
                // customer has already been shown must not change amount because
                // a rate moved after it was issued.
                parseFloat(ex.customerFeePercent ?? "0") || 0,
                parseFloat(ex.vendorCommissionPercent ?? "0") || 0,
            );
            const [updated] = await db
                .update(bills)
                .set({
                    subtotal: split.subtotal,
                    customerFeeAmount: split.customerFeeAmount,
                    vendorCommissionAmount: split.vendorCommissionAmount,
                    totalAmount: split.totalAmount,
                    totalOrders: newItems.length,
                    items: newItems,
                    updatedAt: new Date(),
                })
                .where(eq(bills.id, ex.id))
                .returning();
            if (billedMsgIds.length > 0) {
                await db.update(chatMessages).set({ billId: ex.id }).where(inArray(chatMessages.id, billedMsgIds));
            }
            return updated;
        }

        if (total <= 0 || items.length === 0) return null;

        // Snapshot both rates onto the bill. A rate changed next month must not
        // silently restate a bill the customer has already been shown, and a
        // milkman's past earnings must stay as he saw them.
        const feePercent = await customerFeePercent();
        const [milkmanForRates] = await db
            .select({ commission: milkmen.commissionPercentage })
            .from(milkmen)
            .where(eq(milkmen.id, milkmanId))
            .limit(1);
        const commissionPercent = parseFloat(milkmanForRates?.commission ?? "0") || 0;
        const split = splitBill(total, feePercent, commissionPercent);

        const [newBill] = await db
            .insert(bills)
            .values({
                familyChatId,
                milkmanId,
                billMonth: currentMonth,
                subtotal: split.subtotal,
                customerFeePercent: split.customerFeePercent,
                customerFeeAmount: split.customerFeeAmount,
                vendorCommissionPercent: split.vendorCommissionPercent,
                vendorCommissionAmount: split.vendorCommissionAmount,
                totalAmount: split.totalAmount,
                totalOrders: items.length,
                items,
                status: "pending",
                dueDate: new Date(new Date().setDate(new Date().getDate() + 7)),
            })
            .returning();
        // Stamp every billed order so it is never billed again.
        if (billedMsgIds.length > 0) {
            await db.update(chatMessages).set({ billId: newBill.id }).where(inArray(chatMessages.id, billedMsgIds));
        }

        // Put the bill in the conversation, the same as an individual bill does
        // — without this the customer never sees the Pay Now card.
        //
        // One message per member, all pointing at the same bill: chat messages
        // are fetched by customerId, so a single row tagged only with the chat
        // would be invisible to everyone. Any member paying settles the bill for
        // the household.
        const [milkmanData] = await db.select().from(milkmen).where(eq(milkmen.id, milkmanId)).limit(1);
        const dueDate = new Date(new Date().setDate(new Date().getDate() + 7));

        for (const memberCustomer of memberCustomers) {
            await db.insert(chatMessages).values({
                milkmanId,
                customerId: memberCustomer.id,
                familyChatId,
                senderId: milkmanData?.userId || "system",
                senderType: "milkman",
                // The platform fee is shown on its own line, and only when one
                // was actually charged. Clause 8.7 of the customer terms is a
                // promise that it appears separately before payment — a bill
                // that folded it into the total would put us in breach of our
                // own terms.
                message:
                    `📄 Bill Generated for ${currentMonth}\n` +
                    `Milk & products: ₹${split.subtotal}\n` +
                    (parseFloat(split.customerFeeAmount) > 0
                        ? `Platform fee (${split.customerFeePercent}%): ₹${split.customerFeeAmount}\n`
                        : "") +
                    `Total Amount: ₹${split.totalAmount}\n` +
                    `Due Date: ${dueDate.toLocaleDateString()}`,
                messageType: "bill",
                orderTotal: split.totalAmount,
                billId: newBill.id,
            });
        }

        return newBill;
    }

    /**
     * Bill every household, once.
     *
     * This used to iterate milkmen and call generateMonthlyBill, which grouped
     * by customerId — so a family of three received three bills, while the
     * household bill was only ever produced on demand by
     * GET /api/groups/:id/bill. Both paths claim orders via `billId IS NULL`,
     * so whichever ran first won and the other came back empty.
     *
     * One path now: one household, one bill. Every assigned customer has a
     * household (see docs/HOUSEHOLD_MODEL.md), so nobody is missed.
     */
    /** Bill every household belonging to one milkman. */
    static async generateBillsForMilkman(milkmanId: number): Promise<number> {
        const households = await db
            .select({ id: familyChats.id })
            .from(familyChats)
            .where(and(eq(familyChats.milkmanId, milkmanId), eq(familyChats.isActive, true)));

        let billed = 0;
        for (const household of households) {
            try {
                if (await this.generateGroupBill(household.id)) billed++;
            } catch (err) {
                console.error(`Failed to bill household ${household.id}`, err);
            }
        }
        return billed;
    }

    static async generateAllMonthlyBills(): Promise<void> {
        try {
            const households = await db
                .select({ id: familyChats.id, name: familyChats.chatName })
                .from(familyChats)
                .where(eq(familyChats.isActive, true));

            console.log(`Starting monthly billing for ${households.length} household(s)...`);

            let billed = 0;
            for (const household of households) {
                try {
                    const bill = await this.generateGroupBill(household.id);
                    if (bill) {
                        billed++;
                        console.log(`Billed household ${household.id} (${household.name})`);
                    }
                } catch (err) {
                    // One bad household must not stop the rest of the run.
                    console.error(`Failed to bill household ${household.id}`, err);
                }
            }

            console.log(`Monthly billing completed: ${billed} bill(s) across ${households.length} household(s).`);
        } catch (error) {
            console.error("Critical error in generateAllMonthlyBills:", error);
        }
    }
}
