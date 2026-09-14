import { Router } from "express";
import multer from "multer";
import { getStorage } from "firebase-admin/storage";
import { db } from "./db";
import { ads, adTracking } from "@shared/schema";
import { and, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { type AuthRequest } from "./middleware/auth";
import "./services/fcmService"; // ensures firebase-admin is initialised for Storage

const STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || "dooodhwala.firebasestorage.app";

// Video is why this is larger than the chat limit. An advertiser hands over
// whatever their designer exported; 40 MB covers a short banner clip without
// letting someone upload a feature film into a 1 GB VM's memory.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 40 * 1024 * 1024 },
});

const IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO = ["video/mp4", "video/webm", "video/quicktime"];

/** Where an ad may appear, and to whom. Kept narrow on purpose. */
const POSITIONS = ["top", "bottom", "inline"];
const AUDIENCES = ["all", "customers", "milkmen"];

/* ------------------------------------------------------------------ *
 * Admin side — mounted inside adminRoutes, so it already sits behind
 * authenticateToken + authorizeRole('admin') + requireAdminDevice.
 * ------------------------------------------------------------------ */

export const adminAdRouter = Router();

/**
 * Upload the creative an advertiser sent over.
 *
 * Stored in Firebase Storage beside chat media and KYC, and handed back as a
 * long-lived signed URL so the app can load it without a token. The file
 * extension is kept in the path because it is how the app decides whether to
 * render an <Image> or a video player — cheaper than a schema column for a
 * fact the filename already carries.
 */
adminAdRouter.post("/media", upload.single("file"), async (req: AuthRequest, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        const mime = req.file.mimetype;
        if (![...IMAGE, ...VIDEO].includes(mime)) {
            return res.status(400).json({ message: `Unsupported file type: ${mime}` });
        }

        const ext = mime.split("/")[1].replace("quicktime", "mov");
        const path = `ads/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;

        const bucket = getStorage().bucket(STORAGE_BUCKET);
        const fileRef = bucket.file(path);
        await fileRef.save(req.file.buffer, { metadata: { contentType: mime } });
        const [url] = await fileRef.getSignedUrl({ action: "read", expires: "03-09-2491" });

        res.json({ url, kind: VIDEO.includes(mime) ? "video" : "image" });
    } catch (error: any) {
        console.error("Ad media upload failed:", error);
        res.status(500).json({ message: "Could not upload the file" });
    }
});

/** Every ad, newest first, with the counters as they stand. */
adminAdRouter.get("/", async (_req: AuthRequest, res) => {
    try {
        res.json(await db.select().from(ads).orderBy(desc(ads.createdAt)));
    } catch (error) {
        console.error("List ads error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

adminAdRouter.post("/", async (req: AuthRequest, res) => {
    try {
        const {
            title, description, imageUrl, ctaText, ctaUrl,
            advertiserName, advertiserEmail,
            position, targetAudience, startDate, endDate, priority,
        } = req.body;

        // An ad with no advertiser and no dates is the placeholder problem all
        // over again — something on a customer's screen that nobody owns.
        if (!title || !advertiserName || !startDate || !endDate) {
            return res.status(400).json({
                message: "Title, advertiser and both dates are required",
            });
        }
        if (new Date(endDate) <= new Date(startDate)) {
            return res.status(400).json({ message: "The end date must be after the start date" });
        }
        if (position && !POSITIONS.includes(position)) {
            return res.status(400).json({ message: "Unknown position" });
        }
        if (targetAudience && !AUDIENCES.includes(targetAudience)) {
            return res.status(400).json({ message: "Unknown audience" });
        }

        const [created] = await db.insert(ads).values({
            title,
            description: description || "",
            imageUrl: imageUrl || null,
            ctaText: ctaText || "Learn more",
            ctaUrl: ctaUrl || "",
            advertiserName,
            advertiserEmail: advertiserEmail || null,
            adType: "banner",
            position: position || "bottom",
            targetAudience: targetAudience || "all",
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            priority: Number(priority) || 1,
            isActive: true,
        }).returning();

        res.json(created);
    } catch (error: any) {
        console.error("Create ad error:", error);
        res.status(500).json({ message: "Could not create the ad" });
    }
});

adminAdRouter.patch("/:id", async (req: AuthRequest, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ad ID" });

        // Only these may be edited. Counters are not in the list — an
        // impression count you can type is not a number you can show an
        // advertiser.
        const allowed = [
            "title", "description", "imageUrl", "ctaText", "ctaUrl",
            "advertiserName", "advertiserEmail", "position", "targetAudience",
            "priority", "isActive",
        ] as const;

        const patch: Record<string, unknown> = { updatedAt: new Date() };
        for (const key of allowed) {
            if (req.body[key] !== undefined) patch[key] = req.body[key];
        }
        if (req.body.startDate) patch.startDate = new Date(req.body.startDate);
        if (req.body.endDate) patch.endDate = new Date(req.body.endDate);

        const [updated] = await db.update(ads).set(patch).where(eq(ads.id, id)).returning();
        if (!updated) return res.status(404).json({ message: "Ad not found" });
        res.json(updated);
    } catch (error) {
        console.error("Update ad error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

adminAdRouter.delete("/:id", async (req: AuthRequest, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ message: "Invalid ad ID" });

        // Tracking rows reference the ad, so they go first.
        await db.delete(adTracking).where(eq(adTracking.adId, id));
        await db.delete(ads).where(eq(ads.id, id));
        res.json({ success: true });
    } catch (error) {
        console.error("Delete ad error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

/* ------------------------------------------------------------------ *
 * App side — any signed-in user.
 * ------------------------------------------------------------------ */

const router = Router();

/**
 * What this user should be shown right now.
 *
 * Live means all four at once: switched on, started, not finished, and aimed at
 * this kind of user. The window is checked in SQL against now() rather than
 * trusted from the client, so an expired campaign cannot be revived by a phone
 * with a wrong clock.
 */
router.get("/active", async (req: AuthRequest, res) => {
    try {
        const audience = req.user?.userType === "milkman" ? "milkmen" : "customers";
        const now = new Date();

        const live = await db
            .select()
            .from(ads)
            .where(and(
                eq(ads.isActive, true),
                lte(ads.startDate, now),
                gte(ads.endDate, now),
                inArray(ads.targetAudience, ["all", audience]),
            )!)
            .orderBy(desc(ads.priority), desc(ads.createdAt));

        res.json(live);
    } catch (error) {
        console.error("Active ads error:", error);
        // An ad failing must never break the screen it sits on.
        res.json([]);
    }
});

/**
 * Record that an ad was seen or tapped.
 *
 * Two writes: a counter on the ad for the number you quote an advertiser, and a
 * row in ad_tracking for the detail behind it. Best effort — a customer's
 * dashboard must not fail because a counter did not increment.
 */
router.post("/:id/track", async (req: AuthRequest, res) => {
    try {
        const id = parseInt(req.params.id);
        const event = String(req.body?.event || "");
        if (isNaN(id) || !["impression", "click", "dismiss"].includes(event)) {
            return res.status(400).json({ message: "Invalid tracking event" });
        }

        if (event === "impression") {
            await db.update(ads)
                .set({ impressions: sql`${ads.impressions} + 1` })
                .where(eq(ads.id, id));
        } else if (event === "click") {
            await db.update(ads)
                .set({ clicks: sql`${ads.clicks} + 1` })
                .where(eq(ads.id, id));
        }

        await db.insert(adTracking).values({
            adId: id,
            userId: req.user?.id ?? null,
            event,
            timestamp: new Date(),
            deviceType: "mobile",
        });

        res.json({ success: true });
    } catch (error) {
        console.error("Ad tracking error:", error);
        res.json({ success: false });
    }
});

export default router;
