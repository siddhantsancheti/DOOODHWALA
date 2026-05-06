import { Hono } from 'https://deno.land/x/hono@v3.11.7/mod.ts';
import { db } from './db.ts';
import { bills, payments, customers } from './schema.ts';
import { eq, desc, and } from 'https://esm.sh/drizzle-orm';
import Razorpay from 'https://esm.sh/razorpay@2.9.2';
import Stripe from 'https://esm.sh/stripe@14.16.0';

const paymentsApp = new Hono();

const getUserId = (c: any) => {
  const user = c.get('user');
  return user?.id;
};

// Razorpay Setup
const getRazorpay = () => new Razorpay({
  key_id: Deno.env.get('RAZORPAY_KEY_ID') || '',
  key_secret: Deno.env.get('RAZORPAY_KEY_SECRET') || '',
});

// GET /current (Current month bill for the logged in customer)
paymentsApp.get('/current', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ message: "Unauthorized" }, 401);

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.userId, userId))
    .limit(1);

  if (!customer) return c.json({ message: "Customer profile not found" }, 404);

  const [currentBill] = await db
    .select()
    .from(bills)
    .where(and(eq(bills.customerId, customer.id), eq(bills.status, "pending")))
    .orderBy(desc(bills.createdAt))
    .limit(1);

  if (!currentBill) return c.json({ totalOrders: 0, totalAmount: "0" });

  return c.json(currentBill);
});

// POST /razorpay/create-order
paymentsApp.post('/razorpay/create-order', async (c) => {
  const { amount, orderId, description } = await c.req.json();
  const razorpay = getRazorpay();

  const options = {
    amount: Math.round(amount * 100),
    currency: "INR",
    receipt: orderId?.toString(),
    notes: { description: description || "Dooodhwala Payment" }
  };

  const order = await razorpay.orders.create(options);
  return c.json({ success: true, razorpayOrderId: order.id });
});

export default paymentsApp;
