import { Hono } from 'https://deno.land/x/hono@v3.11.7/mod.ts';
import { db } from './db.ts';
import { milkmen, users, products, customers } from './schema.ts';
import { eq, asc, and } from 'https://esm.sh/drizzle-orm';

const milkmenApp = new Hono();

const getUserId = (c: any) => {
  const user = c.get('user');
  return user?.id;
};

// GET /
milkmenApp.get('/', async (c) => {
  const allMilkmen = await db.select().from(milkmen);
  return c.json(allMilkmen);
});

// GET /customers
milkmenApp.get('/customers', async (c) => {
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

  const assignedCustomers = await db
    .select()
    .from(customers)
    .where(eq(customers.assignedMilkmanId, milkman.id))
    .orderBy(asc(customers.routeOrder));

  return c.json(assignedCustomers);
});

// GET /profile
milkmenApp.get('/profile', async (c) => {
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

  return c.json(milkman);
});

// POST /
milkmenApp.post('/', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ message: "Unauthorized" }, 401);

  const body = await c.req.json();
  const { contactName, businessName, address, pricePerLiter, deliveryTimeStart, deliveryTimeEnd, dairyItems, deliverySlots } = body;

  const [existingMilkman] = await db
    .select()
    .from(milkmen)
    .where(eq(milkmen.userId, userId))
    .limit(1);

  if (existingMilkman) {
    const [updatedMilkman] = await db
      .update(milkmen)
      .set({
        contactName,
        businessName,
        address,
        pricePerLiter: pricePerLiter?.toString(),
        deliveryTimeStart,
        deliveryTimeEnd,
        dairyItems,
        deliverySlots,
        updatedAt: new Date(),
      })
      .where(eq(milkmen.id, existingMilkman.id))
      .returning();

    return c.json(updatedMilkman);
  }

  const [newMilkman] = await db
    .insert(milkmen)
    .values({
      userId,
      contactName,
      businessName,
      phone: c.get('user')?.phone || "",
      address,
      pricePerLiter: pricePerLiter?.toString() || "60",
      deliveryTimeStart: deliveryTimeStart || "06:00",
      deliveryTimeEnd: deliveryTimeEnd || "09:00",
      dairyItems: dairyItems || [],
      deliverySlots: deliverySlots || [],
    })
    .returning();

  await db.update(users).set({ userType: "milkman" }).where(eq(users.id, userId));

  return c.json(newMilkman);
});

export default milkmenApp;
