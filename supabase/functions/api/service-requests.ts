import { Hono } from 'https://deno.land/x/hono@v3.11.7/mod.ts';
import { db } from './db.ts';
import { serviceRequests, customers, milkmen } from './schema.ts';
import { eq, desc, ne, and } from 'https://esm.sh/drizzle-orm';

const serviceRequestsApp = new Hono();

const getUserId = (c: any) => {
  const user = c.get('user');
  return user?.id;
};

// GET /test
serviceRequestsApp.get('/test', (c) => c.json({ message: "Service requests route working" }));

// GET /customer
serviceRequestsApp.get('/customer', async (c) => {
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

  const requests = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.customerId, customer.id))
    .orderBy(desc(serviceRequests.createdAt));

  return c.json(requests);
});

// GET /milkman
serviceRequestsApp.get('/milkman', async (c) => {
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

  const requests = await db
    .select({
      id: serviceRequests.id,
      customerId: serviceRequests.customerId,
      milkmanId: serviceRequests.milkmanId,
      services: serviceRequests.services,
      status: serviceRequests.status,
      milkmanNotes: serviceRequests.milkmanNotes,
      customerNotes: serviceRequests.customerNotes,
      createdAt: serviceRequests.createdAt,
      customer: {
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        address: customers.address,
        userId: customers.userId
      }
    })
    .from(serviceRequests)
    .leftJoin(customers, eq(serviceRequests.customerId, customers.id))
    .where(
      and(
        eq(serviceRequests.milkmanId, milkman.id),
        ne(serviceRequests.status, "rejected"),
        ne(serviceRequests.status, "accepted")
      )
    )
    .orderBy(desc(serviceRequests.createdAt));

  return c.json(requests);
});

// POST /
serviceRequestsApp.post('/', async (c) => {
  const userId = getUserId(c);
  if (!userId) return c.json({ message: "Unauthorized" }, 401);

  const { milkmanId, services, customerNotes } = await c.req.json();

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.userId, userId))
    .limit(1);

  if (!customer) {
    return c.json({ message: "Complete your profile first" }, 400);
  }

  const [newRequest] = await db
    .insert(serviceRequests)
    .values({
      customerId: customer.id,
      milkmanId,
      services,
      customerNotes,
      status: "pending",
    })
    .returning();

  return c.json(newRequest);
});

// POST /:id/approve
serviceRequestsApp.post('/:id/approve', async (c) => {
  const requestId = parseInt(c.req.param('id'));
  const body = await c.req.json().catch(() => ({}));
  const { services } = body;

  const [request] = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.id, requestId))
    .limit(1);

  if (!request) {
    return c.json({ message: "Request not found" }, 404);
  }

  const [updatedRequest] = await db
    .update(serviceRequests)
    .set({
      status: "accepted",
      services: services || request.services,
      respondedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(serviceRequests.id, requestId))
    .returning();

  await db
    .update(customers)
    .set({
      assignedMilkmanId: request.milkmanId,
      updatedAt: new Date()
    })
    .where(eq(customers.id, request.customerId));

  return c.json(updatedRequest);
});

// POST /:id/reject
serviceRequestsApp.post('/:id/reject', async (c) => {
  const requestId = parseInt(c.req.param('id'));

  const [updatedRequest] = await db
    .update(serviceRequests)
    .set({
      status: "rejected",
      respondedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(serviceRequests.id, requestId))
    .returning();

  return c.json(updatedRequest);
});

// PATCH /:id/status
serviceRequestsApp.patch('/:id/status', async (c) => {
  const requestId = parseInt(c.req.param('id'));
  const { status } = await c.req.json();

  if (!['accepted', 'rejected'].includes(status)) {
    return c.json({ message: "Invalid status" }, 400);
  }

  const [updatedRequest] = await db
    .update(serviceRequests)
    .set({
      status,
      respondedAt: new Date()
    })
    .where(eq(serviceRequests.id, requestId))
    .returning();

  return c.json(updatedRequest);
});

export default serviceRequestsApp;
