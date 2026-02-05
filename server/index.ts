import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cron from "node-cron";
import { BillingService } from "./services/billingService";

const app = express();
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
        ? ["RAZORPAY_KEY_ID", "STRIPE_SECRET_KEY", "JWT_SECRET"]
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

        res.status(status).json({ message });
        throw err;
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

    const PORT = process.env.PORT || 5001;
    server.listen(Number(PORT), "0.0.0.0", () => {
        log(`serving on port ${PORT}`);
        log(`serving on port ${PORT}`);
        console.log("Server restarted and routes registered - Forcing Update");
    });
})();
