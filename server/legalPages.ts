import { Router } from "express";

const router = Router();

const LAST_UPDATED = "30 May 2026";
const CONTACT_EMAIL = "siddhantsancheti200207@gmail.com";

function page(title: string, bodyHtml: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} — DOOODHWALA</title>
<style>
  :root { color-scheme: light; }
  body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; max-width: 820px; margin: 0 auto; padding: 32px 20px 80px; }
  h1 { color: #2563eb; font-size: 28px; margin-bottom: 4px; }
  h2 { font-size: 19px; margin-top: 28px; color: #111827; }
  .muted { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
  a { color: #2563eb; }
  ul { padding-left: 20px; }
  li { margin-bottom: 6px; }
  .brand { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
  .brand b { font-size: 20px; }
  footer { margin-top: 40px; font-size: 13px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px; }
</style>
</head>
<body>
  <div class="brand">❤️ <b>DOOODHWALA</b></div>
  <h1>${title}</h1>
  <p class="muted">Last updated: ${LAST_UPDATED}</p>
  ${bodyHtml}
  <footer>
    DOOODHWALA — Daily milk &amp; dairy delivery. Questions? Email
    <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.
  </footer>
</body>
</html>`;
}

// GET /privacy — Privacy Policy (required for Play Store + Firebase brand verification)
router.get("/privacy", (_req, res) => {
    res.type("html").send(page("Privacy Policy", `
    <p>DOOODHWALA ("we", "us", "our") operates the DOOODHWALA mobile application and website
    (the "Service"), a platform connecting customers with local milk/dairy delivery providers
    ("dairymen"). This Privacy Policy explains what information we collect, how we use it, and
    your choices. By using the Service you agree to this policy.</p>

    <h2>1. Information We Collect</h2>
    <ul>
      <li><b>Phone number</b> — used to create your account and verify your identity via OTP.</li>
      <li><b>Profile details</b> — name, delivery address, and (optionally) email.</li>
      <li><b>Location</b> — your delivery address coordinates, and, for dairymen, live GPS during
      active deliveries to provide real-time order tracking and proximity reminders.</li>
      <li><b>Order &amp; billing data</b> — products ordered, quantities, delivery times, and bills.</li>
      <li><b>Payment information</b> — processed securely by our payment partner (Razorpay). We do
      not store your full card or UPI credentials on our servers.</li>
      <li><b>Device information</b> — push-notification token and basic device data to deliver alerts.</li>
    </ul>

    <h2>2. How We Use Your Information</h2>
    <ul>
      <li>To authenticate you and operate your account.</li>
      <li>To place, deliver, and track daily orders, and to generate monthly bills.</li>
      <li>To send order, delivery, and payment notifications (including chat reminders to place
      your order when your dairyman is nearby).</li>
      <li>To process payments and prevent fraud and abuse.</li>
      <li>To provide customer support and improve the Service.</li>
    </ul>

    <h2>3. Sharing of Information</h2>
    <p>We share information only as needed to run the Service:</p>
    <ul>
      <li><b>Your dairyman</b> — your name, address, contact, and orders, so they can deliver.</li>
      <li><b>Household group members</b> — if you join a shared group, order and bill information
      is visible to members of that group.</li>
      <li><b>Service providers</b> — Google Firebase (authentication, notifications), Razorpay
      (payments), and our hosting/maps providers, who process data on our behalf.</li>
      <li><b>Legal</b> — where required by law or to protect rights and safety.</li>
    </ul>
    <p>We do <b>not</b> sell your personal information.</p>

    <h2>4. Location Permissions</h2>
    <p>Customers' location is used to set delivery addresses and show live tracking. Dairymen's
    location is collected during active delivery routes to enable real-time tracking and order
    reminders. You can disable location permission in your device settings, though some features
    may not work as a result.</p>

    <h2>5. Data Retention</h2>
    <p>We retain your information while your account is active and as needed to provide the Service,
    comply with legal obligations, resolve disputes, and enforce agreements. You may request
    deletion of your account and associated data (see Contact).</p>

    <h2>6. Security</h2>
    <p>We use industry-standard measures (encrypted transport, tokenized authentication, and
    PCI-compliant payment processing via Razorpay) to protect your data. No method of transmission
    is 100% secure, but we work to safeguard your information.</p>

    <h2>7. Children</h2>
    <p>The Service is not directed to children under 13, and we do not knowingly collect their data.</p>

    <h2>8. Your Rights</h2>
    <p>You may access, correct, or delete your personal information, or withdraw consent, by
    contacting us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

    <h2>9. Changes to This Policy</h2>
    <p>We may update this policy from time to time. Material changes will be reflected by updating
    the "Last updated" date above.</p>

    <h2>10. Contact</h2>
    <p>DOOODHWALA — <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
    `));
});

// GET /terms — Terms of Service
router.get("/terms", (_req, res) => {
    res.type("html").send(page("Terms of Service", `
    <p>These Terms govern your use of the DOOODHWALA application and website (the "Service").
    By using the Service you agree to these Terms.</p>

    <h2>1. The Service</h2>
    <p>DOOODHWALA connects customers with local dairy-delivery providers ("dairymen"). Dairymen set
    their own product prices; we facilitate ordering, chat, delivery tracking, and billing.</p>

    <h2>2. Accounts</h2>
    <p>You must provide a valid phone number and accurate details. You are responsible for activity
    under your account and for keeping your device secure.</p>

    <h2>3. Orders, Pricing &amp; Bills</h2>
    <p>Prices are set by your dairyman. Orders placed in the chat are aggregated into a monthly bill.
    For household groups, any member may pay the combined bill. You agree to pay for orders you place.</p>

    <h2>4. Payments</h2>
    <p>Online payments are processed by Razorpay. Cash-on-delivery may also be available. You are
    responsible for paying outstanding bills before discontinuing a dairyman or group.</p>

    <h2>5. Acceptable Use</h2>
    <p>You agree not to misuse the Service, place fraudulent orders, or interfere with its operation.</p>

    <h2>6. Disclaimers &amp; Liability</h2>
    <p>The Service is provided "as is". To the extent permitted by law, we are not liable for
    indirect or incidental damages arising from your use of the Service or interactions with dairymen.</p>

    <h2>7. Termination</h2>
    <p>You may stop using the Service at any time after settling outstanding bills. We may suspend
    accounts that violate these Terms.</p>

    <h2>8. Changes</h2>
    <p>We may update these Terms; continued use after changes constitutes acceptance.</p>

    <h2>9. Contact</h2>
    <p>DOOODHWALA — <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
    `));
});

export default router;
