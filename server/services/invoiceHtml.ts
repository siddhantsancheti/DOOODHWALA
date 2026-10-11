/**
 * The customer's downloadable bill and its companion order history, as
 * self-contained HTML pages.
 *
 * Rendered on the server rather than in the app so there is exactly one
 * definition of what a bill looks like and how its money is presented — the
 * app turns this into a PDF, and the web client can print the same thing.
 *
 * Laid out to match the approved reference design: a branded header, the
 * customer and bill blocks side by side, deliveries summarised by product, and
 * a Bill Summary that ends in the net amount.
 *
 * Headed "Monthly Bill", not "Tax Invoice". The supply contract is between the
 * customer and the dairyman — DOOODHWALA operates the platform and charges a
 * fee — so a tax invoice in DOOODHWALA's name would assert it sold milk it did
 * not sell. The GSTIN is shown because the operator is registered; the document
 * title is what changes with who supplied the goods.
 */

const OPERATOR = {
    name: "Sambhavshri Agro Processing LLP",
    llpin: "ACB-4950",
    gstin: "27AFAFS3972A1Z5",
    tagline: "Fresh Milk Delivered to Your Doorstep",
    promise: "Pure • Fresh • Healthy",
    // City only. The full registered office stays in the terms, where it has to
    // be; on a bill it is noise beside the customer's own address, and it is a
    // home address printed on a document that gets shared around.
    address: "Chhatrapati Sambhajinagar",
    phone: "8308804099",
    email: "sambhavshriagroprocessing@gmail.com",
    website: "www.sambhavshri.com",
    grievance: "Sachin Sancheti · sambhavshriagroprocessing@gmail.com · 8308804099",
};

function esc(v: unknown): string {
    return String(v ?? "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function inr(v: unknown): string {
    const n = parseFloat(String(v ?? "0")) || 0;
    return "₹ " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Bare number, for table cells where the column header already says rupees. */
function num(v: unknown, dp = 2): string {
    const n = parseFloat(String(v ?? "0")) || 0;
    return n.toLocaleString("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

function monthName(billMonth: string): string {
    const [y, m] = String(billMonth || "").split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return isNaN(d.getTime())
        ? billMonth
        : d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/** dd/mm/yyyy, as the reference design uses throughout. */
function dmy(d: unknown): string {
    const dt = d ? new Date(d as any) : null;
    if (!dt || isNaN(dt.getTime())) return "—";
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}

/**
 * The first and last day of the billing month, as dd/mm/yyyy.
 *
 * Derived from billMonth rather than from the items, so an empty month still
 * states the period it covers instead of showing a blank range.
 */
function billingPeriod(billMonth: string): { from: string; to: string } {
    const [y, m] = String(billMonth || "").split("-").map(Number);
    if (!y || !m) return { from: "—", to: "—" };
    return { from: dmy(new Date(y, m - 1, 1)), to: dmy(new Date(y, m, 0)) };
}

/**
 * The human-facing bill number, e.g. DW-2026-0007.
 *
 * The year comes from the billing month, not from today, so a bill reprinted in
 * January still carries the number it was issued under.
 */
function billNumber(bill: any): string {
    const year = String(bill?.billMonth || "").split("-")[0] || String(new Date().getFullYear());
    return `DW-${year}-${String(bill?.id ?? 0).padStart(4, "0")}`;
}

/**
 * Deliveries collapsed to one row per product: how many litres in total, and
 * what they came to.
 *
 * The reference design summarises the month this way — "Cow Milk, 60, 1200.00"
 * — rather than listing every delivery, which is what the order history is for.
 */
function summariseByProduct(items: any[]): { product: string; qty: number; amount: number }[] {
    const byProduct = new Map<string, { product: string; qty: number; amount: number }>();
    for (const it of items) {
        const key = String(it?.product || "Order");
        const row = byProduct.get(key) || { product: key, qty: 0, amount: 0 };
        row.qty += parseFloat(String(it?.quantity ?? 0)) || 0;
        row.amount += parseFloat(String(it?.amount ?? 0)) || 0;
        byProduct.set(key, row);
    }
    return [...byProduct.values()];
}

/** The shared page head: brand, tagline, operator line. */
function headerHtml(): string {
    return `
  <header class="brandbar">
    <div class="brandmark">
      <div class="brand">DOOODHWALA</div>
      <div class="tagline">${esc(OPERATOR.tagline)}</div>
      <div class="promise">${esc(OPERATOR.promise)}</div>
    </div>
    <div class="operator">
      Under ${esc(OPERATOR.name)}<br>
      GST NO. ${esc(OPERATOR.gstin)}<br>
      LLPIN ${esc(OPERATOR.llpin)} · ${esc(OPERATOR.address)}
    </div>
  </header>`;
}

/** Styles shared by both documents, so the two pages look like one book. */
const BASE_CSS = `
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1A1714; margin: 0; font-size: 12px; line-height: 1.5; background: #fff;
  }

  .brandbar {
    display: flex; justify-content: space-between; align-items: flex-start; gap: 18px;
    background: #1B67B0; color: #fff; padding: 14px 16px; border-radius: 6px;
  }
  .brand { font-size: 23px; font-weight: 800; letter-spacing: 0.5px; line-height: 1.1; }
  .tagline { font-size: 11.5px; opacity: 0.95; margin-top: 2px; }
  .promise { font-size: 10.5px; opacity: 0.85; letter-spacing: 0.06em; margin-top: 1px; }
  .operator { text-align: right; font-size: 9.5px; line-height: 1.5; opacity: 0.95; white-space: nowrap; }

  .doctitle {
    text-align: center; font-size: 15px; font-weight: 800; letter-spacing: 0.14em;
    text-transform: uppercase; margin: 16px 0 14px; color: #1A1714;
  }

  .blocks { display: flex; gap: 14px; margin-bottom: 16px; }
  .block { flex: 1; border: 1px solid #E2D9C9; border-radius: 5px; overflow: hidden; }
  .block h3 {
    margin: 0; padding: 6px 10px; font-size: 9.5px; letter-spacing: 0.09em;
    text-transform: uppercase; color: #5A5148; background: #F7F2E9; font-weight: 700;
    border-bottom: 1px solid #E2D9C9;
  }
  .block dl { margin: 0; padding: 8px 10px; }
  .block .line { display: flex; gap: 8px; padding: 2.5px 0; font-size: 11px; }
  .block .k { color: #7A6E60; min-width: 96px; }
  .block .v { color: #1A1714; font-weight: 600; flex: 1; }

  .status { display: inline-block; padding: 2px 8px; border-radius: 3px;
            font-size: 9.5px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; }
  .status.paid { background: #E5EFE7; color: #2F6B45; }
  .status.due  { background: #FBECD9; color: #9A5B10; }

  .sectitle { font-size: 11.5px; font-weight: 800; letter-spacing: 0.04em; margin: 0 0 6px; }

  table { width: 100%; border-collapse: collapse; }
  thead th {
    text-align: left; font-size: 9.5px; letter-spacing: 0.07em; text-transform: uppercase;
    color: #fff; background: #2C7BBF; padding: 7px 9px; font-weight: 700;
  }
  tbody td { padding: 6.5px 9px; border-bottom: 1px solid #EFE9DE; }
  tbody tr:nth-child(even) td { background: #FBF8F3; }
  th.num, td.num { text-align: right; font-variant-numeric: tabular-nums; }
  tfoot td {
    padding: 8px 9px; font-weight: 800; border-top: 2px solid #1A1714;
    background: #F7F2E9; font-variant-numeric: tabular-nums;
  }
  .muted { color: #8A8073; font-style: italic; }

  .foot { margin-top: 20px; border-top: 1px solid #E2D9C9; padding-top: 9px;
          font-size: 9.5px; color: #8A8073; }
  .foot p { margin: 0 0 3px; }
  .thanks { text-align: center; font-size: 12px; font-weight: 700; color: #1B67B0;
            margin: 18px 0 4px; }
  .support { text-align: center; font-size: 10px; color: #5A5148; }
`;

export function renderInvoiceHtml(input: {
    bill: any;
    customerName?: string | null;
    customerAddress?: string | null;
    customerPhone?: string | null;
    customerId?: number | string | null;
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
    const period = billingPeriod(bill.billMonth);

    const summary = summariseByProduct(items);
    const rows = summary.length
        ? summary.map((r, i) => `
            <tr>
              <td class="num">${i + 1}</td>
              <td>${esc(r.product)}</td>
              <td class="num">${num(r.qty, r.qty % 1 === 0 ? 0 : 2)}</td>
              <td class="num">${num(r.amount)}</td>
            </tr>`).join("")
        : `<tr><td colspan="4" class="muted">No deliveries recorded for this period.</td></tr>`;

    const goodsTotal = summary.reduce((s, r) => s + r.amount, 0);

    return `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(billNumber(bill))} — ${esc(monthName(bill.billMonth))}</title>
<style>
${BASE_CSS}
  .totals { margin-left: auto; width: 290px; margin-top: 14px;
            border: 1px solid #E2D9C9; border-radius: 5px; overflow: hidden; }
  .totals h3 { margin: 0; padding: 6px 10px; font-size: 9.5px; letter-spacing: 0.09em;
               text-transform: uppercase; color: #5A5148; background: #F7F2E9;
               font-weight: 700; border-bottom: 1px solid #E2D9C9; }
  .totals .row { display: flex; justify-content: space-between; padding: 5px 10px;
                 font-variant-numeric: tabular-nums; font-size: 11px; }
  .totals .row .lbl { color: #5A5148; }
  .totals .row.grand { border-top: 2px solid #1A1714; background: #F7F2E9;
                       font-size: 14px; font-weight: 800; padding: 9px 10px; }
  .totals .row.grand .lbl { color: #1A1714; }
</style></head>
<body>

${headerHtml()}

  <div class="doctitle">Monthly Bill</div>

  <div class="blocks">
    <div class="block">
      <h3>Customer Details</h3>
      <dl>
        <div class="line"><span class="k">Customer Name</span><span class="v">${esc(input.customerName || "—")}</span></div>
        <div class="line"><span class="k">Mobile No.</span><span class="v">${esc(input.customerPhone || "—")}</span></div>
        <div class="line"><span class="k">Address</span><span class="v">${esc(input.customerAddress || "—")}</span></div>
        <div class="line"><span class="k">Customer ID</span><span class="v">${esc(input.customerId ?? "—")}</span></div>
      </dl>
    </div>
    <div class="block">
      <h3>Monthly Bill</h3>
      <dl>
        <div class="line"><span class="k">Bill Number</span><span class="v">${esc(billNumber(bill))}</span></div>
        <div class="line"><span class="k">Billing Period</span><span class="v">${esc(period.from)} to ${esc(period.to)}</span></div>
        <div class="line"><span class="k">Bill Date</span><span class="v">${esc(dmy(bill.createdAt))}</span></div>
        <div class="line"><span class="k">Due Date</span><span class="v">${esc(dmy(bill.dueDate))}</span></div>
        <div class="line"><span class="k">Status</span><span class="v"><span class="status ${paid ? "paid" : "due"}">${paid ? "Paid" : "Pending"}</span></span></div>
      </dl>
    </div>
  </div>

  <div class="blocks">
    <div class="block">
      <h3>Supplied by</h3>
      <dl>
        <div class="line"><span class="k">Dairyman</span><span class="v">${esc(input.supplierName || "Your dairyman")}</span></div>
        ${input.supplierAddress ? `<div class="line"><span class="k">Address</span><span class="v">${esc(input.supplierAddress)}</span></div>` : ""}
        ${input.supplierPhone ? `<div class="line"><span class="k">Mobile No.</span><span class="v">${esc(input.supplierPhone)}</span></div>` : ""}
      </dl>
    </div>
  </div>

  <p class="sectitle">Daily Milk Delivery Details</p>
  <table>
    <thead>
      <tr>
        <th class="num" style="width:52px">Sr No</th>
        <th>Particulars</th>
        <th class="num" style="width:90px">Total Ltr</th>
        <th class="num" style="width:110px">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    ${summary.length ? `<tfoot><tr>
      <td colspan="2">Total</td>
      <td class="num">${num(summary.reduce((s, r) => s + r.qty, 0), 2)}</td>
      <td class="num">${num(goodsTotal)}</td>
    </tr></tfoot>` : ""}
  </table>

  <div class="totals">
    <h3>Bill Summary</h3>
    <div class="row"><span class="lbl">Milk Charges</span><span>${inr(subtotal)}</span></div>
    <div class="row"><span class="lbl">Delivery Charges</span><span>${inr(0)}</span></div>
    ${feeAmount > 0
        ? `<div class="row"><span class="lbl">Platform fee (${esc(feePercent)}%)</span><span>${inr(feeAmount)}</span></div>`
        : `<div class="row"><span class="lbl">Other Charges</span><span>${inr(0)}</span></div>`}
    <div class="row"><span class="lbl">Discount</span><span>- ${inr(0)}</span></div>
    <div class="row grand"><span class="lbl">Net Amount</span><span>${inr(bill.totalAmount)}</span></div>
  </div>

  <p class="thanks">Thank you for choosing DOOODHWALA!</p>
  <p class="support">Customer Support: ${esc(OPERATOR.phone)} · ${esc(OPERATOR.email)} · ${esc(OPERATOR.website)}</p>

  <div class="foot">
    <p><strong>${esc(bill.totalOrders ?? items.length)}</strong> deliveries in this period.</p>
    ${paid ? `<p>Paid on ${esc(dmy(bill.paidAt))}. No payment due.</p>` : ""}
    <p>The contract for supply is between you and the dairyman named above. DOOODHWALA operates the platform connecting you.</p>
    <p>Queries: ${esc(OPERATOR.grievance)}</p>
    <p>This is a computer-generated bill and does not require a signature.</p>
  </div>

</body></html>`;
}

/**
 * The order history that accompanies a bill: every delivery in the period, one
 * row per day, as the reference design lays it out.
 *
 * A bill answers "what do I owe"; this answers "what did I actually get" —
 * which is the question a customer asks when an amount surprises them. Sent as
 * a separate document so the bill itself stays to one page.
 */
export function renderOrderHistoryHtml(input: {
    bill: any;
    customerName?: string | null;
    customerAddress?: string | null;
    customerPhone?: string | null;
    customerId?: number | string | null;
    supplierName?: string | null;
}): string {
    const { bill } = input;
    const items: any[] = Array.isArray(bill.items) ? bill.items : [];
    const period = billingPeriod(bill.billMonth);

    // Oldest first, so the month reads top to bottom like a diary. Undated
    // entries sort last rather than pretending to be 1 January 1970.
    const sorted = [...items].sort((a, b) => {
        const ta = a?.date ? new Date(a.date).getTime() : Infinity;
        const tb = b?.date ? new Date(b.date).getTime() : Infinity;
        return ta - tb;
    });

    const totalQty = sorted.reduce((s, it) => s + (parseFloat(String(it?.quantity ?? 0)) || 0), 0);
    const totalAmt = sorted.reduce((s, it) => s + (parseFloat(String(it?.amount ?? 0)) || 0), 0);

    const rows = sorted.length
        ? sorted.map((it) => `
            <tr>
              <td>${esc(it?.date ? dmy(it.date) : "—")}</td>
              <td>${esc(it?.product || "Order")}</td>
              <td class="num">${num(it?.quantity, 2)}</td>
              <td class="num">${it?.price != null ? num(it.price) : "—"}</td>
              <td class="num">${num(it?.amount)}</td>
            </tr>`).join("")
        : `<tr><td colspan="5" class="muted">No deliveries recorded for this period.</td></tr>`;

    return `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Order history — ${esc(monthName(bill.billMonth))}</title>
<style>
${BASE_CSS}
  tbody tr { page-break-inside: avoid; }
  thead { display: table-header-group; }
</style></head>
<body>

${headerHtml()}

  <div class="doctitle">Daily Milk Delivery Details</div>

  <div class="blocks">
    <div class="block">
      <h3>Customer Details</h3>
      <dl>
        <div class="line"><span class="k">Customer Name</span><span class="v">${esc(input.customerName || "—")}</span></div>
        ${input.customerPhone ? `<div class="line"><span class="k">Mobile No.</span><span class="v">${esc(input.customerPhone)}</span></div>` : ""}
        <div class="line"><span class="k">Address</span><span class="v">${esc(input.customerAddress || "—")}</span></div>
        <div class="line"><span class="k">Customer ID</span><span class="v">${esc(input.customerId ?? "—")}</span></div>
      </dl>
    </div>
    <div class="block">
      <h3>Against Bill</h3>
      <dl>
        <div class="line"><span class="k">Bill Number</span><span class="v">${esc(billNumber(bill))}</span></div>
        <div class="line"><span class="k">Billing Period</span><span class="v">${esc(period.from)} to ${esc(period.to)}</span></div>
        <div class="line"><span class="k">Dairyman</span><span class="v">${esc(input.supplierName || "Your dairyman")}</span></div>
        <div class="line"><span class="k">Deliveries</span><span class="v">${esc(sorted.length)}</span></div>
      </dl>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:92px">Date</th>
        <th>Milk Type</th>
        <th class="num" style="width:84px">Qty. (Ltr)</th>
        <th class="num" style="width:96px">Rate/Ltr (₹)</th>
        <th class="num" style="width:104px">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    ${sorted.length ? `<tfoot><tr>
      <td colspan="2">Total</td>
      <td class="num">${num(totalQty, 2)}</td>
      <td></td>
      <td class="num">${num(totalAmt)}</td>
    </tr></tfoot>` : ""}
  </table>

  <p class="thanks">Thank you for choosing DOOODHWALA!</p>
  <p class="support">Customer Support: ${esc(OPERATOR.phone)} · ${esc(OPERATOR.email)} · ${esc(OPERATOR.website)}</p>

  <div class="foot">
    <p>Quantities and amounts are as recorded when each order was accepted and delivered.</p>
    <p>This history covers the goods only. The amount payable, including any platform fee, is on bill ${esc(billNumber(bill))}.</p>
    <p>Queries: ${esc(OPERATOR.grievance)}</p>
  </div>

</body></html>`;
}
