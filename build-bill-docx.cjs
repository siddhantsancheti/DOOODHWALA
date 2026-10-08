// Generates an editable Word version of the customer bill layout, so the
// wording and structure can be revised outside the code and handed back.
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ShadingType, HeadingLevel,
} = require("docx");
const fs = require("fs");

const CONTENT = 9026;          // A4 content width in DXA
const INK = "1A1714";
const MUTED = "5A5148";
const FAINT = "8A8073";
const RULE = "E2D9C9";
const GREEN = "2F6B45";

const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: none, bottom: none, left: none, right: none };
const hair = (color = RULE) => ({ style: BorderStyle.SINGLE, size: 4, color });

const txt = (text, o = {}) => new TextRun({
  text, font: "Calibri", size: o.size ?? 20,
  bold: o.bold, color: o.color ?? INK, allCaps: o.caps, italics: o.italics,
});
const p = (runs, o = {}) => new Paragraph({
  children: Array.isArray(runs) ? runs : [runs],
  alignment: o.align, spacing: { before: o.before ?? 0, after: o.after ?? 60 },
  border: o.border,
});
const cell = (children, o = {}) => new TableCell({
  children, width: { size: o.w, type: WidthType.DXA },
  borders: o.borders ?? noBorders,
  shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: "auto" } : undefined,
  margins: { top: 60, bottom: 60, left: 0, right: 120 },
});

const label = (t) => p(txt(t, { size: 15, color: FAINT, bold: true, caps: true }), { after: 40 });

// ── header ───────────────────────────────────────────────────────────────
const header = new Table({
  width: { size: CONTENT, type: WidthType.DXA },
  columnWidths: [5400, 3626],
  borders: noBorders,
  rows: [new TableRow({ children: [
    cell([
      p(txt("DOOODHWALA", { size: 34, bold: true }), { after: 30 }),
      p(txt("Sambhavshri Agro Processing LLP · LLPIN ACB-4950", { size: 17, color: MUTED }), { after: 20 }),
      p(txt("11/D, Pagariya Residency, Vedant Nagar, Chhatrapati Sambhaji Nagar", { size: 17, color: MUTED })),
    ], { w: 5400 }),
    cell([
      p(txt("BILL", { size: 26, bold: true }), { align: AlignmentType.RIGHT, after: 30 }),
      p(txt("No. 12", { size: 17, color: MUTED }), { align: AlignmentType.RIGHT, after: 20 }),
      p(txt("August 2026", { size: 17, color: MUTED }), { align: AlignmentType.RIGHT, after: 20 }),
      p(txt("Due 7 Sep 2026", { size: 17, color: MUTED }), { align: AlignmentType.RIGHT, after: 20 }),
      p(txt("PAYABLE", { size: 16, bold: true, color: "A8322D" }), { align: AlignmentType.RIGHT }),
    ], { w: 3626 }),
  ]})],
});

// ── parties ──────────────────────────────────────────────────────────────
const parties = new Table({
  width: { size: CONTENT, type: WidthType.DXA },
  columnWidths: [4513, 4513],
  borders: noBorders,
  rows: [new TableRow({ children: [
    cell([
      label("Billed to"),
      p(txt("Sachin Sancheti", { bold: true }), { after: 20 }),
      p(txt("2, Costa Mapple, New Osmanpura, Chhatrapati Sambhajinagar 431005", { size: 17, color: MUTED }), { after: 20 }),
      p(txt("8308804099", { size: 17, color: MUTED })),
    ], { w: 4513 }),
    cell([
      label("Supplied by"),
      p(txt("Topotop Doodhwala", { bold: true }), { after: 20 }),
      p(txt("Vedant Nagar, Chhatrapati Sambhaji Nagar", { size: 17, color: MUTED }), { after: 20 }),
      p(txt("9309996816", { size: 17, color: MUTED })),
    ], { w: 4513 }),
  ]})],
});

// ── line items ───────────────────────────────────────────────────────────
const COLS = [4226, 1400, 1600, 1800];
const th = (t, right) => cell(
  [p(txt(t, { size: 15, color: FAINT, bold: true, caps: true }), { align: right ? AlignmentType.RIGHT : undefined })],
  { w: COLS[right === undefined ? 0 : right], borders: { ...noBorders, bottom: hair(INK) } },
);
const td = (t, i, o = {}) => cell(
  [p(txt(t, { bold: o.bold }), { align: i === 0 ? undefined : AlignmentType.RIGHT })],
  { w: COLS[i], borders: { ...noBorders, bottom: hair() } },
);

const items = new Table({
  width: { size: CONTENT, type: WidthType.DXA },
  columnWidths: COLS,
  borders: noBorders,
  rows: [
    new TableRow({ children: [
      cell([p(txt("Item", { size: 15, color: FAINT, bold: true, caps: true }))], { w: COLS[0], borders: { ...noBorders, bottom: hair(INK) } }),
      cell([p(txt("Qty", { size: 15, color: FAINT, bold: true, caps: true }), { align: AlignmentType.RIGHT })], { w: COLS[1], borders: { ...noBorders, bottom: hair(INK) } }),
      cell([p(txt("Rate", { size: 15, color: FAINT, bold: true, caps: true }), { align: AlignmentType.RIGHT })], { w: COLS[2], borders: { ...noBorders, bottom: hair(INK) } }),
      cell([p(txt("Amount", { size: 15, color: FAINT, bold: true, caps: true }), { align: AlignmentType.RIGHT })], { w: COLS[3], borders: { ...noBorders, bottom: hair(INK) } }),
    ]}),
    new TableRow({ children: [td("Cow Milk", 0), td("30", 1), td("₹25.00", 2), td("₹750.00", 3)] }),
    new TableRow({ children: [td("Buffalo Milk", 0), td("5", 1), td("₹50.00", 2), td("₹250.00", 3)] }),
  ],
});

// ── totals ───────────────────────────────────────────────────────────────
const TOT = [5426, 3600];
const totRow = (l, v, o = {}) => new TableRow({ children: [
  cell([p(txt(l, { bold: o.bold, color: o.color }), { align: AlignmentType.RIGHT })],
       { w: TOT[0], borders: o.top ? { ...noBorders, top: hair(INK) } : noBorders }),
  cell([p(txt(v, { bold: o.bold, size: o.size }), { align: AlignmentType.RIGHT })],
       { w: TOT[1], borders: o.top ? { ...noBorders, top: hair(INK) } : noBorders }),
]});

const totals = new Table({
  width: { size: CONTENT, type: WidthType.DXA },
  columnWidths: TOT,
  borders: noBorders,
  rows: [
    totRow("Milk & products", "₹1,000.00"),
    totRow("Platform fee (1%)", "₹10.00", { color: MUTED }),
    totRow("Total", "₹1,010.00", { bold: true, size: 26, top: true }),
  ],
});

const foot = (t, o = {}) => p(txt(t, { size: 15, color: FAINT, italics: o.italics }), { after: 40 });

const doc = new Document({
  sections: [{
    properties: { page: { margin: { top: 900, bottom: 900, left: 900, right: 900 } } },
    children: [
      header,
      p(txt(""), { after: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: INK } } }),
      p(txt(""), { after: 160 }),
      parties,
      p(txt(""), { after: 200 }),
      items,
      p(txt(""), { after: 200 }),
      totals,
      p(txt(""), { after: 260 }),
      p(txt(""), { after: 100, border: { bottom: hair() } }),
      foot("26 deliveries in this period."),
      foot("The contract for supply is between you and the supplier named above. DOOODHWALA operates the platform connecting you."),
      foot("Queries: Sachin Sancheti · sambhavshriagroprocessing@gmail.com · 8308804099"),
      foot("This is a computer-generated bill and does not require a signature. Not a tax invoice.", { italics: true }),
    ],
  }],
});

Packer.toBuffer(doc).then((b) => {
  const out = process.argv[2];
  fs.writeFileSync(out, b);
  console.log("wrote", out, b.length, "bytes");
});
