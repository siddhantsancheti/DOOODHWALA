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

import { authenticateToken } from "./middleware/auth";
import userRoutes from "./userRoutes";

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
    app.use("/api/payments", authenticateToken, paymentRoutes);
    app.use("/api/chat", authenticateToken, chatRoutes);
    app.use("/api/locations", authenticateToken, locationRoutes);

    // Public Routes (or handle auth internally if mixed)
    app.use("/api/products", productRoutes);

    // Add other API routes here as needed

    const httpServer = createServer(app);
    setupWebSocket(httpServer);
    return httpServer;
}
