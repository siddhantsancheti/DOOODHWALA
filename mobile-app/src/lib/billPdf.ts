import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";
import { apiRequest } from "./queryClient";

/**
 * Download a bill as a PDF and hand it to the system share sheet, from which
 * the customer can save it, mail it, or send it on WhatsApp.
 *
 * The markup comes from the server so there is one definition of what a bill
 * looks like, and so the platform fee appears as its own line — clause 8.7 of
 * the customer terms is a promise that it does.
 */
export async function downloadBillPdf(
    billId: number,
    opts: { monthLabel?: string; kind?: "invoice" | "history" } = {},
) {
    const kind = opts.kind ?? "invoice";
    try {
        const res = await apiRequest({ url: `/api/bills/${billId}/${kind}`, method: "GET" });
        const html = await res.text();

        const { uri } = await Print.printToFileAsync({ html, base64: false });

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
                mimeType: "application/pdf",
                dialogTitle: kind === "history"
                    ? (opts.monthLabel ? `Order history — ${opts.monthLabel}` : "Order history")
                    : (opts.monthLabel ? `Bill — ${opts.monthLabel}` : "Your bill"),
                UTI: "com.adobe.pdf", // iOS needs this to offer PDF-aware apps
            });
        } else {
            // No share sheet (rare, and some Android builds). Printing still
            // reaches "Save as PDF", so the customer is not stuck.
            await Print.printAsync({ uri });
        }
    } catch (err: any) {
        // A cancelled share sheet throws on some platforms — not an error worth
        // showing, since the customer chose to back out.
        const msg = String(err?.message || "");
        if (/cancel|dismiss/i.test(msg)) return;

        console.error("Bill PDF failed:", err);
        Alert.alert(
            kind === "history" ? "Could not open the order history" : "Could not open the bill",
            Platform.OS === "android"
                ? "Check your connection and try again."
                : "Please try again in a moment.",
        );
    }
}
