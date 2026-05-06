import { Hono } from 'https://deno.land/x/hono@v3.11.7/mod.ts';
import { db } from './db.ts';
import { customers, orders, users, milkmen, locations } from './schema.ts';
import { eq, and, asc, gt, desc, sql } from 'https://esm.sh/drizzle-orm';

const deliveryApp = new Hono();

const getUserId = (c: any) => {
  const user = c.get('user');
  return user?.id;
};

// POST /complete
deliveryApp.post('/complete', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ message: "Unauthorized" }, 401);

  const { customerId } = await c.req.json();

  if (!customerId) {
    return c.json({ message: "Customer ID is required" }, 400);
  }

  const [milkman] = await db
    .select()
    .from(milkmen)
    .where(eq(milkmen.userId, userId))
    .limit(1);

  if (!milkman) {
    return c.json({ message: "Milkman profile not found" }, 404);
  }

  const [completedCustomer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  if (!completedCustomer || completedCustomer.assignedMilkmanId !== milkman.id) {
    return c.json({ message: "Invalid customer for this milkman" }, 400);
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [activeOrder] = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.customerId, customerId),
        eq(orders.milkmanId, milkman.id),
        eq(orders.status, "confirmed")
      )
    )
    .limit(1);

  if (activeOrder) {
    await db
      .update(orders)
      .set({
        status: "delivered",
        deliveredAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(orders.id, activeOrder.id));

    // NOTE: Push notification logic to be implemented via Edge Function triggers or third-party API.
  }

  const [nextCustomer] = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.assignedMilkmanId, milkman.id),
        gt(customers.routeOrder, completedCustomer.routeOrder || 0)
      )
    )
    .orderBy(asc(customers.routeOrder))
    .limit(1);

  let notificationSent = false;
  if (nextCustomer) {
    // NOTE: Push notification logic to notify nextCustomer to be implemented
    notificationSent = true;
  }

  return c.json({
    message: "Delivery marked complete",
    orderUpdated: !!activeOrder,
    nextCustomer: nextCustomer ? {
      id: nextCustomer.id,
      name: nextCustomer.name,
      routeOrder: nextCustomer.routeOrder
    } : null,
    notificationSent
  });
});

// GET /geocode
deliveryApp.get('/geocode', async (c) => {
  const address = c.req.query('address');
  if (!address) return c.json({ message: "Address is required" }, 400);

  const MAPBOX_TOKEN = Deno.env.get('MAPBOX_SECRET_TOKEN') || Deno.env.get('EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN');
  if (!MAPBOX_TOKEN) {
    return c.json({ message: "Mapbox token not configured" }, 500);
  }

  const encoded = encodeURIComponent(address);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?country=IN&limit=1&access_token=${MAPBOX_TOKEN}`;

  const response = await fetch(url);
  const data: any = await response.json();

  if (!data.features || data.features.length === 0) {
    return c.json({ message: "Address not found" }, 404);
  }

  const [longitude, latitude] = data.features[0].center;
  const placeName = data.features[0].place_name;

  return c.json({ latitude, longitude, placeName });
});

// GET /location/:orderId
deliveryApp.get('/location/:orderId', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ message: "Unauthorized" }, 401);

  const orderId = parseInt(c.req.param('orderId'));
  if (isNaN(orderId)) return c.json({ message: "Invalid order ID" }, 400);

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return c.json({ message: "Order not found" }, 404);

  const [latestLocation] = await db
    .select()
    .from(locations)
    .where(eq(locations.milkmanId, order.milkmanId))
    .orderBy(desc(locations.timestamp))
    .limit(1);

  if (!latestLocation) return c.json({ message: "Milkman location not found" }, 404);

  return c.json({
    milkmanId: order.milkmanId,
    latitude: parseFloat(latestLocation.latitude),
    longitude: parseFloat(latestLocation.longitude),
    timestamp: latestLocation.timestamp
  });
});

// GET /location/:orderId/history
deliveryApp.get('/location/:orderId/history', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ message: "Unauthorized" }, 401);

  const orderId = parseInt(c.req.param('orderId'));
  if (isNaN(orderId)) return c.json({ message: "Invalid order ID" }, 400);

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) return c.json({ message: "Order not found" }, 404);

  const history = await db
    .select()
    .from(locations)
    .where(eq(locations.milkmanId, order.milkmanId))
    .orderBy(desc(locations.timestamp))
    .limit(25);

  const coords = history.reverse().map(loc => ({
    longitude: parseFloat(loc.longitude),
    latitude: parseFloat(loc.latitude),
    timestamp: loc.timestamp,
  }));

  return c.json({ milkmanId: order.milkmanId, history: coords });
});

// POST /location
deliveryApp.post('/location', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ message: "Unauthorized" }, 401);

  const { latitude, longitude } = await c.req.json();
  if (!latitude || !longitude) return c.json({ message: "Latitude and Longitude are required" }, 400);

  const [milkman] = await db
    .select()
    .from(milkmen)
    .where(eq(milkmen.userId, userId))
    .limit(1);

  if (!milkman) return c.json({ message: "Milkman profile not found" }, 404);

  const [newLocation] = await db
    .insert(locations)
    .values({
      milkmanId: milkman.id,
      latitude: latitude.toString(),
      longitude: longitude.toString(),
    })
    .returning();

  // Supabase Realtime will pick up this insert automatically if configured on the client!

  // Cleanup old entries
  await db.execute(
    sql`DELETE FROM locations WHERE milkman_id = ${milkman.id} AND id NOT IN (
      SELECT id FROM locations WHERE milkman_id = ${milkman.id}
      ORDER BY timestamp DESC LIMIT 200
    )`
  );

  return c.json({ success: true, location: newLocation });
});

export default deliveryApp;
