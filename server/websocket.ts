import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import jwt from "jsonwebtoken";
import { log } from "./vite";

const JWT_SECRET = process.env.JWT_SECRET;

interface WebSocketMessage {
    type: string;
    [key: string]: any;
}

interface AuthenticatedWebSocket extends WebSocket {
    userId?: string;
    userType?: string;
    isAlive?: boolean;
    isAuthenticated?: boolean;
}

let wss: WebSocketServer;

export function setupWebSocket(server: Server) {
    wss = new WebSocketServer({ server, path: "/ws" });

    wss.on("connection", (ws: AuthenticatedWebSocket) => {
        ws.isAlive = true;
        ws.isAuthenticated = false;
        ws.on("pong", () => {
            ws.isAlive = true;
        });

        ws.on("message", (data: string) => {
            try {
                const message: WebSocketMessage = JSON.parse(data);

                if (message.type === "authenticate") {
                    // Verify JWT token instead of trusting client-provided userId
                    if (!message.token || !JWT_SECRET) {
                        ws.send(JSON.stringify({ type: 'auth_error', message: 'Token required' }));
                        return;
                    }

                    try {
                        const decoded = jwt.verify(message.token, JWT_SECRET) as any;
                        ws.userId = decoded.id;
                        ws.userType = message.userType; // userType can be trusted since token is verified
                        ws.isAuthenticated = true;
                        log(`WebSocket authenticated: User ${ws.userId} (${ws.userType})`);
                        ws.send(JSON.stringify({ type: 'authenticated' }));
                    } catch (jwtError) {
                        ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid token' }));
                        ws.close(4001, 'Invalid token');
                    }
                }
            } catch (error) {
                console.error("WebSocket message error:", error);
            }
        });

        ws.on("error", (error) => {
            console.error("WebSocket error:", error);
        });

        // Auto-disconnect unauthenticated clients after 10 seconds
        setTimeout(() => {
            if (!ws.isAuthenticated && ws.readyState === WebSocket.OPEN) {
                ws.close(4000, 'Authentication timeout');
            }
        }, 10000);
    });

    // Keep-alive
    const interval = setInterval(() => {
        wss.clients.forEach((ws: WebSocket) => {
            const extWs = ws as AuthenticatedWebSocket;
            if (extWs.isAlive === false) return ws.terminate();

            extWs.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on("close", () => {
        clearInterval(interval);
    });

    log("WebSocket server setup complete");
}

export function broadcast(message: WebSocketMessage) {
    if (!wss) return;

    wss.clients.forEach((client: WebSocket) => {
        const ws = client as AuthenticatedWebSocket;
        if (client.readyState === WebSocket.OPEN) {
            // Simple broadcast for now, can be optimized to target specific users
            // But for "order_accepted", we want the Customer to receive it.
            // The message usually contains customerId/milkmanId so the client can filter.
            client.send(JSON.stringify(message));
        }
    });
}

export function sendToUser(userId: number, message: WebSocketMessage) {
    if (!wss) return;

    wss.clients.forEach((client: WebSocket) => {
        const ws = client as AuthenticatedWebSocket;
        if (ws.readyState === WebSocket.OPEN && ws.userId === userId) {
            client.send(JSON.stringify(message));
        }
    })
}

export function broadcastLocationUpdate(milkmanId: number, latitude: number, longitude: number) {
    if (!wss) return;

    const message = JSON.stringify({
        type: 'location_update',
        milkmanId,
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
    });

    wss.clients.forEach((client: WebSocket) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}
