import { Hono } from 'https://deno.land/x/hono@v3.11.7/mod.ts';
import { db } from './db.ts';
import { smsQueue } from './schema.ts';
import { eq, and, lt } from 'https://esm.sh/drizzle-orm';

const gatewayApp = new Hono();

// Security: Simple API Key for the Gateway
const GATEWAY_SECRET = Deno.env.get('GATEWAY_SECRET');

if (!GATEWAY_SECRET) {
  console.error("GATEWAY_SECRET is not set. Android Gateway integration will fail.");
}

// Middleware to check Gateway Secret
const requireGatewayAuth = async (c: any, next: any) => {
  const secret = c.req.header('x-gateway-secret');
  if (secret !== GATEWAY_SECRET) {
    return c.json({ message: "Unauthorized Gateway" }, 401);
  }
  await next();
};

// GET /pending
// Fetch pending SMS messages to send
gatewayApp.get('/pending', requireGatewayAuth, async (c) => {
  try {
    // Fetch up to 10 pending messages
    const pendingMessages = await db
      .select()
      .from(smsQueue)
      .where(
        and(
          eq(smsQueue.status, "pending"),
          lt(smsQueue.attempts, 3)
        )
      )
      .limit(10);

    return c.json({ success: true, messages: pendingMessages });
  } catch (error) {
    console.error("[Gateway] Error fetching pending messages:", error);
    return c.json({ message: "Server error" }, 500);
  }
});

// POST /status
// Update message status (sent/failed)
gatewayApp.post('/status', requireGatewayAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { id, status, error } = body;

    if (!id || !status) {
      return c.json({ message: "Missing id or status" }, 400);
    }

    await db
      .update(smsQueue)
      .set({
        status,
        updatedAt: new Date(),
        lastAttemptAt: new Date(),
      })
      .where(eq(smsQueue.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("[Gateway] Error updating status:", error);
    return c.json({ message: "Server error" }, 500);
  }
});

export default gatewayApp;
