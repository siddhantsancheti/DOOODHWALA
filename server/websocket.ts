import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { log } from "./vite";

interface WebSocketMessage {
    type: string;
    [key: string]: any;
}

interface AuthenticatedWebSocket extends WebSocket {
    userId?: number;
    userType?: string;
    isAlive?: boolean;
}

let wss: WebSocketServer;

export function setupWebSocket(server: Server) {
    wss = new WebSocketServer({ server, path: "/ws" });

    wss.on("connection", (ws: AuthenticatedWebSocket) => {
        ws.isAlive = true;
        ws.on("pong", () => {
            ws.isAlive = true;
        });

        ws.on("message", (data: string) => {
            try {
                const message: WebSocketMessage = JSON.parse(data);

                if (message.type === "authenticate") {
                    ws.userId = parseInt(message.userId);
                    ws.userType = message.userType;
                    log(`WebSocket authenticated: User ${ws.userId} (${ws.userType})`);

                    // Send confirmation back
                    ws.send(JSON.stringify({ type: 'authenticated' }));
                }
            } catch (error) {
                console.error("WebSocket message error:", error);
            }
        });

        ws.on("error", (error) => {
            console.error("WebSocket error:", error);
        });
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
