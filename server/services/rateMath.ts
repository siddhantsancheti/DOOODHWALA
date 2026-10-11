/**
 * The arithmetic and validation behind platform rates, with no database.
 *
 * Split out from platformFees.ts so a check can import the real functions.
 * While this lived beside the db import, a test could only reach it by holding
 * its own copy — and a copy of money arithmetic passes its assertions happily
 * after the original has changed underneath it.
 */

/** Money, to paise, as a string — the form every decimal column here takes. */
export function money(n: number): string {
    return (Math.round(n * 100) / 100).toFixed(2);
}

/**
 * A percentage typed by a human, as a number, or null if it is not one.
 *
 * Guards money. The admin endpoint previously did `isNaN(parseFloat(v))` and
 * then stored `v.toString()`, so "5abc" passed the check and reached a decimal
 * column, and "150" and "-50" passed outright — a commission over 100 makes the
 * milkman's payout negative, and a negative one pays him more than the goods
 * were worth. Parse once, bound it, and store what was parsed.
 *
 * Two decimals, because that is what the column holds; "0.123" is rejected
 * rather than silently rounded into a rate nobody agreed to.
 */
export function parseRate(input: unknown): number | null {
    if (typeof input !== "number" && typeof input !== "string") return null;
    if (typeof input === "number" && !Number.isFinite(input)) return null;
    const s = String(input).trim();
    // parseFloat stops at the first non-numeric character; this does not.
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) return null;
    const n = Number(s);
    if (!Number.isFinite(n) || n < 0 || n > 100) return null;
    return n;
}

/**
 * Split a bill into what the customer pays and what the milkman keeps.
 *
 * The vendor commission is charged on the subtotal, not on the customer's
 * total — charging a milkman commission on our own fee would be taking a cut
 * of our cut.
 */
export function splitBill(subtotal: number, feePercent: number, commissionPercent: number) {
    const customerFeeAmount = (subtotal * feePercent) / 100;
    const vendorCommissionAmount = (subtotal * commissionPercent) / 100;
    return {
        subtotal: money(subtotal),
        customerFeePercent: money(feePercent),
        customerFeeAmount: money(customerFeeAmount),
        vendorCommissionPercent: money(commissionPercent),
        vendorCommissionAmount: money(vendorCommissionAmount),
        totalAmount: money(subtotal + customerFeeAmount),   // what the customer owes
        milkmanPayout: money(subtotal - vendorCommissionAmount), // what he keeps
    };
}
