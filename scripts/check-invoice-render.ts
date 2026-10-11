// The bill and order-history documents, checked against the things that go
// wrong silently: a fee that stops being its own line, a month summarised into
// the wrong litres, a bill number that changes when you reprint it.
//
// Run: npx tsx scripts/check-invoice-render.ts
import assert from "node:assert/strict";
import { renderInvoiceHtml, renderOrderHistoryHtml } from "../server/services/invoiceHtml";

const bill = {
    id: 7,
    billMonth: "2026-09",
    createdAt: "2026-09-28T00:00:00.000Z",
    dueDate: "2026-10-05T00:00:00.000Z",
    status: "pending",
    subtotal: "2400.00",
    customerFeePercent: "1",
    customerFeeAmount: "24.00",
    totalAmount: "2424.00",
    totalOrders: 4,
    items: [
        { date: "2026-09-01T00:00:00.000Z", product: "Cow Milk", quantity: 1, price: 60, amount: 60 },
        { date: "2026-09-02T00:00:00.000Z", product: "Cow Milk", quantity: 1, price: 60, amount: 60 },
        { date: "2026-09-03T00:00:00.000Z", product: "Buffelo Milk", quantity: 2, price: 70, amount: 140 },
        { date: null, product: "Cow Milk", quantity: 1, price: 60, amount: 60 },
    ],
};

const party = {
    customerName: "Asha Kulkarni",
    customerAddress: "12 Jalna Road",
    customerPhone: "9876543210",
    customerId: 41,
    supplierName: "Parivesh Dairy",
    supplierPhone: "9123456780",
};

const invoice = renderInvoiceHtml({ bill, ...party });

// --- the promise in clause 8.7: the fee is its own labelled line ---
assert.match(invoice, /Platform fee \(1%\)/, "the platform fee must appear as its own labelled line");
assert.match(invoice, /₹ 24\.00/, "the fee amount must be shown");
assert.ok(
    invoice.indexOf("Platform fee") < invoice.indexOf("Net Amount"),
    "the fee must be visible before the amount payable, not after it",
);

// --- grouping: three Cow Milk deliveries collapse to one row of 3 litres ---
const cowRow = invoice.match(/<td>Cow Milk<\/td>\s*<td class="num">([^<]+)<\/td>\s*<td class="num">([^<]+)<\/td>/);
assert.ok(cowRow, "Cow Milk must appear as a single summarised row");
assert.equal(cowRow![1].trim(), "3", "three 1-litre deliveries must total 3 litres, not appear three times");
assert.equal(cowRow![2].trim(), "180.00", "and 180.00, not 60.00");
assert.equal((invoice.match(/>Cow Milk</g) || []).length, 1, "Cow Milk must not be listed more than once");
assert.match(invoice, /<td>Buffelo Milk<\/td>/, "each distinct product keeps its own row");

// --- bill number is stable and derived from the billing month, not today ---
assert.match(invoice, /DW-2026-0007/, "bill number is DW-<billing year>-<zero-padded id>");
assert.ok(
    !renderInvoiceHtml({ bill: { ...bill, billMonth: "2025-12" }, ...party }).includes("DW-2026-"),
    "a December 2025 bill must not take this year's number when reprinted",
);

// --- billing period spans the whole month, even with sparse deliveries ---
assert.match(invoice, /01\/09\/2026 to 30\/09\/2026/, "period must be the first to last day of the billing month");

// --- framing: marketplace, and not asserting a tax invoice ---
assert.match(invoice, /contract for supply is between you and the dairyman/i);
assert.doesNotMatch(invoice, /tax invoice/i, "DOOODHWALA does not sell the milk, so this is not a tax invoice");
assert.match(invoice, /GST NO\. 27AFAFS3972A1Z5/, "the operator's registration is still shown");
assert.match(invoice, /Monthly Bill/);

// --- a bill with no deliveries still states its period rather than breaking ---
const empty = renderInvoiceHtml({ bill: { ...bill, items: [], totalOrders: 0 }, ...party });
assert.match(empty, /No deliveries recorded/);
assert.match(empty, /01\/09\/2026 to 30\/09\/2026/);

// --- pre-fee bills: no fee line invented where there was never a fee ---
const legacy = renderInvoiceHtml({
    bill: { ...bill, subtotal: null, customerFeeAmount: null, customerFeePercent: null },
    ...party,
});
assert.doesNotMatch(legacy, /Platform fee/, "a bill raised before the fee existed must not show one");

// --- escaping: a customer name is untrusted text, not markup ---
const nasty = renderInvoiceHtml({ ...party, bill, customerName: '<script>alert(1)</script>' });
assert.doesNotMatch(nasty, /<script>alert/, "customer-supplied text must be escaped");
assert.match(nasty, /&lt;script&gt;/);

// --- order history: one row per delivery, oldest first, undated last ---
const history = renderOrderHistoryHtml({ bill, ...party });
assert.equal((history.match(/>Cow Milk</g) || []).length, 3, "history lists every delivery, unlike the bill");
assert.ok(
    history.indexOf("01/09/2026") < history.indexOf("03/09/2026"),
    "deliveries read oldest first",
);
const undatedAt = history.indexOf("<td>—</td>");
assert.ok(undatedAt > history.indexOf("03/09/2026"), "an undated delivery sorts last, not to 1970");
assert.match(history, /Qty\. \(Ltr\)/);
assert.match(history, /Rate\/Ltr/);
assert.match(history, /DW-2026-0007/, "the history names the bill it belongs to");

// Totals across the whole month, which is the number a customer checks first.
assert.match(history, /320\.00/, "history total is 60+60+140+60");

console.log("invoice render ok — fee itemised, products grouped, numbering stable, history ordered");
