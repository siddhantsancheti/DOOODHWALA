/**
 * The operator feed — you, on Telegram, in real time.
 *
 * The counterpart to notifyUser: that one reaches a customer or a dairyman,
 * this one reaches whoever runs the platform. Same contract — best effort,
 * never throws, never blocks a request.
 *
 * Reads the same ALERT_WEBHOOK the health check and the daily digest use, so
 * there is one place to configure alerting and one place to turn it off.
 */

const WEBHOOK = () => process.env.ALERT_WEBHOOK?.trim() || "";

/** What kind of thing happened. The prefix is what makes the feed scannable. */
export const Ops = {
    login: "👤",
    signup: "🆕",
    order: "🥛",
    delivered: "✅",
    money: "💰",
    bill: "🧾",
    household: "🏠",
    problem: "⚠️",
    kyc: "🪪",
} as const;

export type OpsKind = keyof typeof Ops;

/**
 * Telegram accepts roughly one message per second to a single chat and answers
 * 429 above that. "Tell me everything" therefore needs a queue, or the first
 * busy morning silently loses the messages that mattered.
 */
const SPACING_MS = 1200;
const DEDUP_MS = 10_000;
const MAX_QUEUE = 25;

const queue: string[] = [];
const recent = new Map<string, number>();
let draining = false;
let dropped = 0;

function alreadySaidRecently(text: string): boolean {
    const now = Date.now();
    for (const [k, at] of recent) if (now - at > DEDUP_MS) recent.delete(k);
    if (recent.has(text)) return true;
    recent.set(text, now);
    return false;
}

async function send(text: string): Promise<void> {
    const hook = WEBHOOK();
    if (!hook) return;
    try {
        const isTelegram = hook.includes("api.telegram.org");
        const res = isTelegram
            ? await fetch(telegramUrl(hook, text), { signal: AbortSignal.timeout(8000) })
            : await fetch(hook, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ text, content: text }),
                  signal: AbortSignal.timeout(8000),
              });
        if (!res.ok) console.warn(`[ops] webhook returned ${res.status}`);
    } catch (err) {
        console.warn("[ops] could not send:", err);
    }
}

async function drain(): Promise<void> {
    if (draining) return;
    draining = true;
    try {
        while (queue.length > 0) {
            const text = queue.shift()!;
            await send(text);
            if (queue.length > 0) await new Promise((r) => setTimeout(r, SPACING_MS));
        }
        // Say so rather than pretending nothing was lost — a silent gap in the
        // feed is worse than knowing there was one.
        if (dropped > 0) {
            const n = dropped;
            dropped = 0;
            await send(`… and ${n} more event(s) in that burst`);
        }
    } finally {
        draining = false;
    }
}

/**
 * Telegram's sendMessage takes the text as a query parameter. A URL that
 * already ends in text= would send it twice and be rejected with 400, so trim
 * that the same way deploy/notify.sh does — both spellings are in the wild.
 */
function telegramUrl(base: string, text: string): string {
    let url = base.replace(/text=$/, "").replace(/[?&]$/, "");
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}text=${encodeURIComponent(text)}`;
}

/**
 * Report something that just happened.
 *
 * Never awaited by the caller: an event is a side effect of a request, not part
 * of it. Nobody should fail to place an order because Telegram was slow.
 */
export function notifyOps(kind: OpsKind, message: string): void {
    if (!WEBHOOK()) return;

    const text = `${Ops[kind]} ${message}`;
    if (alreadySaidRecently(text)) return;

    // Past this point the burst is bigger than a person can read anyway.
    // Counting the rest beats flooding the phone and being rate-limited.
    if (queue.length >= MAX_QUEUE) {
        dropped += 1;
        return;
    }

    queue.push(text);
    void drain();
}

/** Rupees, formatted the way a bill shows them. */
export function rs(amount: string | number | null | undefined): string {
    const n = typeof amount === "string" ? parseFloat(amount) : amount ?? 0;
    return `Rs ${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}
