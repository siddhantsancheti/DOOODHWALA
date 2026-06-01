// Shared helpers for generating + sharing PDF documents (bills & order receipts).
// Uses expo-print to render HTML → PDF and expo-sharing to hand it to the OS
// share sheet (WhatsApp, Drive, "Save to Files", etc.).
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

const BRAND = '#2563EB';

function rupee(n: any): string {
  const v = parseFloat(n ?? 0) || 0;
  return `₹${v.toFixed(2)}`;
}

function shell(title: string, body: string): string {
  return `
  <html>
    <head><meta charset="utf-8" />
      <style>
        * { font-family: -apple-system, Roboto, Helvetica, sans-serif; }
        body { padding: 28px; color: #111827; }
        .brand { color: ${BRAND}; font-size: 26px; font-weight: 800; letter-spacing: .5px; }
        .sub { color: #6B7280; font-size: 13px; margin-top: 2px; }
        h1 { font-size: 20px; margin: 24px 0 4px; }
        .row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid #F3F4F6; font-size: 14px; }
        .label { color: #6B7280; }
        .value { font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
        th, td { text-align: left; padding: 8px 6px; border-bottom: 1px solid #E5E7EB; }
        th { color: #6B7280; font-weight: 600; }
        .total { margin-top: 18px; display:flex; justify-content: space-between; font-size: 18px; font-weight: 800; color: ${BRAND}; }
        .badge { display:inline-block; padding: 4px 12px; border-radius: 14px; font-size: 12px; font-weight: 700; }
        .foot { margin-top: 34px; color: #9CA3AF; font-size: 11px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="brand">DOOODHWALA</div>
      <div class="sub">Daily milk delivery</div>
      <h1>${title}</h1>
      ${body}
      <div class="foot">This is a system-generated document from DOOODHWALA · Generated on ${new Date().toLocaleString()}</div>
    </body>
  </html>`;
}

async function printAndShare(html: string, fileName: string) {
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: fileName,
      UTI: 'com.adobe.pdf',
    });
  } else {
    Alert.alert('Saved', `PDF generated at:\n${uri}`);
  }
}

export async function downloadBill(bill: any) {
  try {
    const items: any[] = Array.isArray(bill.items) ? bill.items : [];
    const rows = items.length
      ? items.map((it) => `
          <tr>
            <td>${it.product || 'Order'}</td>
            <td>${parseFloat(it.quantity ?? 0) || 0} L</td>
            <td>${rupee(it.price)}</td>
            <td>${rupee(it.amount)}</td>
          </tr>`).join('')
      : `<tr><td colspan="4" style="color:#9CA3AF">Itemised orders unavailable</td></tr>`;

    const statusColor = bill.status === 'paid' ? '#16A34A' : bill.status === 'overdue' ? '#DC2626' : '#CA8A04';
    const body = `
      <div class="row"><span class="label">Bill Number</span><span class="value">#${bill.id}</span></div>
      <div class="row"><span class="label">Billing Period</span><span class="value">${bill.month || ''} ${bill.year || ''}</span></div>
      <div class="row"><span class="label">Due Date</span><span class="value">${bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : '-'}</span></div>
      <div class="row"><span class="label">Status</span><span class="badge" style="background:${statusColor}22;color:${statusColor}">${(bill.status || 'pending').toUpperCase()}</span></div>
      <table>
        <thead><tr><th>Product</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="total"><span>Total Payable</span><span>${rupee(bill.totalAmount)}</span></div>`;
    await printAndShare(shell('Monthly Bill', body), `Bill-${bill.id}.pdf`);
  } catch (e: any) {
    Alert.alert('Could not generate bill', e?.message || 'Please try again.');
  }
}

export async function downloadOrderReceipt(order: any) {
  try {
    const qty = parseFloat(order.quantity ?? 0) || 0;
    const amount = parseFloat(order.totalAmount ?? order.orderTotal ?? 0) || 0;
    const body = `
      <div class="row"><span class="label">Receipt Number</span><span class="value">#${order.id}</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : (order.date || '-')}</span></div>
      <div class="row"><span class="label">Product</span><span class="value">${order.milkType || order.product || 'Fresh Milk'}</span></div>
      <div class="row"><span class="label">Quantity</span><span class="value">${qty} L</span></div>
      <div class="row"><span class="label">Status</span><span class="value">${(order.status || 'delivered').toUpperCase()}</span></div>
      <div class="total"><span>Total Paid</span><span>${rupee(amount)}</span></div>`;
    await printAndShare(shell('Order Receipt', body), `Receipt-${order.id}.pdf`);
  } catch (e: any) {
    Alert.alert('Could not generate receipt', e?.message || 'Please try again.');
  }
}
