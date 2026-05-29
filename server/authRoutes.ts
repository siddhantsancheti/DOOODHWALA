import { Router } from "express";
import rateLimit from "express-rate-limit";
import { db } from "./db";
import { users, otpCodes } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { z } from "zod";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET is required");

import { OTPService } from "./services/otpService";
// Importing fcmService initializes the firebase-admin app (side effect) so we
// can verify Firebase ID tokens for phone-auth login below.
import * as admin from "firebase-admin";
import "./services/fcmService";

// Shared: find-or-create a user for a verified phone number and return our JWT.
// Used by both the legacy OTP flow and Firebase phone-auth login.
async function issueSessionForPhone(phone: string, res: any) {
    const normalize = (p: string) => (p || "").replace(/\D/g, "").slice(-10);
    const adminPhone = process.env.ADMIN_PHONE || "8087906174";
    const isAdmin = normalize(phone) === normalize(adminPhone) && normalize(phone).length === 10;
    if (isAdmin) console.log(`[Auth] Admin phone matched: ${normalize(phone)}`);

    let [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (!user) {
        const userId = crypto.randomUUID();
        const digits = phone.replace(/\D/g, "").slice(-6);
        const suffix = Math.random().toString(36).slice(2, 6);
        const username = `user_${digits}_${suffix}`;
        [user] = await db
            .insert(users)
            .values({ id: userId, phone, username, userType: isAdmin ? "admin" : null })
            .returning();
    } else if (isAdmin && user.userType !== "admin") {
        [user] = await db.update(users).set({ userType: "admin" }).where(eq(users.id, user.id)).returning();
    }

    const token = jwt.sign({ id: user.id, phone: user.phone }, JWT_SECRET!, { expiresIn: "30d" });
    return res.json({ success: true, message: "Login successful", accessToken: token, user });
}

// POST /api/auth/firebase-login
// Exchanges a Firebase phone-auth ID token for our app JWT. Firebase (Google)
// handles SMS delivery + verification; we just trust the verified token here.
router.post("/firebase-login", async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) return res.status(400).json({ message: "idToken is required" });

        let decoded: admin.auth.DecodedIdToken;
        try {
            decoded = await admin.auth().verifyIdToken(idToken);
        } catch (err: any) {
            console.error("[Auth] Firebase token verify failed:", err?.message);
            return res.status(401).json({ message: "Invalid or expired Firebase token" });
        }

        const phone = decoded.phone_number;
        if (!phone) return res.status(400).json({ message: "Token has no phone number" });

        return await issueSessionForPhone(phone, res);
    } catch (error: any) {
        console.error("Firebase login error:", error);
        return res.status(500).json({ message: "Server error during Firebase login" });
    }
});

// Strict rate limit for OTP endpoints — 5 requests per 10 minutes per IP
const otpRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: { message: "Too many OTP requests. Please try again after 10 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});

// Per-phone brute-force guard for OTP verification.
// Keyed by phone (not IP) so an attacker can't bypass it by rotating IPs.
// skipSuccessfulRequests => only wrong-OTP attempts count toward the limit,
// so legitimate users who log in on the first try are never throttled.
const verifyOtpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => String(req.body?.phone || req.ip),
    skipSuccessfulRequests: true,
    message: { message: "Too many incorrect OTP attempts. Please request a new code." },
    standardHeaders: true,
    legacyHeaders: false,
});

// POST /api/auth/send-otp
router.post("/send-otp", otpRateLimiter, async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ message: "Phone number is required" });
        }

        const result = await OTPService.sendOTP(phone);
        return res.json(result);
    } catch (error: any) {
        console.error("Send OTP error:", error);
        return res.status(500).json({
            message: "Server error while sending OTP",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// POST /api/auth/verify-otp
router.post("/verify-otp", otpRateLimiter, verifyOtpLimiter, async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) {
            return res.status(400).json({ message: "Phone and OTP are required" });
        }

        // Verify OTP
        const isValid = await OTPService.verifyOTP(phone, otp);

        if (!isValid) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // Find or create user in database
        try {
            let [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

            // Match the admin phone by its last 10 digits so any input format
            // (+91XXXXXXXXXX, 91XXXXXXXXXX, plain XXXXXXXXXX, with spaces)
            // is normalised to the same key. Defaults to 8087906174 when the
            // ADMIN_PHONE env var isn't set on Render.
            const normalize = (p: string) => (p || "").replace(/\D/g, "").slice(-10);
            const adminPhone = process.env.ADMIN_PHONE || "8087906174";
            const isAdmin = normalize(phone) === normalize(adminPhone) && normalize(phone).length === 10;
            if (isAdmin) console.log(`[Auth] Admin phone matched: ${normalize(phone)}`);

            if (!user) {
                const userId = crypto.randomUUID();
                const digits = phone.replace(/\D/g, '').slice(-6);
                const suffix = Math.random().toString(36).slice(2, 6);
                const username = `user_${digits}_${suffix}`;
                [user] = await db
                    .insert(users)
                    .values({
                        id: userId,
                        phone,
                        username,
                        userType: isAdmin ? 'admin' : null,
                    })
                    .returning();
            } else if (isAdmin && user.userType !== 'admin') {
                [user] = await db
                    .update(users)
                    .set({ userType: 'admin' })
                    .where(eq(users.id, user.id))
                    .returning();
            }

            const token = jwt.sign({ id: user.id, phone: user.phone }, JWT_SECRET, {
                expiresIn: "30d",
            });

            return res.json({
                success: true,
                message: "Login successful",
                accessToken: token,
                user,
            });
        } catch (dbError: any) {
            console.error("[Auth] Database error during user creation:", dbError);
            return res.status(500).json({
                message: "Error creating user account",
                error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
            });
        }
    } catch (error: any) {
        console.error("Verify OTP error:", error);
        return res.status(500).json({
            message: "Server error while verifying OTP",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// PUT /api/auth/user-type
router.put("/user-type", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as any;
        } catch (err) {
            return res.status(401).json({ message: "Invalid token" });
        }

        const { userType } = req.body;
        if (!userType || !['customer', 'milkman'].includes(userType)) {
            return res.status(400).json({ message: "Invalid user type" });
        }

        const [updatedUser] = await db
            .update(users)
            .set({ userType })
            .where(eq(users.id, decoded.id))
            .returning();

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error("Update user type error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/auth/user
router.get("/user", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            const [user] = await db
                .select()
                .from(users)
                .where(eq(users.id, decoded.id))
                .limit(1);

            if (!user) {
                return res.status(401).json({ message: "User not found" });
            }

            res.json({ success: true, user });
        } catch (err) {
            return res.status(401).json({ message: "Invalid token" });
        }
    } catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/auth/profile
// Saves FCM token and updates profile data
router.post("/profile", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        let decoded: any;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: "Invalid token" });
        }

        const { fcmToken, ...profileData } = req.body;
        const userId = decoded.id;

        const updateData: any = { ...profileData, updatedAt: new Date() };
        if (fcmToken) {
            updateData.fcmToken = fcmToken;
        }

        const [updatedUser] = await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, userId))
            .returning();

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
    res.json({ success: true, message: "Logged out successfully" });
});

export default router;
