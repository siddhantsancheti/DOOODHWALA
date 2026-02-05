import { Router } from "express";
import { db } from "./db";
import { locations } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

// GET /api/locations/milkman/:milkmanId
router.get("/milkman/:milkmanId", async (req, res) => {
    try {
        const milkmanId = parseInt(req.params.milkmanId);

        const [latestLocation] = await db
            .select()
            .from(locations)
            .where(eq(locations.milkmanId, milkmanId))
            .orderBy(desc(locations.timestamp))
            .limit(1);

        if (!latestLocation) {
            return res.status(404).json({ message: "Location not found" });
        }

        res.json(latestLocation);
    } catch (error) {
        console.error("Get location error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/locations
router.post("/", async (req, res) => {
    try {
        const { milkmanId, latitude, longitude } = req.body;

        const [newLocation] = await db
            .insert(locations)
            .values({
                milkmanId,
                latitude: latitude.toString(),
                longitude: longitude.toString(),
            })
            .returning();

        res.json(newLocation);
    } catch (error) {
        console.error("Update location error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
