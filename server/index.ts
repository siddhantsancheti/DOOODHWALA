import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cron from "node-cron";
import { BillingService } from "./services/billingService";

const app = express();

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false, // typically disabled for Vite dev server / dynamic apps unless configured carefully
}));
const allowedOrigins = [
    "https://dooodhwala-production.up.railway.app",
    "https://dooodhwala.com",
    "http://localhost:5001",
    "http://localhost:5173"
];

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps, curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 requests per `window` (here, per 15 minutes)
    standardHeaders: true,
    legacyHeaders: false,
});
// Apply rate limiter only to API routes
app.use("/api", limiter);

// Stripe webhook must use raw body parsing
app.use("/api/payments/stripe/webhook", express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve uploaded files
import path from "path";
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api")) {
            let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
            if (capturedJsonResponse) {
                logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
            }

            if (logLine.length > 80) {
                logLine = logLine.slice(0, 79) + "…";
            }

            log(logLine);
        }
    });

    next();
});

(async () => {
    // Startup Environment Validation
    const requiredEnvVars = process.env.NODE_ENV === 'production'
        ? [
            "RAZORPAY_KEY_ID",
            "RAZORPAY_KEY_SECRET",
            "STRIPE_SECRET_KEY",
            "JWT_SECRET",
            "CLOUDINARY_CLOUD_NAME",
            "CLOUDINARY_API_KEY",
            "CLOUDINARY_API_SECRET",
            "GATEWAY_SECRET"
        ]
        : ["JWT_SECRET"]; // Only JWT_SECRET is required in dev

    const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);

    if (missingEnvVars.length > 0) {
        console.error("Critical Error: Missing required environment variables:", missingEnvVars.join(", "));
        console.error("Please set these variables in your .env file or environment.");
        process.exit(1);
    }

    const server = registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";

        // Structured error response
        const errorResponse: any = {
            success: false,
            message,
        };

        // Only include stack trace in development
        if (process.env.NODE_ENV !== 'production') {
            errorResponse.error = err.stack;
        }

        // Send JSON response
        res.status(status).json(errorResponse);

        // Log the error but do not throw it to avoid crashing the server loop
        console.error(`[Error Handler] ${status} - ${message}`, err);
    });

    if (app.get("env") === "development") {
        await setupVite(app, server);
    } else {
        serveStatic(app);
    }

    // Schedule Monthly Billing Job (Midnight on 1st of every month)
    cron.schedule("0 0 1 * *", async () => {
        console.log("Running monthly billing cron job...");
        try {
            await BillingService.generateAllMonthlyBills();
        } catch (error) {
            console.error("Error in monthly billing cron job:", error);
        }
    });

    // Schedule SMS Retry Job (Every 15 minutes)
    cron.schedule("*/15 * * * *", async () => {
        console.log("Running SMS retry job...");
        try {
            // Dynamically import to avoid circular dependencies if any, or just import at top
            const { retryFailedMessages } = await import("./gatewayRoutes");
            await retryFailedMessages();
        } catch (error) {
            console.error("Error in SMS retry job:", error);
        }
    });

    // Schedule Daily Order Processing (Every hour)
    cron.schedule("0 * * * *", async () => {
        const hour = new Date().getHours();
        const timeString = `${hour.toString().padStart(2, '0')}:00`;
        console.log(`Running Daily Order job for ${timeString}...`);

        try {
            // 1. Find customers with auto-send enabled and matching time
            const { customers, orders, chatMessages, milkmen } = await import("../shared/schema");
            const { db } = await import("./db");
            const { eq, and, sql } = await import("drizzle-orm");

            // Fetch potential customers (filtering by JSON in JS for simplicity or complex SQL if needed)
            // Note: In a real app, we'd use a more efficient query. Here we'll fetch active ones.
            const allCustomers = await db.select().from(customers);

            const dueCustomers = allCustomers.filter(c => {
                const preset = c.presetOrder as any;
                return preset && preset.autoSend === true && preset.scheduleTime === timeString;
            });

            console.log(`Found ${dueCustomers.length} due daily orders.`);

            for (const customer of dueCustomers) {
                const preset = customer.presetOrder as any;
                if (!preset?.items?.length) continue;

                const item = preset.items[0];

                // 2. Check if order already placed today to prevent duplicates
                // Simple check: Look for an order created today by this customer
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);

                const existingOrder = await db.select().from(orders).where(
                    and(
                        eq(orders.customerId, customer.id),
                        sql`${orders.createdAt} >= ${todayStart.toISOString()}`
                    )
                ).limit(1);

                if (existingOrder.length > 0) {
                    console.log(`Skipping ${customer.name}: Order already exists for today.`);
                    continue;
                }

                // 3. Place Order
                const [milkman] = await db.select().from(milkmen).where(eq(milkmen.id, customer.assignedMilkmanId!)).limit(1);

                if (!milkman) continue;

                // Calculate price
                const dairyItems = milkman.dairyItems as any[] || [];
                const product = dairyItems.find((p: any) => p.name === item.product);
                const pricePerLiter = product ? parseFloat(product.price) : parseFloat(milkman.pricePerLiter as string); // Fallback
                const totalAmount = (parseFloat(item.quantity) * pricePerLiter).toFixed(2);

                const [newOrder] = await db.insert(orders).values({
                    customerId: customer.id,
                    milkmanId: milkman.id,
                    quantity: item.quantity,
                    pricePerLiter: pricePerLiter.toString(),
                    totalAmount: totalAmount,
                    status: "pending",
                    deliveryDate: new Date(),
                    orderedBy: customer.userId, // Assuming customer ordered it
                }).returning();

                // 4. Send Message to Chat
                const orderMessage = `Daily Order: ${item.quantity} ${item.unit} of ${item.product}`;
                await db.insert(chatMessages).values({
                    customerId: customer.id,
                    milkmanId: milkman.id,
                    senderId: customer.userId,
                    senderType: "customer",
                    message: orderMessage,
                    messageType: "order",
                    orderQuantity: item.quantity,
                    orderProduct: item.product,
                    orderTotal: totalAmount,
                });

                console.log(`Placed daily order for ${customer.name}`);
            }

        } catch (error) {
            console.error("Error in Daily Order job:", error);
        }
    });

    // Schedule Subscription Order Processing (Daily at 5:00 AM IST = 23:30 UTC previous day)
    cron.schedule("30 23 * * *", async () => {
        console.log("Running Subscription Order Processing...");
        try {
            const { subscriptions, customers, orders, chatMessages, milkmen } = await import("../shared/schema");
            const { db } = await import("./db");
            const { eq, and, sql } = await import("drizzle-orm");

            const now = new Date();
            // IST is UTC+5:30, so at 23:30 UTC it's 5:00 AM IST next day
            const istNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
            const today = istNow.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
            const todayDate = istNow.getDate();

            // Fetch all active subscriptions
            const activeSubscriptions = await db.select().from(subscriptions).where(
                eq(subscriptions.isActive, true)
            );

            console.log(`Found ${activeSubscriptions.length} active subscriptions.`);

            for (const sub of activeSubscriptions) {
                // Check if subscription has started
                if (new Date(sub.startDate) > istNow) continue;
                // Check if subscription has ended
                if (sub.endDate && new Date(sub.endDate) < istNow) continue;

                // Check frequency
                let isDue = false;
                if (sub.frequencyType === "daily") {
                    isDue = true;
                } else if (sub.frequencyType === "weekly") {
                    const days = (sub.daysOfWeek as number[]) || [];
                    isDue = days.includes(today);
                } else if (sub.frequencyType === "monthly") {
                    // Monthly: deliver on 1st of each month (or custom days)
                    const days = (sub.daysOfWeek as number[]) || [1];
                    isDue = days.includes(todayDate);
                }

                if (!isDue) continue;

                // Prevent duplicate: check if order already placed today for this subscription
                const todayStart = new Date(istNow);
                todayStart.setHours(0, 0, 0, 0);

                const existingOrder = await db.select().from(chatMessages).where(
                    and(
                        eq(chatMessages.customerId, sub.customerId),
                        eq(chatMessages.milkmanId, sub.milkmanId),
                        sql`${chatMessages.message} LIKE ${'🔄 Subscription:%'}`,
                        sql`${chatMessages.createdAt} >= ${todayStart.toISOString()}`
                    )
                ).limit(1);

                if (existingOrder.length > 0) {
                    console.log(`Skipping subscription #${sub.id}: already processed today.`);
                    continue;
                }

                // Get customer and milkman info
                const [customer] = await db.select().from(customers).where(eq(customers.id, sub.customerId)).limit(1);
                const [milkman] = await db.select().from(milkmen).where(eq(milkmen.id, sub.milkmanId)).limit(1);
                if (!customer || !milkman) continue;

                // Calculate price
                const dairyItems = (milkman.dairyItems as any[]) || [];
                const product = dairyItems.find((p: any) => p.name === sub.productName);
                const price = sub.priceSnapshot
                    ? parseFloat(sub.priceSnapshot)
                    : (product ? parseFloat(product.price) : parseFloat(milkman.pricePerLiter as string));
                const totalAmount = (parseFloat(sub.quantity) * price).toFixed(2);

                // Create order
                await db.insert(orders).values({
                    customerId: sub.customerId,
                    milkmanId: sub.milkmanId,
                    quantity: sub.quantity,
                    pricePerLiter: price.toString(),
                    totalAmount: totalAmount,
                    status: "pending",
                    deliveryDate: new Date(),
                    orderedBy: customer.userId,
                }).returning();

                // Send chat message
                const orderMessage = `🔄 Subscription: ${sub.quantity} ${sub.unit || 'liter'} of ${sub.productName}${sub.specialInstructions ? ` (${sub.specialInstructions})` : ''}`;
                await db.insert(chatMessages).values({
                    customerId: sub.customerId,
                    milkmanId: sub.milkmanId,
                    senderId: customer.userId,
                    senderType: "customer",
                    message: orderMessage,
                    messageType: "order",
                    orderQuantity: sub.quantity,
                    orderProduct: sub.productName,
                    orderTotal: totalAmount,
                });

                console.log(`Subscription order placed for customer ${customer.name} - ${sub.productName}`);
            }

            console.log("Subscription processing complete.");
        } catch (error) {
            console.error("Error in Subscription Order Processing:", error);
        }
    });

    const PORT = process.env.PORT || 5001;
    server.listen(Number(PORT), "0.0.0.0", () => {
        log(`serving on port ${PORT}`);
        log(`serving on port ${PORT}`);
        console.log("Server restarted and routes registered - Forcing Update");
    });
})();
