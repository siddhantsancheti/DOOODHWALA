import { db } from "../db";
import { otpCodes, smsQueue } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";

// In-memory OTP store — used in development only
const devOtpStore = new Map<string, { code: string; expiresAt: Date; isUsed: boolean }>();

export class OTPService {
    private static generateCode(): string {
        if (process.env.NODE_ENV === 'development') {
            return "123456"; // Fixed OTP for easy testing
        }
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    static async sendOTP(phone: string): Promise<{ success: boolean; message: string; debugCode?: string }> {
        try {
            const code = this.generateCode();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            if (process.env.NODE_ENV === 'development') {
                // Development: use in-memory store, return code directly
                devOtpStore.set(phone, { code, expiresAt, isUsed: false });
                console.log(`[OTPService] DEV OTP for ${phone}: ${code}`);
                return { success: true, message: "OTP sent successfully", debugCode: code };
            }

            // Production: store in database and queue SMS via Android Gateway
            await db.insert(otpCodes).values({ phone, code, expiresAt });

            const message = `Your DOOODHWALA verification code is: ${code}. Valid for 10 minutes. Do not share this code.`;
            await db.insert(smsQueue).values({ phone, message, status: "pending" });

            console.log(`[OTPService] Queued OTP SMS for ${phone}`);
            return { success: true, message: "OTP sent successfully" };

        } catch (error: any) {
            console.error("[OTPService] Error sending OTP:", error);
            throw new Error(`Failed to send OTP: ${error.message}`);
        }
    }

    static async verifyOTP(phone: string, code: string | number): Promise<boolean> {
        try {
            const codeStr = String(code).trim();

            // Development: accept magic code OR in-memory stored code
            if (process.env.NODE_ENV === 'development') {
                if (codeStr === '123456') return true;
                const devOtp = devOtpStore.get(phone);
                if (devOtp && devOtp.code === codeStr && !devOtp.isUsed && devOtp.expiresAt > new Date()) {
                    devOtp.isUsed = true;
                    return true;
                }
                return false;
            }

            // Production: check database
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
                await db.update(otpCodes).set({ isUsed: true }).where(eq(otpCodes.id, validOtp.id));
                console.log(`[OTPService] OTP verified for ${phone}`);
                return true;
            }

            console.log(`[OTPService] Invalid/expired OTP for ${phone}`);
            return false;

        } catch (error: any) {
            console.error("[OTPService] Error verifying OTP:", error);
            return false;
        }
    }
}
