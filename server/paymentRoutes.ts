import { Router } from "express";
import { db } from "./db";
import { bills, payments, customers, chatMessages, smsQueue, notifications, familyChatMembers, milkmen, users } from "@shared/schema";
import { eq, desc, and, isNull, inArray, or } from "drizzle-orm";
import Razorpay from "razorpay";
import Stripe from "stripe";
import crypto from "crypto";
import { BillingService } from "./services/billingService";
import { type AuthRequest } from "./middleware/auth";
import { broadcast } from "./websocket";
import { partyUserIds } from "./services/wsParties";
import { sendPushNotification } from "./services/fcmService";

const router = Router();

// Push a real-time "bill paid" event so the milkman (and the customer's other
// devices / chat "Pay Now" card) update instantly, and notify the milkman.
async function notifyBillPaid(bill: any, paidByUserId: string | null) {
    try {
        const targets = await partyUserIds({
            customerId: bill.customerId,
            milkmanId: bill.milkmanId,
            familyChatId: bill.familyChatId,
        });
        broadcast({
            type: "bill_paid",
            billId: bill.id,
            customerId: bill.customerId ?? null,
            milkmanId: bill.milkmanId ?? null,
            familyChatId: bill.familyChatId ?? null,
            amount: bill.totalAmount,
            paidBy: paidByUserId,
        }, targets);
        if (bill.milkmanId) {
            const mk = await db.query.milkmen.findFirst({ where: eq(milkmen.id, bill.milkmanId) });
            if (mk?.userId) {
                await db.insert(notifications).values({
                    userId: mk.userId,
                    title: "Payment Received",
                    message: `A bill of ₹${bill.totalAmount} has been paid.`,
                    type: "payment",
                    relatedId: bill.id,
                    isRead: false,
                });
                const mkUser = await db.query.users.findFirst({ where: eq(users.id, mk.userId) });
                if (mkUser?.fcmToken) {
                    await sendPushNotification(
                        mkUser.fcmToken,
                        "Payment Received 💰",
                        `A bill of ₹${bill.totalAmount} has been paid.`,
                        { type: "bill_paid", billId: String(bill.id) }
                    );
                }
            }
        }
    } catch (e) {
        console.error("notifyBillPaid failed:", e);
    }
}

// Initialize Payment Gateways — conditionally to avoid crashes when keys are missing
let razorpay: Razorpay | null = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
} else {
    console.warn("Razorpay keys missing — payment endpoints will return 503.");
}

let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
} else {
    console.warn("Stripe key missing — Stripe endpoints will return 503.");
}

// Helper to calculate total from chat messages (reusing logic)
const calculatePendingTotal = async (milkmanId: number) => {
    const pendingBills = await db
        .select()
        .from(bills)
        .where(
            and(
                eq(bills.milkmanId, milkmanId),
                eq(bills.status, "pending")
            )
        );
    return pendingBills.reduce((sum, bill) => sum + parseFloat(bill.totalAmount), 0);
};

// GET /api/bills/milkman
router.get("/milkman", async (req, res) => {
    try {
        const milkmanId = req.query.milkmanId ? parseInt(req.query.milkmanId as string) : null;
        if (!milkmanId) return res.status(400).json({ message: "Milkman ID required" });

        const milkmanBills = await db
            .select()
            .from(bills)
            .where(eq(bills.milkmanId, milkmanId))
            .orderBy(desc(bills.createdAt));

        res.json(milkmanBills);
    } catch (error) {
        console.error("Get milkman bills error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/bills/generate
router.post("/generate", async (req, res) => {
    try {
        const { milkmanId, customerId } = req.body;
        if (!milkmanId || !customerId) return res.status(400).json({ message: "Milkman ID and Customer ID required" });

        // We'll reuse the consolidate logic but scoped or simply trigger billing service
        await BillingService.generateMonthlyBill(milkmanId);
        
        res.json({ success: true, message: "Bills generated successfully" });
    } catch (error) {
        console.error("Generate bills error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/payments/cod/pending
router.get("/cod/pending", async (req, res) => {
    try {
        // Find pending COD orders (in this mock, we can just look up smsQueue or pending payments)
        // Since we didn't strictly save COD to payments, let's return [] for now to stop the UI from breaking.
        // A true implementation would query the payments table for 'cod' and 'pending' mapped to milkmanId.
        res.json([]);
    } catch (error) {
        console.error("Get COD pending error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/payments/cod/verify-otp
router.post("/cod/verify-otp", async (req, res) => {
    try {
        const { otp, orderId } = req.body; // orderId is BILL_XX
        const user = (req as any).user;

        if (!otp || !orderId) return res.status(400).json({ message: "OTP and Order ID required" });

        if (!orderId.startsWith('BILL_')) {
            return res.status(400).json({ message: "Invalid order ID format" });
        }
        const billId = parseInt(orderId.replace('BILL_', ''));

        // 1. Find the PENDING COD payment created for this bill and validate the OTP.
        const [pending] = await db.select().from(payments)
            .where(and(
                eq(payments.orderId, orderId),
                eq(payments.paymentMethod, "cod"),
                eq(payments.status, "pending"),
            ))
            .orderBy(desc(payments.createdAt))
            .limit(1);

        if (!pending) {
            return res.status(400).json({ message: "No pending COD payment found for this bill." });
        }
        const details: any = pending.paymentDetails || {};
        if (!details.codOtp || String(details.codOtp) !== String(otp).trim()) {
            return res.status(400).json({ success: false, message: "Incorrect OTP." });
        }
        if (details.expiresAt && new Date(details.expiresAt) < new Date()) {
            return res.status(400).json({ success: false, message: "OTP expired. Please regenerate." });
        }

        // 2. Mark the bill paid (authoritative amount from the bill) + complete payment.
        const [paidBill] = await db.select().from(bills).where(eq(bills.id, billId)).limit(1);
        if (paidBill) {
            // Authorization: only the bill's dairyman / customer / group member may
            // confirm a COD settlement (the OTP is the second factor).
            const parties = await partyUserIds({ customerId: paidBill.customerId, milkmanId: paidBill.milkmanId, familyChatId: paidBill.familyChatId });
            if (user?.id && parties.length && !parties.includes(user.id)) {
                return res.status(403).json({ success: false, message: "Not authorized for this bill." });
            }
        }
        const settledAmount = paidBill?.totalAmount || pending.amount || "0.00";

        await db.update(bills)
            .set({ status: "paid", paidAt: new Date(), paidBy: user.id })
            .where(eq(bills.id, billId));

        await db.update(payments)
            .set({
                status: "completed",
                amount: settledAmount,
                paymentDetails: { ...details, verified: true, verifiedAt: new Date().toISOString() },
            })
            .where(eq(payments.id, pending.id));

        // Real-time: notify milkman + customer that the COD bill is settled.
        if (paidBill) await notifyBillPaid(paidBill, user.id);

        return res.json({ success: true, message: "COD payment verified and Bill updated." });
    } catch (error) {
        console.error("Verify COD OTP error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// --- Consolidated Bill Routes ---

// GET /api/bills/consolidated/:milkmanId
router.get("/consolidated/:milkmanId", async (req, res) => {
    try {
        const milkmanId = parseInt(req.params.milkmanId);

        // Get all pending bills for this milkman
        const results = await db
            .select()
            .from(bills)
            .leftJoin(customers, eq(bills.customerId, customers.id))
            .where(
                and(
                    eq(bills.milkmanId, milkmanId),
                    eq(bills.status, "pending")
                )
            );

        if (results.length === 0) {
            return res.json(null);
        }

        const totalAmount = results.reduce((sum, row) => sum + parseFloat(row.bills.totalAmount), 0);

        const ordersByMemberMap: Record<number, any> = {};

        results.forEach(row => {
            const bill = row.bills;
            const customer = row.customers;

            if (!bill.customerId) return;
            const cId = bill.customerId;

            if (!ordersByMemberMap[cId]) {
                ordersByMemberMap[cId] = {
                    memberId: cId,
                    memberName: customer?.name || "Unknown",
                    memberTotal: 0,
                    orders: []
                };
            }

            ordersByMemberMap[cId].memberTotal += parseFloat(bill.totalAmount);

            const items = bill.items as any[];
            if (items && Array.isArray(items)) {
                items.forEach((item: any) => {
                    ordersByMemberMap[cId].orders.push({
                        date: bill.createdAt ? new Date(bill.createdAt).toISOString() : new Date().toISOString(),
                        items: [{
                            product: item.product || "Milk",
                            quantity: item.quantity,
                            price: item.price
                        }]
                    });
                });
            }
        });

        const ordersByMember = Object.values(ordersByMemberMap);

        res.json({
            milkmanId,
            totalAmount: totalAmount.toFixed(2),
            memberCount: ordersByMember.length,
            month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
            ordersByMember
        });
    } catch (error) {
        console.error("Get consolidated bill error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/bills/consolidated/:milkmanId/generate
router.post("/consolidated/:milkmanId/generate", async (req: AuthRequest, res) => {
    try {
        const milkmanId = parseInt(req.params.milkmanId);

        // Authorization: only the milkman themselves may generate their bills.
        const [mk] = await db.select().from(milkmen).where(eq(milkmen.userId, req.user!.id)).limit(1);
        if (!mk || mk.id !== milkmanId) {
            return res.status(403).json({ message: "Not authorized." });
        }

        await BillingService.generateMonthlyBill(milkmanId);

        res.redirect(307, `/api/bills/consolidated/${milkmanId}`);

    } catch (error) {
        console.error("Generate consolidated bill error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Deleted duplicate route mapping for bills/customer to prevent nesting conflicts.

// GET /api/bills/list — all bills for the authenticated customer, newest first.
// Each bill is enriched with a display month/year and a computed totalQuantity.
router.get("/list", async (req: AuthRequest, res) => {
    try {
        const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, req.user!.id))
            .limit(1);

        if (!customer) {
            return res.status(404).json({ message: "Customer profile not found" });
        }

        // Individual bills for this customer + combined bills for any household
        // group the caller belongs to (so any member sees & can pay the group bill).
        const memberships = await db
            .select()
            .from(familyChatMembers)
            .where(eq(familyChatMembers.userId, req.user!.id));
        const groupIds = memberships.map((m) => m.chatId);

        const customerBills = await db
            .select()
            .from(bills)
            .where(
                groupIds.length > 0
                    ? or(eq(bills.customerId, customer.id), inArray(bills.familyChatId, groupIds))
                    : eq(bills.customerId, customer.id),
            )
            .orderBy(desc(bills.createdAt));

        const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        const enriched = customerBills.map((b) => {
            const [year, month] = (b.billMonth || '').split('-');
            const items = Array.isArray(b.items) ? (b.items as any[]) : [];
            const totalQuantity = items.reduce((sum, it) => sum + (parseFloat(it.quantity) || 0), 0);
            return {
                ...b,
                month: monthNames[parseInt(month)] || b.billMonth || '',
                year: year || '',
                totalQuantity,
                isGroupBill: b.familyChatId != null,
            };
        });

        res.json(enriched);
    } catch (error) {
        console.error("Get customer bill list error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/bills/current (Current month bill for the logged in customer)
router.get("/current", async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;

        const [customer] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, userId))
            .limit(1);

        if (!customer) {
            return res.status(404).json({ message: "Customer profile not found" });
        }

        // We fetch the latest pending bill or formulate one.
        const [currentBill] = await db
            .select()
            .from(bills)
            .where(
                and(
                    eq(bills.customerId, customer.id),
                    eq(bills.status, "pending")
                )
            )
            .orderBy(desc(bills.createdAt))
            .limit(1);

        if (!currentBill) {
            return res.json({ totalOrders: 0, totalQuantity: "0L", totalAmount: "0", discount: "0" });
        }

        // Calculate discount assuming 5% loyalty discount logic
        const discountAmount = (parseFloat(currentBill.totalAmount) * 0.05).toFixed(2);
        
        res.json({
            ...currentBill,
            totalQuantity: currentBill.items ? `${(currentBill.items as any[]).reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0)}L` : "0L",
            discount: discountAmount
        });

    } catch (error) {
        console.error("Get current bills error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/bills/customer/:customerId OR /api/payments/customer/:customerId
router.get("/customer/:customerId", async (req: AuthRequest, res) => {
    try {
        const customerId = parseInt(req.params.customerId);

        // Authorization: the caller must own this customer profile, or be a
        // dairyman (milkmen can view their customers' bills/payments).
        const [cust] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
        const [callerMilkman] = await db.select().from(milkmen).where(eq(milkmen.userId, req.user!.id)).limit(1);
        const ownsCustomer = cust && cust.userId === req.user!.id;
        if (!ownsCustomer && !callerMilkman) {
            return res.status(403).json({ message: "Not authorized." });
        }

        if (req.baseUrl.includes('bills')) {
            const customerBills = await db
                .select()
                .from(bills)
                .where(eq(bills.customerId, customerId))
                .orderBy(desc(bills.createdAt));
            return res.json(customerBills);
        }

        const customerPayments = await db
            .select()
            .from(payments)
            .where(eq(payments.customerId, customerId))
            .orderBy(desc(payments.createdAt));

        res.json(customerPayments);
    } catch (error) {
        console.error("Get customer payments/bills error:", error);
        res.status(500).json({ message: "Server error" });
    }
});


// --- Payment Gateway Routes ---

// Razorpay: Create Order
router.post("/razorpay/create-order", async (req, res) => {
    try {
        if (!razorpay) {
            return res.status(503).json({ message: "Razorpay is not configured. Contact support." });
        }

        const { amount, orderId, description } = req.body;
        const payerUserId = (req as any).user?.id ?? "";

        // Amount should be in paise. The internalOrderId + payerUserId are carried
        // in notes so the webhook fallback can settle the bill even if the client
        // never returns to call /verify (app closed / network drop after payment).
        const options = {
            amount: Math.round(amount * 100),
            currency: "INR",
            receipt: orderId?.toString() || `receipt_${Date.now()}`,
            notes: {
                description: description || "Dooodhwala Payment",
                internalOrderId: orderId?.toString() || "",
                payerUserId: String(payerUserId),
            }
        };

        if (!razorpay) {
            return res.status(503).json({ message: "Payment gateway not configured" });
        }
        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            razorpayOrderId: order.id,
            key: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error("Razorpay create order error:", error);
        res.status(500).json({ message: "Payment initialization failed" });
    }
});

// Razorpay: Verify Payment
router.post("/razorpay/verify", async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!process.env.RAZORPAY_KEY_SECRET) {
            console.error("RAZORPAY_KEY_SECRET is missing");
            return res.status(500).json({ message: "Server configuration error" });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        const isValid = expectedSignature === razorpay_signature;

        if (isValid) {
            // Idempotency: check if payment already recorded
            const existingPayment = await db
                .select()
                .from(payments)
                .where(eq(payments.razorpayPaymentId, razorpay_payment_id));

            if (existingPayment.length > 0) {
                return res.json({ success: true, message: "Payment already verified" });
            }

            const user = (req as any).user;
            const userId = user?.id ?? null;

            // Link to bill and get authoritative amount from DB (never trust client-sent amount)
            const internalOrderId = req.body.orderId;
            let verifiedAmount = "0.00";

            if (internalOrderId && internalOrderId.startsWith('BILL_')) {
                const billId = parseInt(internalOrderId.replace('BILL_', ''));
                const [bill] = await db.select().from(bills).where(eq(bills.id, billId)).limit(1);
                if (bill) {
                    // Authorization: only a party to the bill (the customer, a
                    // household-group member, or the milkman) may settle it.
                    const parties = await partyUserIds({ customerId: bill.customerId, milkmanId: bill.milkmanId, familyChatId: bill.familyChatId });
                    if (userId && parties.length && !parties.includes(userId)) {
                        return res.status(403).json({ success: false, message: "Not authorized for this bill." });
                    }
                    verifiedAmount = bill.totalAmount;
                    await db.update(bills)
                        .set({ status: "paid", paidAt: new Date(), paidBy: userId })
                        .where(eq(bills.id, billId));
                    // Real-time: tell the milkman + customer the bill is paid.
                    await notifyBillPaid(bill, userId);
                }
            }

            // Record payment
            await db.insert(payments).values({
                userId,
                orderId: razorpay_order_id,
                amount: verifiedAmount,
                status: "completed",
                paymentMethod: "razorpay",
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
                paymentDetails: { verified: true, timestamp: new Date() }
            });

            console.log(`[Payment] Razorpay verified: ${razorpay_payment_id}, amount: ₹${verifiedAmount}`);
            res.json({ success: true, message: "Payment verified successfully" });
        } else {
            console.warn("[Payment] Invalid signature attempt:", { razorpay_order_id, razorpay_payment_id });
            res.status(400).json({ success: false, message: "Invalid payment signature" });
        }

    } catch (error) {
        console.error("Razorpay verify error:", error);
        res.status(500).json({ message: "Verification failed" });
    }
});

// Razorpay Webhook
// Fallback settlement: mark a bill paid from a verified Razorpay event, even if
// the client never returned to call /verify. Idempotent on razorpayPaymentId.
async function settleBillFromRazorpay(internalOrderId: string | undefined, razorpayOrderId: string, razorpayPaymentId: string, payerUserId: string | null, paidAmount: string) {
    if (!internalOrderId || !internalOrderId.startsWith("BILL_")) return;
    // Idempotency: bail if this payment is already recorded (client /verify ran).
    const existing = await db.select().from(payments).where(eq(payments.razorpayPaymentId, razorpayPaymentId)).limit(1);
    if (existing.length > 0) return;

    const billId = parseInt(internalOrderId.replace("BILL_", ""));
    const [bill] = await db.select().from(bills).where(eq(bills.id, billId)).limit(1);
    if (!bill) return;

    const settledAmount = bill.totalAmount || paidAmount || "0.00";
    if (bill.status !== "paid") {
        await db.update(bills)
            .set({ status: "paid", paidAt: new Date(), paidBy: bill.paidBy ?? payerUserId })
            .where(eq(bills.id, billId));
    }
    await db.insert(payments).values({
        userId: payerUserId || bill.paidBy || null as any,
        orderId: razorpayOrderId,
        amount: settledAmount,
        status: "completed",
        paymentMethod: "razorpay",
        razorpayOrderId,
        razorpayPaymentId,
        paymentDetails: { via: "webhook", verified: true, timestamp: new Date() },
    });
    await notifyBillPaid({ ...bill, status: "paid" }, bill.paidBy ?? payerUserId);
    console.log(`[Webhook] Settled bill ${billId} from Razorpay payment ${razorpayPaymentId}`);
}

router.post("/razorpay/webhook", async (req, res) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
        if (!secret) return res.status(500).send("Webhook secret missing");

        const signature = req.headers["x-razorpay-signature"] as string;
        if (!signature) return res.status(400).send("Missing signature");

        // Verify against the RAW request body bytes (Razorpay signs the raw
        // payload — re-stringifying parsed JSON is not reliable).
        const rawBody: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
        const expectedSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
        if (expectedSignature !== signature) {
            return res.status(400).send("Invalid webhook signature");
        }

        const event = JSON.parse(rawBody.toString());

        if (event.event === "payment.captured" || event.event === "order.paid") {
            const paymentEntity = event.payload?.payment?.entity;
            const orderEntity = event.payload?.order?.entity;
            // Prefer notes/receipt from the order; fall back to fetching the order.
            let notes: any = orderEntity?.notes || paymentEntity?.notes || {};
            let internalOrderId: string | undefined = notes.internalOrderId || orderEntity?.receipt;
            const razorpayOrderId: string = orderEntity?.id || paymentEntity?.order_id;
            const razorpayPaymentId: string = paymentEntity?.id || `webhook_${razorpayOrderId}`;
            const paidAmount = paymentEntity?.amount ? (paymentEntity.amount / 100).toFixed(2) : "0.00";

            if (!internalOrderId && razorpayOrderId && razorpay) {
                try {
                    const ord: any = await razorpay.orders.fetch(razorpayOrderId);
                    notes = ord?.notes || {};
                    internalOrderId = notes.internalOrderId || ord?.receipt;
                } catch (e) { /* best effort */ }
            }

            await settleBillFromRazorpay(internalOrderId, razorpayOrderId, razorpayPaymentId, notes.payerUserId || null, paidAmount);
        }

        res.json({ status: "ok" });
    } catch (error) {
        console.error("Razorpay webhook error:", error);
        res.status(500).send("Webhook Error");
    }
});

// Stripe Stripe Webhook
router.post("/stripe/webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret || !sig) {
        // Warning: This route MUST use express.raw({type: 'application/json'}) in index.ts for the exact buffer
        return res.status(400).send(`Webhook Error: Missing secret or signature`);
    }

    try {
        // Important: this requires req.body to be the raw buffer, which requires index.ts changes
        // For standard express.json(), Stripe signature verification will fail.
        let event;
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        } catch (err: any) {
            console.warn("Stripe webhook constructEvent failed - ensuring raw body parsing is set up in index.ts", err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            console.log('Stripe PaymentIntent was successful!', paymentIntent.id);
            // Update DB
        }

        res.json({ received: true });
    } catch (err: any) {
        console.error("Stripe webhook error:", err);
        res.status(500).send(`Webhook Error: ${err.message}`);
    }
});

// Cash on Delivery: Create Order
router.post("/cod/create-order", async (req, res) => {
    try {
        const { amount, orderId, customerId, milkmanId, description, customerPhone } = req.body;
        const requesterId = (req as any).user?.id ?? null;

        // Derive the authoritative customer/milkman from the bill — never trust
        // client-sent ids (the old `milkmanId || 1` fallback misattributed COD
        // payments to milkman #1).
        let billCustomerId: number | null = customerId ?? null;
        let billMilkmanId: number | null = milkmanId ?? null;
        if (typeof orderId === "string" && orderId.startsWith("BILL_")) {
            const [bill] = await db.select().from(bills).where(eq(bills.id, parseInt(orderId.replace("BILL_", "")))).limit(1);
            if (bill) {
                billCustomerId = bill.customerId ?? billCustomerId;
                billMilkmanId = bill.milkmanId ?? billMilkmanId;
            }
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Persist a PENDING COD payment carrying the hashed-free OTP + expiry so
        // /cod/verify-otp can actually validate the code the customer received
        // (previously verify accepted ANY code — a money-integrity hole).
        await db.insert(payments).values({
            userId: requesterId,
            orderId,
            amount: String(amount ?? "0"),
            status: "pending",
            paymentMethod: "cod",
            customerId: billCustomerId,
            milkmanId: billMilkmanId,
            paymentDetails: {
                codOtp: otp,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            },
        });

        // Queue SMS
        if (customerPhone) {
            await db.insert(smsQueue).values({
                phone: customerPhone,
                message: `Your Dooodhwala COD OTP is ${otp}. Please share this with your milkman to confirm payment of Rs.${amount}.`,
                status: "pending",
                attempts: 0
            });
        }

        // Never return OTP in response — it's sent via SMS only
        res.json({
            success: true,
            otpSent: true,
            smsOtpSent: !!customerPhone,
            message: "Order placed successfully. OTP sent via SMS."
        });

    } catch (error) {
        console.error("COD create order error:", error);
        res.status(500).json({ message: "Failed to place COD order" });
    }
});

// Stripe: Create Payment Intent
router.post("/stripe/create-intent", async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ message: "Stripe is not configured. Contact support." });
        }

        const { amount, description } = req.body;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: "inr",
            description: description || "Dooodhwala Payment",
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
        });

    } catch (error) {
        console.error("Stripe create intent error:", error);
        res.status(500).json({ message: "Stripe initialization failed" });
    }
});


export default router;
