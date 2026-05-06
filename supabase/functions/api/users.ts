import { Hono } from 'https://deno.land/x/hono@v3.11.7/mod.ts';
import { db } from './db.ts';
import { users } from './schema.ts';
import { eq } from 'https://esm.sh/drizzle-orm';

const usersApp = new Hono();

const getUserId = (c: any) => {
  const user = c.get('user');
  return user?.id;
};

// PATCH /profile
usersApp.patch('/profile', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ message: "Unauthorized" }, 401);

  const { firstName, lastName, email, name } = await c.req.json();

  const updateData: any = {};
  if (email !== undefined) updateData.email = email;
  
  if (name && (!firstName || !lastName)) {
    const parts = name.trim().split(/\s+/);
    updateData.firstName = parts[0] || "";
    updateData.lastName = parts.slice(1).join(" ") || "";
  } else {
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
  }

  updateData.updatedAt = new Date();

  await db.update(users)
    .set(updateData)
    .where(eq(users.id, userId));

  return c.json({ success: true, message: "Profile updated successfully" });
});

// PATCH /fcm-token
usersApp.patch('/fcm-token', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ message: "Unauthorized" }, 401);

  const { fcmToken } = await c.req.json();
  if (!fcmToken) return c.json({ message: "fcmToken is required" }, 400);

  await db.update(users)
    .set({ fcmToken })
    .where(eq(users.id, userId));

  return c.json({ success: true, message: "FCM token updated successfully" });
});

export default usersApp;
