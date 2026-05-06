import { Hono } from 'https://deno.land/x/hono@v3.11.7/mod.ts';
import { db } from './db.ts';
import { locations } from './schema.ts';
import { eq, desc } from 'https://esm.sh/drizzle-orm';

const locationsApp = new Hono();

// GET /milkman/:milkmanId
locationsApp.get('/milkman/:milkmanId', async (c) => {
  const milkmanId = parseInt(c.req.param('milkmanId'));

  const [latestLocation] = await db
    .select()
    .from(locations)
    .where(eq(locations.milkmanId, milkmanId))
    .orderBy(desc(locations.timestamp))
    .limit(1);

  if (!latestLocation) {
    return c.json({ message: "Location not found" }, 404);
  }

  return c.json(latestLocation);
});

// POST /
locationsApp.post('/', async (c) => {
  const { milkmanId, latitude, longitude } = await c.req.json();

  const [newLocation] = await db
    .insert(locations)
    .values({
      milkmanId,
      latitude: latitude.toString(),
      longitude: longitude.toString(),
    })
    .returning();

  return c.json(newLocation);
});

export default locationsApp;
