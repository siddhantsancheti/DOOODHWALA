import { type Response, type NextFunction } from "express";
import crypto from "crypto";
import { type AuthRequest } from "./auth";

/**
 * Restrict the admin API to machines that hold a registered device key.
 *
 * Admin rights are granted by phone number alone, which means anyone who can
 * receive an SMS on that number reaches every customer's address and every
 * milkman's earnings. This adds a second, independent factor: the browser must
 * also present a secret that was put on it deliberately.
 *
 * Set ADMIN_DEVICE_KEYS to a comma-separated list — one long random value per
 * laptop, so a lost machine can be cut off by deleting its key alone:
 *
 *   ADMIN_DEVICE_KEYS=<key-for-laptop-1>,<key-for-laptop-2>
 *
 * Honest about what this is: it binds to a secret stored on the machine, not to
 * the hardware. Someone who copies the key out of the browser can use it
 * elsewhere. Real hardware binding needs client certificates; this stops the
 * realistic attack — a stolen or SIM-swapped phone number — without needing a
 * certificate authority.
 *
 * If ADMIN_DEVICE_KEYS is unset the check is skipped, so an existing
 * deployment does not lock its owner out the moment this ships. It warns
 * loudly instead.
 */
const RAW_KEYS = (process.env.ADMIN_DEVICE_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

if (RAW_KEYS.length === 0) {
    console.warn(
        "[AdminDevice] ADMIN_DEVICE_KEYS is not set — the admin API is protected " +
        "by phone number alone. Set it to lock admin to known machines.",
    );
}

/** Constant-time compare, so a wrong key cannot be found one character at a time. */
function matches(candidate: string): boolean {
    const given = Buffer.from(candidate);
    return RAW_KEYS.some((key) => {
        const expected = Buffer.from(key);
        if (expected.length !== given.length) return false;
        return crypto.timingSafeEqual(expected, given);
    });
}

export function requireAdminDevice(req: AuthRequest, res: Response, next: NextFunction) {
    if (RAW_KEYS.length === 0) return next();

    const provided =
        (req.headers["x-admin-device"] as string | undefined) ||
        (req.query.device as string | undefined);

    if (!provided || !matches(provided)) {
        console.warn(
            `[AdminDevice] Refused admin request from ${req.ip} for ${req.method} ${req.path}` +
            (provided ? " — device key not recognised" : " — no device key presented"),
        );
        return res.status(403).json({
            message: "This device is not authorised for admin access.",
            code: "ADMIN_DEVICE_REQUIRED",
        });
    }

    next();
}
