import { Router } from "express";
import { db } from "./db";
import { users, otpCodes } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { z } from "zod";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

import { OTPService } from "./services/otpService";

// POST /api/auth/send-otp
router.post("/send-otp", async (req, res) => {
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
router.post("/verify-otp", async (req, res) => {
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

        // In development mode, skip database user creation
        if (process.env.NODE_ENV !== 'production') {
            // Create a mock user object for development
            const mockUser = {
                id: `user_${phone.replace(/[^0-9]/g, '').slice(-4)}`,
                phone,
                username: `user_${phone.replace(/[^0-9]/g, '').slice(-4)}`,
                userType: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const token = jwt.sign({ id: mockUser.id, phone: mockUser.phone }, JWT_SECRET, {
                expiresIn: "30d",
            });

            return res.json({
                success: true,
                message: "Login successful",
                accessToken: token,
                user: mockUser,
            });
        }

        // Production: Find or create user in database
        try {
            let [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

            if (!user) {
                const userId = crypto.randomUUID();
                [user] = await db
                    .insert(users)
                    .values({
                        id: userId,
                        phone,
                        username: `user_${phone.slice(-4)}`,
                        userType: null,
                    })
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

// POST /api/auth/logout
router.post("/logout", (req, res) => {
    res.json({ success: true, message: "Logged out successfully" });
});

export default router;
