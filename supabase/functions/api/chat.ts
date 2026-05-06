import { Hono } from 'https://deno.land/x/hono@v3.11.7/mod.ts';
import { db } from './db.ts';
import { chatMessages, orders, milkmen, notifications, users, customers } from './schema.ts';
import { eq, and, asc } from 'https://esm.sh/drizzle-orm';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const chatApp = new Hono();

const getUserId = (c: any) => {
  const user = c.get('user');
  return user?.id;
};

// Helper to broadcast via Supabase Realtime
const broadcast = async (payload: any) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  await supabase.channel('chat_updates').send({
    type: 'broadcast',
    event: 'update',
    payload,
  });
};

// GET /messages
chatApp.get('/messages', async (c) => {
  const { milkmanId, customerId } = c.req.query();

  if (!milkmanId || !customerId) {
    return c.json({ message: "Milkman ID and Customer ID required" }, 400);
  }

  const messages = await db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.milkmanId, parseInt(milkmanId)),
        eq(chatMessages.customerId, parseInt(customerId))
      )
    )
    .orderBy(asc(chatMessages.createdAt));

  return c.json(messages);
});

// POST /messages
chatApp.post('/messages', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ message: "Unauthorized" }, 401);

  const body = await c.req.json();
  const { milkmanId, customerId, message, senderType, messageType = "text", orderQuantity, orderProduct, orderTotal } = body;

  const [newMessage] = await db
    .insert(chatMessages)
    .values({
      milkmanId,
      customerId,
      senderId: userId,
      message,
      senderType,
      messageType,
      orderQuantity: orderQuantity?.toString(),
      orderProduct,
      orderTotal: orderTotal?.toString(),
      isRead: false,
    })
    .returning();

  // Broadcast the new message
  await broadcast({
    type: 'new_message',
    message: newMessage,
  });

  return c.json(newMessage);
});

// POST /messages/:id/accepted
chatApp.post('/messages/:id/accepted', async (c) => {
  const messageId = parseInt(c.req.param('id'));
  
  const [updatedMessage] = await db
    .update(chatMessages)
    .set({
      isAccepted: true,
      acceptedAt: new Date(),
    })
    .where(eq(chatMessages.id, messageId))
    .returning();

  if (!updatedMessage) return c.json({ message: "Message not found" }, 404);

  // Logic to create order and update inventory...
  // (Simplified for now, similar to Express logic)
  
  await broadcast({
    type: "order_accepted",
    messageId: updatedMessage.id,
    customerId: updatedMessage.customerId,
    milkmanId: updatedMessage.milkmanId
  });

  return c.json(updatedMessage);
});

export default chatApp;
