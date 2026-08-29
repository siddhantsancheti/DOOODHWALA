// Smallest thing that fails if the money split breaks.
import assert from "node:assert";
const money = (n) => (Math.round(n * 100) / 100).toFixed(2);
function splitBill(subtotal, feePercent, commissionPercent) {
  const customerFeeAmount = (subtotal * feePercent) / 100;
  const vendorCommissionAmount = (subtotal * commissionPercent) / 100;
  return {
    subtotal: money(subtotal),
    customerFeeAmount: money(customerFeeAmount),
    vendorCommissionAmount: money(vendorCommissionAmount),
    totalAmount: money(subtotal + customerFeeAmount),
    milkmanPayout: money(subtotal - vendorCommissionAmount),
  };
}

// The worked example: 1000 subtotal, 1% customer fee, 5% vendor commission.
const s = splitBill(1000, 1, 5);
assert.equal(s.totalAmount, "1010.00", "customer pays subtotal + fee");
assert.equal(s.milkmanPayout, "950.00", "milkman keeps subtotal - commission");
assert.equal(s.customerFeeAmount, "10.00");
assert.equal(s.vendorCommissionAmount, "50.00");

// Platform revenue is both halves.
const platform = Number(s.customerFeeAmount) + Number(s.vendorCommissionAmount);
assert.equal(money(platform), "60.00");

// Commission is charged on the subtotal, never on the customer's total —
// otherwise the milkman pays commission on our own fee.
assert.notEqual(s.vendorCommissionAmount, money(1010 * 0.05));

// Zero commission (rate not yet set) must not eat into his money.
assert.equal(splitBill(500, 1, 0).milkmanPayout, "500.00");

// Rounding: a third of a rupee must not leak.
const odd = splitBill(333.33, 1, 5);
assert.equal(odd.totalAmount, "336.66");
assert.equal(odd.customerFeeAmount, "3.33");

// The rates actually agreed: 1% from the customer, 0.5% from the milkman.
const agreed = splitBill(1000, 1, 0.5);
assert.equal(agreed.totalAmount, "1010.00", "customer pays 1% on top");
assert.equal(agreed.milkmanPayout, "995.00", "milkman keeps all but 0.5%");
assert.equal(agreed.vendorCommissionAmount, "5.00");
assert.equal(
  money(Number(agreed.customerFeeAmount) + Number(agreed.vendorCommissionAmount)),
  "15.00",
  "platform earns 1.5% of the subtotal in total",
);

console.log("splitBill: all assertions passed");
