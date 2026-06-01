import { db } from "../db";
import { bills, chatMessages, milkmen, familyChats, familyChatMembers, customers } from "@shared/schema";
import { eq, and, inArray, isNull } from "drizzle-orm";

// Canonical "YYYY-MM" month key so the bills list (paymentRoutes) can split on "-"
// to render the month name. Used for every bill row this service creates.
function currentMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export class BillingService {
    static async generateMonthlyBill(milkmanId: number): Promise<void> {
        const currentMonth = currentMonthKey();

        // 1. Get only UN-BILLED order messages for this milkman. Every order
        //    carries a billId once it has been billed; filtering on billId IS NULL
        //    guarantees the same order can never be aggregated into a second bill
        //    (this was the root cause of the same order appearing in two months).
        const orderMessages = await db
            .select()
            .from(chatMessages)
            .where(
                and(
                    eq(chatMessages.milkmanId, milkmanId),
                    eq(chatMessages.messageType, "order"),
                    isNull(chatMessages.billId)
                )
            );

        // 2. Group orders by customer (track which message rows feed each bill so
        //    they can be stamped with the bill id afterwards).
        const customerOrders: Record<number, { total: number, items: any[], msgIds: number[] }> = {};

        orderMessages.forEach((msg) => {
            if (!msg.customerId) return;

            if (!customerOrders[msg.customerId]) {
                customerOrders[msg.customerId] = {
                    total: 0,
                    items: [],
                    msgIds: []
                };
            }

            const amount = msg.orderTotal ? parseFloat(msg.orderTotal) : 0;
            customerOrders[msg.customerId].total += amount;
            customerOrders[msg.customerId].msgIds.push(msg.id);

            // Derive quantity: prefer orderQuantity, else sum the multi-product
            // orderItems (so the bill never shows "0 L" when there were orders).
            const items = Array.isArray(msg.orderItems) ? (msg.orderItems as any[]) : [];
            const qty = parseFloat(msg.orderQuantity?.toString() || "0")
                || items.reduce((s, it) => s + (parseFloat(it.quantity) || 0), 0);

            customerOrders[msg.customerId].items.push({
                product: msg.orderProduct || items.map((i) => i.product).join(", ") || "Order",
                quantity: qty,
                price: qty > 0 ? amount / qty : amount,
                amount: amount
            });
        });

        // 3. Create or extend the current-month bill for each customer
        for (const [customerIdStr, data] of Object.entries(customerOrders)) {
            const customerId = parseInt(customerIdStr);
            if (data.items.length === 0) continue; // nothing new to bill

            // Check if a pending bill already exists for this month
            const existingBills = await db
                .select()
                .from(bills)
                .where(
                    and(
                        eq(bills.milkmanId, milkmanId),
                        eq(bills.customerId, customerId),
                        eq(bills.billMonth, currentMonth),
                        eq(bills.status, "pending")
                    )
                );

            let targetBillId: number;

            if (existingBills.length > 0) {
                // Append the new orders to the existing pending bill (don't replace,
                // or already-billed-this-month orders would be lost).
                const ex = existingBills[0];
                const prevItems = Array.isArray(ex.items) ? (ex.items as any[]) : [];
                const newItems = [...prevItems, ...data.items];
                const newTotal = (parseFloat(ex.totalAmount) || 0) + data.total;
                await db
                    .update(bills)
                    .set({
                        totalAmount: newTotal.toString(),
                        totalOrders: newItems.length,
                        items: newItems,
                        updatedAt: new Date()
                    })
                    .where(eq(bills.id, ex.id));
                targetBillId = ex.id;
            } else {
                // Create new bill
                const [newBill] = await db.insert(bills).values({
                    milkmanId,
                    customerId,
                    billMonth: currentMonth,
                    totalAmount: data.total.toString(),
                    totalOrders: data.items.length,
                    items: data.items,
                    status: "pending",
                    dueDate: new Date(new Date().setDate(new Date().getDate() + 7)), // Due in 7 days
                }).returning();
                targetBillId = newBill.id;

                // 4. Send chat message informing about the new bill
                const [milkmanData] = await db.select().from(milkmen).where(eq(milkmen.id, milkmanId)).limit(1);

                await db.insert(chatMessages).values({
                    milkmanId,
                    customerId,
                    senderId: milkmanData?.userId || "system", // Use milkman's user ID if available
                    senderType: "milkman",
                    message: `📄 Bill Generated for ${currentMonth}\nTotal Amount: ₹${data.total.toFixed(2)}\nDue Date: ${new Date(new Date().setDate(new Date().getDate() + 7)).toLocaleDateString()}`,
                    messageType: "bill",
                    orderTotal: data.total.toString(),
                    billId: newBill.id,
                });
            }

            // 5. Stamp every billed order so it is never billed again.
            await db
                .update(chatMessages)
                .set({ billId: targetBillId })
                .where(inArray(chatMessages.id, data.msgIds));
        }
    }

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
            const newTotal = (parseFloat(ex.totalAmount) || 0) + total;
            const [updated] = await db
                .update(bills)
                .set({ totalAmount: newTotal.toString(), totalOrders: newItems.length, items: newItems, updatedAt: new Date() })
                .where(eq(bills.id, ex.id))
                .returning();
            if (billedMsgIds.length > 0) {
                await db.update(chatMessages).set({ billId: ex.id }).where(inArray(chatMessages.id, billedMsgIds));
            }
            return updated;
        }

        if (total <= 0 || items.length === 0) return null;

        const [newBill] = await db
            .insert(bills)
            .values({
                familyChatId,
                milkmanId,
                billMonth: currentMonth,
                totalAmount: total.toString(),
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
        return newBill;
    }

    static async generateAllMonthlyBills(): Promise<void> {
        try {
            // Fetch all milkmen
            const allMilkmen = await db.select().from(milkmen);

            console.log(`Starting monthly billing for ${allMilkmen.length} milkmen...`);

            for (const milkman of allMilkmen) {
                try {
                    await this.generateMonthlyBill(milkman.id);
                    console.log(`Generated bills for milkman ${milkman.id}`);
                } catch (err) {
                    console.error(`Failed to generate bills for milkman ${milkman.id}`, err);
                }
            }

            console.log("Monthly billing completed.");
        } catch (error) {
            console.error("Critical error in generateAllMonthlyBills:", error);
        }
    }
}
