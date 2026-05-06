import { db } from '../api/db.ts';
import { bills, chatMessages, milkmen } from '../api/schema.ts';
import { eq, and } from 'https://esm.sh/drizzle-orm';

const generateMonthlyBill = async (milkmanId: number) => {
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

        customerOrders[msg.customerId].items.push({
            product: msg.orderProduct || "Order",
            quantity: msg.orderQuantity,
            price: amount / (parseFloat(msg.orderQuantity?.toString() || "1") || 1),
            amount: amount
        });
    });

    for (const [customerIdStr, data] of Object.entries(customerOrders)) {
        const customerId = parseInt(customerIdStr);

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
            await db
                .update(bills)
                .set({
                    totalAmount: data.total.toString(),
                    items: data.items,
                    updatedAt: new Date()
                })
                .where(eq(bills.id, existingBills[0].id));
        } else {
            const [newBill] = await db.insert(bills).values({
                milkmanId,
                customerId,
                billMonth: currentMonth,
                totalAmount: data.total.toString(),
                totalOrders: data.items.length,
                items: data.items,
                status: "pending",
                dueDate: new Date(new Date().setDate(new Date().getDate() + 7)),
            }).returning();

            const [milkmanData] = await db.select().from(milkmen).where(eq(milkmen.id, milkmanId)).limit(1);
            
            await db.insert(chatMessages).values({
                milkmanId,
                customerId,
                senderId: milkmanData?.userId || "system",
                senderType: "milkman",
                message: `📄 Bill Generated for ${currentMonth}\nTotal Amount: ₹${data.total.toFixed(2)}\nDue Date: ${new Date(new Date().setDate(new Date().getDate() + 7)).toLocaleDateString()}`,
                messageType: "bill",
                orderTotal: data.total.toString(),
                billId: newBill.id,
            });
        }
    }
};

Deno.serve(async (req) => {
    // Basic auth check for cron (Supabase sends a specific header or we can use an API key)
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const allMilkmen = await db.select().from(milkmen);
        console.log(`Starting monthly billing for ${allMilkmen.length} milkmen...`);

        for (const milkman of allMilkmen) {
            await generateMonthlyBill(milkman.id);
        }

        return new Response(JSON.stringify({ success: true, message: 'Monthly bills generated' }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
