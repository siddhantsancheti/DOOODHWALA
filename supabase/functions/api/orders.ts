import { Hono } from 'https://deno.land/x/hono@v3.11.7/mod.ts';
import { db } from './db.ts';
import { orders, customers, milkmen, notifications } from './schema.ts';
import { eq, desc } from 'https://esm.sh/drizzle-orm';

const ordersApp = new Hono();

// Helper to get User ID from Supabase Auth
const getUserId = (c: any) => {
  const user = c.get('user');
  return user?.id;
};

// GET /customer
ordersApp.get('/customer', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ message: "Unauthorized" }, 401);

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.userId, userId))
    .limit(1);

  if (!customer) {
    return c.json({ message: "Customer profile not found" }, 404);
  }

  const customerOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.customerId, customer.id))
    .orderBy(desc(orders.createdAt));

  return c.json(customerOrders);
});

// POST /
ordersApp.post('/', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ message: "Unauthorized" }, 401);

  const { milkmanId, quantity, pricePerLiter, deliveryDate, deliveryTime, specialInstructions } = await c.req.json();

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.userId, userId))
    .limit(1);

  if (!customer) {
    return c.json({ message: "Complete your profile before ordering" }, 400);
  }

  const totalAmount = (parseFloat(quantity) * parseFloat(pricePerLiter)).toString();

  const [newOrder] = await db
    .insert(orders)
    .values({
      customerId: customer.id,
      milkmanId,
      orderedBy: userId,
      quantity: quantity.toString(),
      pricePerLiter: pricePerLiter.toString(),
      totalAmount,
      status: "pending",
      deliveryDate: new Date(deliveryDate),
      deliveryTime,
      specialInstructions,
    })
    .returning();

  // Notify Milkman
  const [milkman] = await db
    .select()
    .from(milkmen)
    .where(eq(milkmen.id, milkmanId))
    .limit(1);

  if (milkman) {
    await db.insert(notifications).values({
      userId: milkman.userId,
      title: "New Order Received",
      message: `New order for ${quantity}L milk from a customer.`,
      type: "order",
      relatedId: newOrder.id,
      isRead: false
    });
  }

  return c.json(newOrder);
});

export default ordersApp;
