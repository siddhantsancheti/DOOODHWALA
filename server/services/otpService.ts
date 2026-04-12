import { db } from "../db";
import { otpCodes, smsQueue } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";

// In-memory OTP store for development without database
const devOtpStore = new Map<string, { code: string; expiresAt: Date; isUsed: boolean }>();

export class OTPService {
    // Generate a 6-digit OTP
    private static generateCode(): string {
        if (process.env.NODE_ENV === 'development') {
            return "123456"; // Fixed OTP for testing
        }
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    // Send OTP (Queues it for the Android Gateway)
    static async sendOTP(phone: string): Promise<{ success: boolean; message: string; debugCode?: string }> {
        try {
            const code = this.generateCode();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            // Always use in-memory store in development
            devOtpStore.set(phone, { code, expiresAt, isUsed: false });
            console.log(`[OTPService] Generated OTP for ${phone}: ${code}`);

            const response: any = {
                success: true,
                message: "OTP sent successfully"
            };

            // Only return debug code in development ENVIRONMENT, never in production
            if (process.env.NODE_ENV === 'development') {
                response.debugCode = code;
            }

            // Try to store in database in production only
            if (process.env.NODE_ENV === 'production') {
                try {
                    await db.insert(otpCodes).values({
                        phone,
                        code,
                        expiresAt,
                    });

                    const message = `Your DOOODHWALA verification code is: ${code}. Valid for 10 minutes.`;
                    await db.insert(smsQueue).values({
                        phone,
                        message,
                        status: "pending",
                    });

                    console.log(`[OTPService] Stored in database for ${phone}`);
                } catch (dbError) {
                    console.error("[OTPService] Database error (ignored in production):", dbError);
                    // Continue anyway - already stored in memory
                }
            }

            return response;
        } catch (error: any) {
            console.error("[OTPService] Error sending OTP:", error);
            throw new Error(`Failed to send OTP: ${error.message}`);
        }
    }

    // Verify OTP
    static async verifyOTP(phone: string, code: string | number): Promise<boolean> {
        try {
            const codeStr = String(code).trim();
            console.log(`[OTPService Debug] Verifying OTP for phone: ${phone}, provided code: '${codeStr}'`);
            
            // In development, unconditionally accept the test code "123456" 
            // This prevents issues where the server restarts and the in-memory store is cleared.
            if (process.env.NODE_ENV === 'development' && codeStr === '123456') {
                console.log(`[OTPService Debug] Accepted magic development code 123456 for ${phone}`);
                return true;
            }

            // Always check in-memory store first
            const devOtp = devOtpStore.get(phone);
            console.log(`[OTPService Debug] Found devOtp in store:`, devOtp);

            if (devOtp) {
                const codeMatch = String(devOtp.code) === codeStr;
                const notUsed = !devOtp.isUsed;
                const notExpired = devOtp.expiresAt > new Date();
                console.log(`[OTPService Debug] Checks - CodeMatch: ${codeMatch}, NotUsed: ${notUsed}, NotExpired: ${notExpired}`);
                
                if (codeMatch && notUsed && notExpired) {
                    devOtp.isUsed = true;
                    console.log(`[OTPService] Verified OTP for ${phone}`);
                    return true;
                }
            } else {
                console.log(`[OTPService Debug] devOtpStore did not have code for phone: ${phone}`);
            }

            // In production, check database as fallback
            if (process.env.NODE_ENV === 'production') {
                try {
                    const [validOtp] = await db
                        .select()
                        .from(otpCodes)
                        .where(
                            and(
                                eq(otpCodes.phone, phone),
                                eq(otpCodes.code, codeStr),
                                eq(otpCodes.isUsed, false),
                                gt(otpCodes.expiresAt, new Date())
                            )
                        )
                        .limit(1);

                    if (validOtp) {
                        await db
                            .update(otpCodes)
                            .set({ isUsed: true })
                            .where(eq(otpCodes.id, validOtp.id));
                        return true;
                    }
                } catch (dbError) {
                    console.error("[OTPService] Database error during verification:", dbError);
                    // Fall through to return false
                }
            }

            console.log(`[OTPService] Invalid OTP for ${phone}: ${code}`);
            return false;
        } catch (error: any) {
            console.error("[OTPService] Error verifying OTP:", error);
            return false;
        }
    }
}
