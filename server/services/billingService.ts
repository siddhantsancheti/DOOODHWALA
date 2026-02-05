import { db } from "../db";
import { bills, chatMessages, milkmen } from "@shared/schema";
import { eq, and } from "drizzle-orm";

export class BillingService {
    static async generateMonthlyBill(milkmanId: number): Promise<void> {
        const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

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

            // Add item details
            customerOrders[msg.customerId].items.push({
                product: msg.orderProduct || "Order",
                quantity: msg.orderQuantity,
                price: amount / (parseFloat(msg.orderQuantity?.toString() || "1") || 1), // Approximate unit price
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
                await db.insert(bills).values({
                    milkmanId,
                    customerId,
                    billMonth: currentMonth,
                    totalAmount: data.total.toString(),
                    totalOrders: data.items.length,
                    items: data.items,
                    status: "pending",
                    dueDate: new Date(new Date().setDate(new Date().getDate() + 7)), // Due in 7 days
                });
            }
        }
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
