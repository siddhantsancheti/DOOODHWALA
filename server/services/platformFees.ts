import { db } from "../db";
import { appConfig } from "@shared/schema";
import { eq } from "drizzle-orm";
import { money, parseRate, splitBill } from "./rateMath";

export { money, parseRate, splitBill } from "./rateMath";

const FEE_KEY = "customer_fee_percent";
const DEFAULT_FEE_PERCENT = 1;

const COMMISSION_KEY = "vendor_commission_percent";
const DEFAULT_COMMISSION_PERCENT = 0.5;

// Cached briefly: billing loops over every household in one run and the rate
// cannot change mid-run, so re-reading it per bill is pure round trips to
// Singapore. Short enough that a change through the admin screen takes effect
// within a minute.
const cache = new Map<string, { percent: number; readAt: number }>();
const CACHE_MS = 60_000;

/**
 * Forget the cached rates, so the next read goes to the database.
 *
 * Called when the admin screen changes a rate. Without it the change takes up
 * to a minute to appear, which reads as "the save did not work" and invites a
 * second save.
 */
export function clearRateCache(): void {
    cache.clear();
}

/** Read a percentage rate from app_config, falling back to a documented default. */
async function rate(key: string, fallback: number): Promise<number> {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.readAt < CACHE_MS) return hit.percent;

    let percent = fallback;
    try {
        const [row] = await db
            .select({ value: appConfig.value })
            .from(appConfig)
            .where(eq(appConfig.key, key))
            .limit(1);

        const parsed = parseFloat(row?.value ?? "");
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
            percent = parsed;
        } else if (row) {
            console.warn(`[Fees] ${key} is "${row.value}" — not a usable rate, using ${fallback}%`);
        }
    } catch (err) {
        console.error(`[Fees] Could not read ${key}, using default:`, err);
    }

    cache.set(key, { percent, readAt: Date.now() });
    return percent;
}

/**
 * The platform fee charged to customers, as a percentage of the bill subtotal.
 *
 * Disclosed in clause 8.7 of the customer terms, which commits us to showing it
 * as a separate line before payment and to giving seven days' notice before any
 * change. Stored in app_config so the rate can be corrected without a release.
 *
 * Falls back to 1% if the row is missing or unreadable rather than throwing:
 * a bill that fails to generate is worse than one carrying the documented rate.
 */
export async function customerFeePercent(): Promise<number> {
    return rate(FEE_KEY, DEFAULT_FEE_PERCENT);
}

/**
 * The service charge taken from the milkman, as a percentage of his revenue.
 *
 * A flat rate for every milkman, agreed at 0.5%. A per-milkman value on the
 * milkmen row still wins if one is set, so a negotiated deal can be honoured
 * without changing the rate everyone else pays — but nothing sets one today.
 */
export async function vendorCommissionPercent(): Promise<number> {
    return rate(COMMISSION_KEY, DEFAULT_COMMISSION_PERCENT);
}

