import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

// Make sure this matches the one in authRoutes.ts or better yet, move it to a shared config
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
}

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        // Optional: Fetch full user from DB if needed, or just trust the token
        // For robust security, we verify the user still exists
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, decoded.id))
            .limit(1);

        if (!user) {
            return res.status(403).json({ message: "User not found or access denied" });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(403).json({ message: "Invalid or expired token" });
    }
};

// Middleware to check if the authenticated user has the required role
export const authorizeRole = (allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized: User not authenticated" });
        }

        const userType = req.user.userType;
        if (!userType || !allowedRoles.includes(userType)) {
            return res.status(403).json({
                message: `Forbidden: Requires one of these roles: ${allowedRoles.join(', ')}`
            });
        }

        next();
    };
};
