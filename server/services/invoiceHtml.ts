/**
 * The customer's downloadable bill, as a self-contained HTML page.
 *
 * Rendered on the server rather than in the app so there is exactly one
 * definition of what a bill looks like and how its money is presented — the
 * app turns this into a PDF, and the web client can print the same thing.
 *
 * Deliberately called a Bill, not a Tax Invoice. A tax invoice asserts GST
 * registration and carries obligations under the CGST Act; DOOODHWALA has no
 * GSTIN on record. Calling it the wrong thing would be a worse problem than
 * not having a PDF.
 */

const OPERATOR = {
    name: "Sambhavshri Agro Processing LLP",
    llpin: "ACB-4950",
    // City only. The full registered office stays in the terms, where it has to
    // be; on a bill it is noise beside the customer's own address, and it is a
    // home address printed on a document that gets shared around.
    address: "Chhatrapati Sambhajinagar",
    grievance: "Sachin Sancheti · sambhavshriagroprocessing@gmail.com · 8308804099",
};

function esc(v: unknown): string {
    return String(v ?? "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function inr(v: unknown): string {
    const n = parseFloat(String(v ?? "0")) || 0;
    return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthName(billMonth: string): string {
    const [y, m] = String(billMonth || "").split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return isNaN(d.getTime())
        ? billMonth
        : d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function dateStr(d: unknown): string {
    const dt = d ? new Date(d as any) : null;
    return dt && !isNaN(dt.getTime())
        ? dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
        : "—";
}

export function renderInvoiceHtml(input: {
    bill: any;
    customerName?: string | null;
    customerAddress?: string | null;
    customerPhone?: string | null;
    supplierName?: string | null;
    supplierAddress?: string | null;
    supplierPhone?: string | null;
}): string {
    const { bill } = input;

    const items: any[] = Array.isArray(bill.items) ? bill.items : [];
    // Bills raised before the fee existed carry no subtotal — for those the
    // subtotal simply is the total, and no fee line is shown at all.
    const subtotal = bill.subtotal ?? bill.totalAmount;
    const feeAmount = parseFloat(bill.customerFeeAmount ?? "0") || 0;
    const feePercent = bill.customerFeePercent ?? "0";
    const paid = bill.status === "paid";

    const rows = items.length
        ? items.map((it) => `
            <tr>
              <td>${esc(it.product || "Order")}</td>
              <td class="num">${esc(it.quantity ?? "")}</td>
              <td class="num">${it.price != null ? inr(it.price) : "—"}</td>
              <td class="num">${inr(it.amount)}</td>
            </tr>`).join("")
        : `<tr><td colspan="4" class="muted">No itemised entries recorded for this period.</td></tr>`;

    return `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bill ${esc(bill.id)} — ${esc(monthName(bill.billMonth))}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1A1714; margin: 0; font-size: 12px; line-height: 1.55;
    background: #fff;
  }
  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
          border-bottom: 2px solid #1A1714; padding-bottom: 12px; margin-bottom: 18px; }
  .brand { font-size: 20px; font-weight: 700; letter-spacing: -0.4px; margin: 0 0 2px; }
  .brand-sub { color: #5A5148; font-size: 11px; max-width: 320px; }
  .docmeta { text-align: right; font-size: 11px; color: #5A5148; white-space: nowrap; }
  .docmeta .kind { font-size: 15px; font-weight: 700; color: #1A1714; letter-spacing: 0.5px; }
  .status { display: inline-block; margin-top: 6px; padding: 3px 9px; border-radius: 3px;
            font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
  .status.paid { background: #E5EFE7; color: #2F6B45; }
  .status.due  { background: #F7E7E5; color: #A8322D; }

  .parties { display: flex; gap: 28px; margin-bottom: 18px; }
  .party { flex: 1; }
  .party h3 { font-size: 10px; letter-spacing: 0.09em; text-transform: uppercase;
              color: #8A8073; margin: 0 0 4px; font-weight: 600; }
  .party .nm { font-weight: 600; }
  .party div { font-size: 11px; color: #5A5148; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th { text-align: left; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
       color: #8A8073; border-bottom: 1px solid #1A1714; padding: 0 8px 6px 0; font-weight: 600; }
  td { padding: 7px 8px 7px 0; border-bottom: 1px solid #E2D9C9; }
  th.num, td.num { text-align: right; padding-right: 0; font-variant-numeric: tabular-nums; }
  th:last-child, td:last-child { padding-right: 0; }
  .muted { color: #8A8073; font-style: italic; }

  .totals { margin-left: auto; width: 250px; }
  .totals .row { display: flex; justify-content: space-between; padding: 5px 0; font-variant-numeric: tabular-nums; }
  .totals .row.grand { border-top: 2px solid #1A1714; margin-top: 5px; padding-top: 9px;
                       font-size: 15px; font-weight: 700; }
  .totals .lbl.fee { color: #5A5148; }

  .foot { margin-top: 26px; border-top: 1px solid #E2D9C9; padding-top: 10px;
          font-size: 10px; color: #8A8073; }
  .foot p { margin: 0 0 3px; }
</style></head>
<body>

  <div class="head">
    <div>
      <p class="brand">DOOODHWALA</p>
      <div class="brand-sub">
        ${esc(OPERATOR.name)} · LLPIN ${esc(OPERATOR.llpin)}<br>
        ${esc(OPERATOR.address)}
      </div>
    </div>
    <div class="docmeta">
      <div class="kind">BILL</div>
      <div>No. ${esc(bill.id)}</div>
      <div>${esc(monthName(bill.billMonth))}</div>
      <div>Due ${esc(dateStr(bill.dueDate))}</div>
      <span class="status ${paid ? "paid" : "due"}">${paid ? "Paid" : "Payable"}</span>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Billed to</h3>
      <div class="nm">${esc(input.customerName || "Customer")}</div>
      ${input.customerAddress ? `<div>${esc(input.customerAddress)}</div>` : ""}
      ${input.customerPhone ? `<div>${esc(input.customerPhone)}</div>` : ""}
    </div>
    <div class="party">
      <h3>Supplied by</h3>
      <div class="nm">${esc(input.supplierName || "Your milkman")}</div>
      ${input.supplierAddress ? `<div>${esc(input.supplierAddress)}</div>` : ""}
      ${input.supplierPhone ? `<div>${esc(input.supplierPhone)}</div>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Item</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Milk &amp; products</span><span>${inr(subtotal)}</span></div>
    ${feeAmount > 0
        ? `<div class="row"><span class="lbl fee">Platform fee (${esc(feePercent)}%)</span><span>${inr(feeAmount)}</span></div>`
        : ""}
    <div class="row grand"><span>Total</span><span>${inr(bill.totalAmount)}</span></div>
  </div>

  <div class="foot">
    <p><strong>${esc(bill.totalOrders ?? items.length)}</strong> deliveries in this period.</p>
    ${paid ? `<p>Paid on ${esc(dateStr(bill.paidAt))}. No payment due.</p>` : ""}
    <p>The contract for supply is between you and the supplier named above. DOOODHWALA operates the platform connecting you.</p>
    <p>Queries: ${esc(OPERATOR.grievance)}</p>
    <p>This is a computer-generated bill and does not require a signature. Not a tax invoice.</p>
  </div>

</body></html>`;
}

/**
 * The order history that accompanies a bill: every delivery in the period,
 * grouped by the day it was ordered.
 *
 * A bill answers "what do I owe"; this answers "what did I actually get" —
 * which is the question a customer asks when an amount surprises them. Sent as
 * a separate document so the bill itself stays to one page.
 */
export function renderOrderHistoryHtml(input: {
    bill: any;
    customerName?: string | null;
    customerAddress?: string | null;
    supplierName?: string | null;
}): string {
    const { bill } = input;
    const items: any[] = Array.isArray(bill.items) ? bill.items : [];

    // Group by calendar day, keeping the days in order.
    const byDay = new Map<string, any[]>();
    for (const it of items) {
        const key = it.date ? new Date(it.date).toDateString() : "Undated";
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key)!.push(it);
    }
    const days = [...byDay.entries()].sort((a, b) => {
        const ta = a[0] === "Undated" ? 0 : new Date(a[0]).getTime();
        const tb = b[0] === "Undated" ? 0 : new Date(b[0]).getTime();
        return ta - tb;
    });

    const totalQty = items.reduce((s, it) => s + (parseFloat(String(it.quantity ?? 0)) || 0), 0);
    const totalAmt = items.reduce((s, it) => s + (parseFloat(String(it.amount ?? 0)) || 0), 0);

    const dayBlocks = days.length
        ? days.map(([day, rows]) => {
            const dayTotal = rows.reduce((s, r) => s + (parseFloat(String(r.amount ?? 0)) || 0), 0);
            const label = day === "Undated"
                ? "Date not recorded"
                : new Date(day).toLocaleDateString("en-IN",
                    { weekday: "short", day: "numeric", month: "short", year: "numeric" });
            return `
              <section class="day">
                <div class="day-head">
                  <span class="day-date">${esc(label)}</span>
                  <span class="day-total">${inr(dayTotal)}</span>
                </div>
                <table>
                  <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead>
                  <tbody>
                    ${rows.map((r) => `
                      <tr>
                        <td>${esc(r.product || "Order")}</td>
                        <td class="num">${esc(r.quantity ?? "")}</td>
                        <td class="num">${r.price != null ? inr(r.price) : "—"}</td>
                        <td class="num">${inr(r.amount)}</td>
                      </tr>`).join("")}
                  </tbody>
                </table>
              </section>`;
        }).join("")
        : `<p class="empty">No deliveries recorded for this period.</p>`;

    return `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Order history — ${esc(monthName(bill.billMonth))}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
         color: #1A1714; margin: 0; font-size: 12px; line-height: 1.55; background: #fff; }

  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
          border-bottom: 2px solid #1A1714; padding-bottom: 12px; margin-bottom: 16px; }
  .brand { font-size: 20px; font-weight: 700; letter-spacing: -0.4px; margin: 0 0 2px; }
  .brand-sub { color: #5A5148; font-size: 11px; max-width: 320px; }
  .docmeta { text-align: right; font-size: 11px; color: #5A5148; white-space: nowrap; }
  .docmeta .kind { font-size: 15px; font-weight: 700; color: #1A1714; letter-spacing: 0.5px; }

  .who { font-size: 11px; color: #5A5148; margin-bottom: 16px; }
  .who strong { color: #1A1714; }

  .summary { display: flex; gap: 0; border: 1px solid #E2D9C9; border-radius: 4px;
             margin-bottom: 20px; overflow: hidden; }
  .summary div { flex: 1; padding: 9px 12px; border-right: 1px solid #E2D9C9; }
  .summary div:last-child { border-right: none; }
  .summary .k { font-size: 9px; letter-spacing: 0.09em; text-transform: uppercase;
                color: #8A8073; font-weight: 600; }
  .summary .v { font-size: 15px; font-weight: 700; font-variant-numeric: tabular-nums; }

  .day { margin-bottom: 15px; page-break-inside: avoid; }
  .day-head { display: flex; justify-content: space-between; align-items: baseline;
              background: #F2ECE1; padding: 5px 9px; border-radius: 3px; margin-bottom: 2px; }
  .day-date { font-weight: 700; font-size: 11.5px; }
  .day-total { font-size: 11.5px; font-weight: 600; font-variant-numeric: tabular-nums; color: #5A5148; }

  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase;
       color: #8A8073; padding: 5px 8px 4px 9px; font-weight: 600; }
  td { padding: 5px 8px 5px 9px; border-bottom: 1px solid #EFE9DE; }
  tbody tr:last-child td { border-bottom: none; }
  th.num, td.num { text-align: right; padding-right: 9px; font-variant-numeric: tabular-nums; }
  .empty { color: #8A8073; font-style: italic; }

  .foot { margin-top: 22px; border-top: 1px solid #E2D9C9; padding-top: 10px;
          font-size: 10px; color: #8A8073; }
  .foot p { margin: 0 0 3px; }
</style></head>
<body>

  <div class="head">
    <div>
      <p class="brand">DOOODHWALA</p>
      <div class="brand-sub">${esc(OPERATOR.name)} · LLPIN ${esc(OPERATOR.llpin)}</div>
    </div>
    <div class="docmeta">
      <div class="kind">ORDER HISTORY</div>
      <div>${esc(monthName(bill.billMonth))}</div>
      <div>Against bill no. ${esc(bill.id)}</div>
    </div>
  </div>

  <div class="who">
    <strong>${esc(input.customerName || "Customer")}</strong>${input.customerAddress ? ` · ${esc(input.customerAddress)}` : ""}<br>
    Supplied by <strong>${esc(input.supplierName || "your milkman")}</strong>
  </div>

  <div class="summary">
    <div><div class="k">Days with a delivery</div><div class="v">${days.filter(([d]) => d !== "Undated").length}</div></div>
    <div><div class="k">Line entries</div><div class="v">${items.length}</div></div>
    <div><div class="k">Total quantity</div><div class="v">${totalQty.toLocaleString("en-IN")}</div></div>
    <div><div class="k">Value of goods</div><div class="v">${inr(totalAmt || bill.subtotal || bill.totalAmount)}</div></div>
  </div>

  ${dayBlocks}

  <div class="foot">
    <p>Quantities and amounts are as recorded when each order was accepted and delivered.</p>
    <p>This history covers the goods only. The amount payable, including any platform fee, is on bill no. ${esc(bill.id)}.</p>
    <p>Queries: ${esc(OPERATOR.grievance)}</p>
  </div>

</body></html>`;
}
