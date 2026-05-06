import { Hono } from 'https://deno.land/x/hono@v3.11.7/mod.ts';
import { cors } from 'https://deno.land/x/hono@v3.11.7/middleware.ts';
import { authMiddleware } from './middleware.ts';
import ordersApp from './orders.ts';
import usersApp from './users.ts';
import milkmenApp from './milkmen.ts';
import customersApp from './customers.ts';
import chatApp from './chat.ts';
import paymentsApp from './payments.ts';
import serviceRequestsApp from './service-requests.ts';
import subscriptionsApp from './subscriptions.ts';
import deliveryApp from './delivery.ts';
import locationsApp from './locations.ts';
import gatewayApp from './gateway.ts';

const app = new Hono().basePath('/api');

// Middleware
app.use('*', cors());

// Protected Routes
app.use('/orders/*', authMiddleware);
app.route('/orders', ordersApp);

app.use('/users/*', authMiddleware);
app.route('/users', usersApp);

app.use('/milkmen/*', authMiddleware);
app.route('/milkmen', milkmenApp);

app.use('/customers/*', authMiddleware);
app.route('/customers', customersApp);

app.use('/chat/*', authMiddleware);
app.route('/chat', chatApp);

app.use('/bills/*', authMiddleware);
app.route('/bills', paymentsApp);

app.use('/payments/*', authMiddleware);
app.route('/payments', paymentsApp);

app.use('/service-requests/*', authMiddleware);
app.route('/service-requests', serviceRequestsApp);

app.use('/subscriptions/*', authMiddleware);
app.route('/subscriptions', subscriptionsApp);

app.use('/delivery/*', authMiddleware);
app.route('/delivery', deliveryApp);

app.use('/locations/*', authMiddleware);
app.route('/locations', locationsApp);

app.route('/gateway', gatewayApp);

// Public Routes
app.get('/health', (c) => c.json({ status: 'ok', time: new Date().toISOString() }));

// Error handling
app.onError((err, c) => {
  console.error(err);
  return c.json({ success: false, message: err.message }, 500);
});

Deno.serve(app.fetch);
