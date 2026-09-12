/**
 * Tell the operator — you, on Telegram — that something happened.
 *
 * The counterpart to notifyUser: that one reaches a customer or a dairyman,
 * this one reaches whoever runs the platform. Same contract, deliberately —
 * best effort, never throws, never blocks. Nobody should fail to register
 * because a message could not be delivered to a phone in a lecture hall.
 *
 * Reads the same ALERT_WEBHOOK the health check and the daily digest use, so
 * there is one place to configure alerting and one place to turn it off.
 */

const WEBHOOK = () => process.env.ALERT_WEBHOOK?.trim() || "";

/**
 * Telegram's sendMessage takes the text as a query parameter. A URL that
 * already ends in `text=` would send it twice and be rejected with 400, so trim
 * that the same way deploy/notify.sh does — both spellings are in the wild.
 */
function telegramUrl(base: string, text: string): string {
    let url = base.replace(/text=$/, "").replace(/[?&]$/, "");
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}text=${encodeURIComponent(text)}`;
}

export function notifyOps(message: string): void {
    const hook = WEBHOOK();
    if (!hook) return;

    // Deliberately not awaited. An event notification is a side effect of the
    // request, not part of it — a slow Telegram must not hold up a response.
    void (async () => {
        try {
            const isTelegram = hook.includes("api.telegram.org");
            const res = isTelegram
                ? await fetch(telegramUrl(hook, message), { signal: AbortSignal.timeout(8000) })
                : await fetch(hook, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ text: message, content: message }),
                      signal: AbortSignal.timeout(8000),
                  });
            if (!res.ok) console.warn(`[ops] webhook returned ${res.status}`);
        } catch (err) {
            console.warn("[ops] could not send:", err);
        }
    })();
}

/** Rupees, formatted the way a bill shows them. */
export function rs(amount: string | number | null | undefined): string {
    const n = typeof amount === "string" ? parseFloat(amount) : amount ?? 0;
    return `Rs ${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}
