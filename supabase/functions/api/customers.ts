import { Hono } from 'https://deno.land/x/hono@v3.11.7/mod.ts';
import { db } from './db.ts';
import { customers, users, bills } from './schema.ts';
import { eq, and } from 'https://esm.sh/drizzle-orm';

const customersApp = new Hono();

const getUserId = (c: any) => {
  const user = c.get('user');
  return user?.id;
};

// GET /profile
customersApp.get('/profile', async (c) => {
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

  return c.json(customer);
});

// PATCH /profile
customersApp.patch('/profile', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ message: "Unauthorized" }, 401);

  const { name, email, address, latitude, longitude, settings } = await c.req.json();
  const phone = c.get('user')?.phone || "";

  const [existingCustomer] = await db
    .select()
    .from(customers)
    .where(eq(customers.userId, userId))
    .limit(1);

  let updatedCustomer;

  if (existingCustomer) {
    [updatedCustomer] = await db
      .update(customers)
      .set({
        name,
        phone,
        address,
        settings,
        latitude: latitude?.toString(),
        longitude: longitude?.toString(),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, existingCustomer.id))
      .returning();
  } else {
    [updatedCustomer] = await db
      .insert(customers)
      .values({
        userId,
        name,
        phone,
        address,
        settings,
        latitude: latitude?.toString(),
        longitude: longitude?.toString(),
      })
      .returning();
  }

  if (email) {
    await db.update(users).set({ email }).where(eq(users.id, userId));
  }

  await db.update(users).set({ userType: "customer" }).where(eq(users.id, userId));

  return c.json(updatedCustomer);
});

// POST /assign-yd
customersApp.post('/assign-yd', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ message: "Unauthorized" }, 401);

  const { milkmanId } = await c.req.json();
  if (!milkmanId) return c.json({ message: "Milkman ID is required" }, 400);

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.userId, userId))
    .limit(1);

  if (!customer) {
    return c.json({ message: "Customer profile not found" }, 404);
  }

  const [updatedCustomer] = await db
    .update(customers)
    .set({
      assignedMilkmanId: milkmanId,
      updatedAt: new Date()
    })
    .where(eq(customers.id, customer.id))
    .returning();

  return c.json(updatedCustomer);
});

export default customersApp;
