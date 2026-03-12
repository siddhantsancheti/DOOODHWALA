import { Router } from "express";
import upload from "./multer";
import { authenticateToken, type AuthRequest } from "./middleware/auth";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// POST /api/users/profile-image
router.post("/profile-image", authenticateToken, upload.single("image"), async (req: AuthRequest, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No image uploaded" });
        }

        // Update user profileImageUrl in DB
        const userId = req.user.id;

        // Construct public URL - using path from GCS storage engine
        const imageUrl = req.file.path;

        await db.update(users)
            .set({ profileImageUrl: imageUrl })
            .where(eq(users.id, userId));

        res.json({ success: true, imageUrl });
    } catch (error) {
        console.error("Profile image upload error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /api/users/fcm-token
router.patch("/fcm-token", authenticateToken, async (req: AuthRequest, res) => {
    try {
        const { fcmToken } = req.body;
        const userId = req.user.id;

        if (!fcmToken) {
            return res.status(400).json({ message: "fcmToken is required" });
        }

        await db.update(users)
            .set({ fcmToken })
            .where(eq(users.id, userId));

        res.json({ success: true, message: "FCM token updated successfully" });
    } catch (error) {
        console.error("FCM token update error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
