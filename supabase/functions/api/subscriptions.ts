import { Hono } from 'https://deno.land/x/hono@v3.11.7/mod.ts';
import { db } from './db.ts';
import { subscriptions, customers, milkmen } from './schema.ts';
import { eq, and, desc } from 'https://esm.sh/drizzle-orm';

const subscriptionsApp = new Hono();

const getUserId = (c: any) => {
  const user = c.get('user');
  return user?.id;
};

// POST /
subscriptionsApp.post('/', async (c) => {
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

  const {
    milkmanId,
    productName,
    quantity,
    unit,
    priceSnapshot,
    frequencyType,
    daysOfWeek,
    startDate,
    endDate,
    specialInstructions,
  } = await c.req.json();

  if (!milkmanId || !productName || !quantity || !frequencyType || !startDate) {
    return c.json({ message: "Missing required fields" }, 400);
  }

  const [newSubscription] = await db
    .insert(subscriptions)
    .values({
      customerId: customer.id,
      milkmanId,
      productName,
      quantity: quantity.toString(),
      unit: unit || "liter",
      priceSnapshot: priceSnapshot?.toString(),
      frequencyType,
      daysOfWeek: daysOfWeek || null,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      isActive: true,
      specialInstructions: specialInstructions || null,
    })
    .returning();

  return c.json(newSubscription);
});

// GET /customer
subscriptionsApp.get('/customer', async (c) => {
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

  const customerSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.customerId, customer.id))
    .orderBy(desc(subscriptions.createdAt));

  return c.json(customerSubscriptions);
});

// GET /milkman
subscriptionsApp.get('/milkman', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ message: "Unauthorized" }, 401);

  const [milkman] = await db
    .select()
    .from(milkmen)
    .where(eq(milkmen.userId, userId))
    .limit(1);

  if (!milkman) {
    return c.json({ message: "Milkman profile not found" }, 404);
  }

  const milkmanSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.milkmanId, milkman.id))
    .orderBy(desc(subscriptions.createdAt));

  return c.json(milkmanSubscriptions);
});

// PATCH /:id/toggle
subscriptionsApp.patch('/:id/toggle', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ message: "Unauthorized" }, 401);

  const subscriptionId = parseInt(c.req.param('id'));

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.userId, userId))
    .limit(1);

  if (!customer) {
    return c.json({ message: "Customer profile not found" }, 404);
  }

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.customerId, customer.id)))
    .limit(1);

  if (!existing) {
    return c.json({ message: "Subscription not found" }, 404);
  }

  const [updated] = await db
    .update(subscriptions)
    .set({
      isActive: !existing.isActive,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscriptionId))
    .returning();

  return c.json(updated);
});

// PATCH /:id
subscriptionsApp.patch('/:id', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ message: "Unauthorized" }, 401);

  const subscriptionId = parseInt(c.req.param('id'));
  const body = await c.req.json();

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.userId, userId))
    .limit(1);

  if (!customer) {
    return c.json({ message: "Customer profile not found" }, 404);
  }

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.customerId, customer.id)))
    .limit(1);

  if (!existing) {
    return c.json({ message: "Subscription not found" }, 404);
  }

  const updateData: any = { updatedAt: new Date() };
  if (body.quantity !== undefined) updateData.quantity = body.quantity.toString();
  if (body.frequencyType !== undefined) updateData.frequencyType = body.frequencyType;
  if (body.daysOfWeek !== undefined) updateData.daysOfWeek = body.daysOfWeek;
  if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
  if (body.specialInstructions !== undefined) updateData.specialInstructions = body.specialInstructions;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;

  const [updated] = await db
    .update(subscriptions)
    .set(updateData)
    .where(eq(subscriptions.id, subscriptionId))
    .returning();

  return c.json(updated);
});

// DELETE /:id
subscriptionsApp.delete('/:id', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ message: "Unauthorized" }, 401);

  const subscriptionId = parseInt(c.req.param('id'));

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.userId, userId))
    .limit(1);

  if (!customer) {
    return c.json({ message: "Customer profile not found" }, 404);
  }

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.customerId, customer.id)))
    .limit(1);

  if (!existing) {
    return c.json({ message: "Subscription not found" }, 404);
  }

  await db.delete(subscriptions).where(eq(subscriptions.id, subscriptionId));

  return c.json({ message: "Subscription deleted" });
});

export default subscriptionsApp;
