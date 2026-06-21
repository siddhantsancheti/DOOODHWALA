# DOOODHWALA — Payments runbook

How online (Razorpay) and Cash-on-Delivery (COD) payments work, and the
one-time setup needed for the webhook fallback.

## Flows

### Online (Razorpay) — happy path
1. App → `POST /api/payments/razorpay/create-order` with `{ amount, orderId: "BILL_<id>" }`.
   - Server creates a Razorpay order; amount in paise; `notes` carries
     `internalOrderId` + `payerUserId`.
2. App opens Razorpay checkout → user pays.
3. App → `POST /api/payments/razorpay/verify` with the signature.
   - Server verifies the HMAC, reads the **authoritative amount from the bill**
     (never trusts the client), marks the bill paid, records the payment,
     broadcasts `bill_paid`.

### Online — fallback (webhook)
If the app is killed / loses network after paying and never calls `/verify`,
Razorpay still calls our webhook:
- `POST /api/payments/razorpay/webhook` verifies the **raw-body** signature and
  settles the bill (idempotent on `razorpayPaymentId`). The bill id comes from
  the order `notes.internalOrderId`.
- This guarantees a captured payment is never lost.

### Cash on Delivery (COD)
1. App → `POST /api/payments/cod/create-order` with `orderId: "BILL_<id>"`.
   - Server **derives customer/milkman from the bill** (ignores client ids),
     generates a 6-digit OTP, stores it on a PENDING `payments` row (24h expiry),
     and SMSes it to the customer.
2. Customer shows the OTP to the milkman.
3. Milkman → `POST /api/payments/cod/verify-otp` with `{ otp, orderId }`.
   - Server validates the OTP against the stored value + expiry, then marks the
     bill paid with the **authoritative bill amount** and broadcasts `bill_paid`.

## Integrity guarantees
- Amount is always read from the **bill**, never the client.
- Razorpay signature verified server-side (HMAC).
- COD OTP is actually validated (not a mock).
- Idempotent: `/verify` and the webhook can both fire without double-settling.

## One-time setup — Razorpay webhook (REQUIRED for the fallback)
1. **Render → Environment** → add `RAZORPAY_WEBHOOK_SECRET` = a strong random string.
2. **Razorpay Dashboard → Settings → Webhooks → Add New Webhook**:
   - **URL:** `https://<your-render-url>/api/payments/razorpay/webhook`
   - **Secret:** the SAME value as `RAZORPAY_WEBHOOK_SECRET`.
   - **Active events:** `payment.captured`, `order.paid`
   - Save.
3. Test: make a small live payment, then kill the app before it returns — the
   bill should still flip to paid within seconds (via the webhook).

> Without this, the happy path still works; only the safety net is inactive.

## Keys
- `RAZORPAY_KEY_ID` is semi-public (shipped to the client). `RAZORPAY_KEY_SECRET`
  and `RAZORPAY_WEBHOOK_SECRET` are server-only — never expose them. Rotate if leaked.
