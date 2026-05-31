import { db } from "../db";
import { bills, chatMessages, milkmen, familyChats, familyChatMembers, customers } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

// Canonical "YYYY-MM" month key so the bills list (paymentRoutes) can split on "-"
// to render the month name. Used for every bill row this service creates.
function currentMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export class BillingService {
    static async generateMonthlyBill(milkmanId: number): Promise<void> {
        const currentMonth = currentMonthKey();

        // 1. Get all order messages for this milkman
        const orderMessages = await db
            .select()
            .from(chatMessages)
            .where(
                and(
                    eq(chatMessages.milkmanId, milkmanId),
                    eq(chatMessages.messageType, "order")
                )
            );

        // 2. Group orders by customer
        const customerOrders: Record<number, { total: number, items: any[] }> = {};

        orderMessages.forEach((msg) => {
            if (!msg.customerId) return;

            if (!customerOrders[msg.customerId]) {
                customerOrders[msg.customerId] = {
                    total: 0,
                    items: []
                };
            }

            const amount = msg.orderTotal ? parseFloat(msg.orderTotal) : 0;
            customerOrders[msg.customerId].total += amount;

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

        // 3. Create or update bills for each customer
        for (const [customerIdStr, data] of Object.entries(customerOrders)) {
            const customerId = parseInt(customerIdStr);

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

            if (existingBills.length > 0) {
                // Update existing bill
                await db
                    .update(bills)
                    .set({
                        totalAmount: data.total.toString(),
                        items: data.items,
                        updatedAt: new Date()
                    })
                    .where(eq(bills.id, existingBills[0].id));
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

        // All order messages for this milkman placed by any member (either tagged
        // to the group chat or to a member's individual chat).
        const orderMessages = await db
            .select()
            .from(chatMessages)
            .where(
                and(
                    eq(chatMessages.milkmanId, milkmanId),
                    eq(chatMessages.messageType, "order"),
                ),
            );

        let total = 0;
        const items: any[] = [];
        for (const msg of orderMessages) {
            const belongs =
                msg.familyChatId === familyChatId ||
                (msg.customerId != null && customerIds.includes(msg.customerId));
            if (!belongs) continue;
            const amount = msg.orderTotal ? parseFloat(msg.orderTotal) : 0;
            total += amount;
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
            const [updated] = await db
                .update(bills)
                .set({ totalAmount: total.toString(), totalOrders: items.length, items, updatedAt: new Date() })
                .where(eq(bills.id, existing[0].id))
                .returning();
            return updated;
        }

        if (total <= 0) return null;

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
