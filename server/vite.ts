import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function log(message: string, source = "express") {
    const formattedTime = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });

    console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
    const vite = await createViteServer({
        server: { middlewareMode: true, hmr: { server } },
        appType: "custom",
    });

    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
        const url = req.originalUrl;

        try {
            const clientTemplate = path.resolve(
                __dirname,
                "..",
                "client",
                "index.html",
            );

            // always read fresh template in dev
            const template = fs.readFileSync(clientTemplate, "utf-8");
            const page = await vite.transformIndexHtml(url, template);
            res.status(200).set({ "Content-Type": "text/html" }).end(page);
        } catch (e) {
            vite.ssrFixStacktrace(e as Error);
            next(e);
        }
    });
}

export function serveStatic(app: Express) {
    const distPath = path.resolve(__dirname, "public");

    if (!fs.existsSync(distPath)) {
        // API-only mode (e.g. running on Termux without a frontend build)
        // The REST API still works fully — just no web dashboard served
        console.log(`[express] No frontend build found at ${distPath} — running in API-only mode`);
        app.use("*", (_req, res, next) => {
            // Let API routes handle their paths; only return 404 for unknown routes
            if (_req.originalUrl.startsWith("/api")) return next();
            res.status(200).json({ status: "DOOODHWALA API running", mode: "api-only" });
        });
        return;
    }

    app.use(express.static(distPath));

    app.use("*", (_req, res) => {
        res.sendFile(path.resolve(distPath, "index.html"));
    });
}
