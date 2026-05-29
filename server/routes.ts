import type { Express } from "express";
import { createServer, type Server } from "http";
import authRoutes from "./authRoutes";
import customerRoutes from "./customerRoutes";
import milkmanRoutes from "./milkmanRoutes";
import orderRoutes from "./orderRoutes";
import serviceRequestRoutes from "./serviceRequestRoutes";
import paymentRoutes from "./paymentRoutes";
import chatRoutes from "./chatRoutes";
import locationRoutes from "./locationRoutes";
import gatewayRoutes from "./gatewayRoutes";
import productRoutes from "./productRoutes";
import { setupWebSocket } from "./websocket";
import deliveryRoutes from "./deliveryRoutes";
import subscriptionRoutes from "./subscriptionRoutes";
import customerPricingRoutes from "./customerPricingRoutes";
import notificationRoutes from "./notificationRoutes";
import groupRoutes from "./groupRoutes";

import { authenticateToken, authorizeRole } from "./middleware/auth";
import userRoutes from "./userRoutes";
import adminRoutes from "./adminRoutes";

export function registerRoutes(app: Express): Server {
    // Register API routes
    app.use("/api/auth", authRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/gateway", gatewayRoutes);

    // Protected Routes
    app.use("/api/customers", authenticateToken, customerRoutes);
    app.use("/api/milkmen", authenticateToken, milkmanRoutes);
    app.use("/api/orders", authenticateToken, orderRoutes);
    app.use("/api/service-requests", authenticateToken, serviceRequestRoutes);
    app.use("/api/bills", authenticateToken, paymentRoutes); // Mapping bills to payment routes for now
    // Payment gateway webhooks (Razorpay/Stripe) authenticate via their own
    // signature header, NOT a JWT — exempt them from authenticateToken so the
    // gateway's POSTs reach the signature-verifying handlers instead of 401ing.
    const paymentsAuth = (req: any, res: any, next: any) => {
        if (req.path.startsWith("/razorpay/webhook") || req.path.startsWith("/stripe/webhook")) {
            return next();
        }
        return authenticateToken(req, res, next);
    };
    app.use("/api/payments", paymentsAuth, paymentRoutes);
    app.use("/api/delivery", authenticateToken, deliveryRoutes);
    app.use("/api/chat", authenticateToken, chatRoutes);
    app.use("/api/subscriptions", authenticateToken, subscriptionRoutes);
    app.use("/api/locations", authenticateToken, locationRoutes);
    app.use("/api/customer-pricings", authenticateToken, customerPricingRoutes);
    app.use("/api/notifications", authenticateToken, notificationRoutes);
    app.use("/api/groups", authenticateToken, groupRoutes);

    // Admin Routes
    app.use("/api/admin", authenticateToken, authorizeRole(['admin']), adminRoutes);

    // Products — require authentication
    app.use("/api/products", authenticateToken, productRoutes);

    // Add other API routes here as needed

    const httpServer = createServer(app);
    setupWebSocket(httpServer);
    return httpServer;
}
