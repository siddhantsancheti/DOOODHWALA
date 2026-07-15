import { db } from "../db";
import { otpCodes, smsQueue } from "@shared/schema";
import { eq, and, gt, lt } from "drizzle-orm";

// In-memory OTP store — used in development only
const devOtpStore = new Map<string, { code: string; expiresAt: Date; isUsed: boolean }>();

// Review test account (for Google Play / App Store reviewers).
// A single phone number that accepts a fixed OTP so a reviewer can sign in
// without receiving a real SMS. Entirely INERT unless REVIEW_TEST_PHONE is set,
// so it has zero effect on real users / production unless explicitly enabled.
const normalizePhone = (p: string) => (p || "").replace(/\D/g, "").slice(-10);
const REVIEW_PHONE = process.env.REVIEW_TEST_PHONE ? normalizePhone(process.env.REVIEW_TEST_PHONE) : null;
const REVIEW_OTP = (process.env.REVIEW_TEST_OTP || "123456").trim();
function isReviewPhone(phone: string): boolean {
    return !!REVIEW_PHONE && REVIEW_PHONE.length === 10 && normalizePhone(phone) === REVIEW_PHONE;
}

export class OTPService {
    private static generateCode(): string {
        if (process.env.NODE_ENV === 'development') {
            return "123456"; // Fixed OTP for easy testing
        }
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    static async sendOTP(phone: string): Promise<{ success: boolean; message: string; debugCode?: string }> {
        try {
            // Review test account: pretend the OTP was sent (no real SMS, no DB row).
            // The fixed REVIEW_OTP is validated directly in verifyOTP().
            if (isReviewPhone(phone)) {
                console.log("[OTPService] Review test phone — skipping real SMS; fixed OTP in effect.");
                return { success: true, message: "OTP sent successfully" };
            }

            const code = this.generateCode();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            if (process.env.NODE_ENV === 'development') {
                // Development: replace any existing OTP for this phone
                devOtpStore.set(phone, { code, expiresAt, isUsed: false });
                console.log(`[OTPService] DEV OTP for ${phone}: ${code}`);
                return { success: true, message: "OTP sent successfully", debugCode: code };
            }

            // Production: invalidate all previous unused OTPs for this phone
            await db
                .update(otpCodes)
                .set({ isUsed: true })
                .where(and(eq(otpCodes.phone, phone), eq(otpCodes.isUsed, false)));

            // Store new OTP in database and queue SMS via Android Gateway
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

            // Review test account: accept the fixed OTP for the configured review
            // phone only. Gated on REVIEW_TEST_PHONE, so no effect on real users.
            if (isReviewPhone(phone)) {
                const ok = codeStr === REVIEW_OTP;
                console.log(`[OTPService] Review test phone verify: ${ok ? "accepted" : "rejected"}`);
                return ok;
            }

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

            // Production: atomically claim the OTP — mark it used only if it is
            // still valid. Doing the check + update in a single statement closes
            // the race window where two concurrent requests could both succeed.
            const claimed = await db
                .update(otpCodes)
                .set({ isUsed: true })
                .where(
                    and(
                        eq(otpCodes.phone, phone),
                        eq(otpCodes.code, codeStr),
                        eq(otpCodes.isUsed, false),
                        gt(otpCodes.expiresAt, new Date())
                    )
                )
                .returning({ id: otpCodes.id });

            if (claimed.length > 0) {
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
