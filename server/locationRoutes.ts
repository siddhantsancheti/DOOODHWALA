import { Router } from "express";
import { db } from "./db";
import { locations } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { type AuthRequest } from "./middleware/auth";
import { canTrackMilkman, callerIdentities } from "./services/access";

const router = Router();

// GET /api/locations/milkman/:milkmanId
router.get("/milkman/:milkmanId", async (req: AuthRequest, res) => {
    try {
        const milkmanId = parseInt(req.params.milkmanId);
        if (isNaN(milkmanId)) {
            return res.status(400).json({ message: "Invalid milkman ID" });
        }

        // Live GPS of a named person: only their own customers may follow it.
        if (!(await canTrackMilkman(req, milkmanId))) {
            return res.status(403).json({ message: "Not authorized" });
        }

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
router.post("/", async (req: AuthRequest, res) => {
    try {
        const { latitude, longitude } = req.body;

        // The milkman comes from the token, never the body. Otherwise anyone
        // could plant a false position for a named milkman, and customers
        // watching the map would be shown a delivery that isn't happening.
        const me = await callerIdentities(req);
        if (me.milkmanId == null) {
            return res.status(403).json({ message: "Not a milkman account" });
        }
        if (latitude == null || longitude == null) {
            return res.status(400).json({ message: "latitude and longitude are required" });
        }

        const [newLocation] = await db
            .insert(locations)
            .values({
                milkmanId: me.milkmanId,
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
