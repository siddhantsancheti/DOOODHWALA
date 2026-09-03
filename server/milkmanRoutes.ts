import { Router } from "express";
import { db } from "./db";
import { milkmen, users, products, customers, orders, bills, chatMessages, familyChats, familyChatMembers } from "@shared/schema";
import { eq, asc, and, inArray } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { type AuthRequest } from "./middleware/auth";
import { vendorCommissionPercent } from "./services/platformFees";
import multer from "multer";
import { getStorage } from "firebase-admin/storage";
import "./services/fcmService"; // initialises firebase-admin, which Storage needs
import { callerIdentities } from "./services/access";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET is required");

const router = Router();

// GET /api/milkmen
router.get("/", async (req, res) => {
    try {
        const allMilkmen = await db.select().from(milkmen);
        res.json(allMilkmen);
    } catch (error) {
        console.error("Get milkmen error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/milkmen/customers - Get customers assigned to this milkman
router.get("/customers", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as any;
        } catch (err) {
            console.error("Token verification failed:", err);
            return res.status(401).json({ message: "Invalid token" });
        }

        const userId = decoded.id;

        const [milkman] = await db
            .select()
            .from(milkmen)
            .where(eq(milkmen.userId, userId))
            .limit(1);

        if (!milkman) {
            return res.status(404).json({ message: "Milkman profile not found" });
        }

        const assignedCustomers = await db
            .select()
            .from(customers)
            .where(eq(customers.assignedMilkmanId, milkman.id))
            .orderBy(asc(customers.routeOrder));

        res.json(assignedCustomers);
    } catch (error) {
        console.error("Get assigned customers error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/milkmen/profile
router.get("/profile", async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;

        const [milkman] = await db
            .select()
            .from(milkmen)
            .where(eq(milkmen.userId, userId))
            .limit(1);

        if (!milkman) {
            return res.status(404).json({ message: "Milkman profile not found" });
        }

        res.json(milkman);
    } catch (error) {
        console.error("Get milkman profile error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

/** The signed-in user's milkman row, or null. */
async function currentMilkman(req: AuthRequest) {
    const [milkman] = await db
        .select()
        .from(milkmen)
        .where(eq(milkmen.userId, req.user!.id))
        .limit(1);
    return milkman ?? null;
}

// ── PAN card image ───────────────────────────────────────────────────────────
//
// An identity document is not chat media. Chat attachments are written to a
// public path with a signed URL that never expires, which is right for a photo
// of a milk crate and wrong for a PAN card. These go to a separate prefix, only
// the storage path is recorded, and a link is minted on demand — short-lived,
// and only for the milkman himself or an admin.
const KYC_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || "dooodhwala-7dce6.firebasestorage.app";
const kycUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        // Photographs only. A PDF or a document here is either a mistake or
        // someone probing what the endpoint will accept.
        cb(null, /^image\/(jpe?g|png|heic|heif|webp)$/i.test(file.mimetype));
    },
});

// POST /api/milkmen/pan-image
router.post("/pan-image", kycUpload.single("file"), async (req: AuthRequest, res) => {
    try {
        const milkman = await currentMilkman(req);
        if (!milkman) return res.status(404).json({ message: "Milkman profile not found" });
        if (!req.file) return res.status(400).json({ message: "Attach a photo of your PAN card" });

        const ext = (req.file.mimetype.split("/")[1] || "jpg").replace("jpeg", "jpg");
        const path = `kyc/milkmen/${milkman.id}/pan-${Date.now()}.${ext}`;

        await getStorage().bucket(KYC_BUCKET).file(path).save(req.file.buffer, {
            contentType: req.file.mimetype,
            resumable: false,
            metadata: { contentType: req.file.mimetype, cacheControl: "private, max-age=0" },
        });

        // The path, not a URL. Anything holding a permanent link to someone's
        // PAN card is a leak waiting for a copy-paste.
        await db.update(milkmen)
            .set({ panImageUrl: path, verificationStatus: "pending", updatedAt: new Date() })
            .where(eq(milkmen.id, milkman.id));

        res.json({ success: true, uploaded: true });
    } catch (error) {
        console.error("PAN upload error:", error);
        res.status(500).json({ message: "Could not upload the photo. Please try again." });
    }
});

// GET /api/milkmen/pan-image — a link that works for fifteen minutes.
router.get("/pan-image", async (req: AuthRequest, res) => {
    try {
        const me = await callerIdentities(req);
        const requested = req.query.milkmanId ? parseInt(req.query.milkmanId as string) : null;

        // A milkman may see his own. An admin may see anyone's, because someone
        // has to check them. Nobody else, ever.
        const targetId = me.isAdmin && requested ? requested : me.milkmanId;
        if (targetId == null) return res.status(403).json({ message: "Not authorized" });
        if (!me.isAdmin && requested != null && requested !== me.milkmanId) {
            return res.status(403).json({ message: "Not authorized" });
        }

        const [milkman] = await db.select().from(milkmen).where(eq(milkmen.id, targetId)).limit(1);
        if (!milkman?.panImageUrl) return res.status(404).json({ message: "No PAN photo on file" });

        const [url] = await getStorage()
            .bucket(KYC_BUCKET)
            .file(milkman.panImageUrl)
            .getSignedUrl({ action: "read", expires: Date.now() + 15 * 60 * 1000 });

        res.json({ url, expiresInMinutes: 15 });
    } catch (error) {
        console.error("PAN fetch error:", error);
        res.status(500).json({ message: "Could not open the photo" });
    }
});

// GET /api/milkmen/households — the milkman's customers as doors, not people.
//
// One row per active household chat. A family of four is one row here and one
// row on the delivery run, which is the whole point: the milkman walks to one
// door once. See docs/HOUSEHOLD_MODEL.md.
router.get("/households", async (req: AuthRequest, res) => {
    try {
        const milkman = await currentMilkman(req);
        if (!milkman) return res.status(404).json({ message: "Milkman profile not found" });

        const chats = await db
            .select()
            .from(familyChats)
            .where(and(eq(familyChats.milkmanId, milkman.id), eq(familyChats.isActive, true)))
            .orderBy(asc(familyChats.chatName));

        if (chats.length === 0) return res.json([]);

        const chatIds = chats.map((c) => c.id);
        const members = await db
            .select()
            .from(familyChatMembers)
            .where(inArray(familyChatMembers.chatId, chatIds));

        // Every member's customer row, so we can pick the household's address
        // and the customer id the chat screen opens with.
        const memberUserIds = [...new Set(members.map((m) => m.userId))];
        const memberCustomers = memberUserIds.length
            ? await db.select().from(customers).where(inArray(customers.userId, memberUserIds))
            : [];
        const customerByUser = new Map(memberCustomers.map((c) => [c.userId, c]));

        const households = chats.map((chat) => {
            const mine = members.filter((m) => m.chatId === chat.id);
            // The creator's customer row is the household's own: their address
            // is the door, and their id is what the chat opens with.
            const primary = customerByUser.get(chat.createdBy)
                ?? mine.map((m) => customerByUser.get(m.userId)).find(Boolean);

            return {
                chatId: chat.id,
                name: chat.chatName,
                chatCode: chat.chatCode,
                memberCount: mine.length,
                primaryCustomerId: primary?.id ?? null,
                address: primary?.address ?? null,
                phone: primary?.phone ?? null,
                routeOrder: primary?.routeOrder ?? 0,
            };
        });

        households.sort((a, b) => (a.routeOrder ?? 0) - (b.routeOrder ?? 0));
        res.json(households);
    } catch (error) {
        console.error("Get households error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /api/milkmen/households/:chatId — correct a household's delivery
// address or its position on the route.
//
// A household has one door. The address lives on the primary customer's row,
// which is what /households reads and what the route is built from, so writing
// it there keeps one address per household rather than one per person.
router.patch("/households/:chatId", async (req: AuthRequest, res) => {
    try {
        const milkman = await currentMilkman(req);
        if (!milkman) return res.status(404).json({ message: "Milkman profile not found" });

        const chatId = parseInt(req.params.chatId);
        if (isNaN(chatId)) return res.status(400).json({ message: "Invalid household id" });

        const [chat] = await db
            .select()
            .from(familyChats)
            .where(eq(familyChats.id, chatId))
            .limit(1);

        if (!chat || chat.milkmanId !== milkman.id) {
            return res.status(403).json({ message: "Not your household" });
        }

        const { address, routeOrder } = req.body;
        if (address === undefined && routeOrder === undefined) {
            return res.status(400).json({ message: "Nothing to update" });
        }

        const [primary] = await db
            .select()
            .from(customers)
            .where(eq(customers.userId, chat.createdBy))
            .limit(1);

        if (!primary) {
            return res.status(404).json({ message: "Household has no primary customer" });
        }

        const update: Record<string, any> = { updatedAt: new Date() };
        if (address !== undefined) update.address = String(address).trim();
        if (routeOrder !== undefined) update.routeOrder = Number(routeOrder);

        const [updated] = await db
            .update(customers)
            .set(update)
            .where(eq(customers.id, primary.id))
            .returning();

        res.json({ chatId, address: updated.address, routeOrder: updated.routeOrder });
    } catch (error) {
        console.error("Update household error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/milkmen/hisaab — the milkman's account: what was earned, what the
// platform takes, what is left, and who still owes money.
router.get("/hisaab", async (req: AuthRequest, res) => {
    try {
        const milkman = await currentMilkman(req);
        if (!milkman) return res.status(404).json({ message: "Milkman profile not found" });

        // The flat platform service charge, unless this milkman has a
        // negotiated rate of his own. Reported so the app can show him what he
        // is actually charged rather than leaving him to work it out.
        const override = milkman.commissionPercentage;
        const commissionPercent =
            override != null && override !== ""
                ? parseFloat(override) || 0
                : await vendorCommissionPercent();

        const deliveredOrders = await db
            .select({ totalAmount: orders.totalAmount })
            .from(orders)
            .where(and(eq(orders.milkmanId, milkman.id), eq(orders.status, "delivered")));

        const grossRevenue = deliveredOrders.reduce(
            (sum, o) => sum + (parseFloat(o.totalAmount || "0") || 0), 0,
        );

        // Commission actually charged, taken from the bills themselves rather
        // than recomputed at today's rate. Each bill carries the rate it was
        // raised under, so a rate change next month cannot restate what he
        // earned last month. Bills raised before commission was recorded
        // contribute nothing, which is correct — nothing was charged on them.
        const commissionRows = await db
            .select({ amount: bills.vendorCommissionAmount })
            .from(bills)
            .where(eq(bills.milkmanId, milkman.id));
        const commissionAmount = commissionRows.reduce(
            (sum, r) => sum + (parseFloat(r.amount || "0") || 0), 0,
        );

        // Outstanding bills per customer.
        const billRows = await db
            .select({
                customerId: bills.customerId,
                familyChatId: bills.familyChatId,
                customerName: customers.name,
                householdName: familyChats.chatName,
                totalAmount: bills.totalAmount,
                status: bills.status,
            })
            .from(bills)
            .leftJoin(customers, eq(bills.customerId, customers.id))
            .leftJoin(familyChats, eq(bills.familyChatId, familyChats.id))
            .where(eq(bills.milkmanId, milkman.id));

        // Group by household where there is one, by customer otherwise.
        //
        // Since the household model, a bill for a family carries familyChatId
        // with customerId NULL. Skipping those rows silently dropped every
        // household bill from Hisaab — the milkman was shown less money owed
        // than he was actually owed, which is the worst direction for this
        // number to be wrong in.
        type Row = { key: string; customerId: number | null; familyChatId: number | null; customerName: string; pending: number; paid: number };
        const byPayer = new Map<string, Row>();

        for (const row of billRows) {
            const key = row.familyChatId != null
                ? `chat:${row.familyChatId}`
                : row.customerId != null
                    ? `cust:${row.customerId}`
                    : null;
            if (key == null) continue;

            const entry = byPayer.get(key) ?? {
                key,
                customerId: row.customerId ?? null,
                familyChatId: row.familyChatId ?? null,
                customerName: row.householdName || row.customerName || "Customer",
                pending: 0,
                paid: 0,
            };
            const amount = parseFloat(row.totalAmount || "0") || 0;
            if (row.status === "paid") entry.paid += amount;
            else entry.pending += amount;
            byPayer.set(key, entry);
        }

        const customerBills = [...byPayer.values()].sort((a, b) => b.pending - a.pending);

        res.json({
            grossRevenue,
            commissionPercent,
            commissionAmount,
            netRevenue: grossRevenue - commissionAmount,
            commissionSet: milkman.commissionPercentage != null,
            totalPending: customerBills.reduce((s, c) => s + c.pending, 0),
            customerBills,
        });
    } catch (error) {
        console.error("Get hisaab error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/milkmen/delivered-summary — how much of each product has actually
// been delivered, and what it came to.
router.get("/delivered-summary", async (req: AuthRequest, res) => {
    try {
        const milkman = await currentMilkman(req);
        if (!milkman) return res.status(404).json({ message: "Milkman profile not found" });

        // The orders table only stores a total — the per-product breakdown
        // lives on the chat message the customer ordered with, which is also
        // what the delivery run marks delivered. Same source, so the two
        // screens can never disagree.
        const deliveredOrders = await db
            .select({
                quantity: chatMessages.orderQuantity,
                totalAmount: chatMessages.orderTotal,
                items: chatMessages.orderItems,
                productName: chatMessages.orderProduct,
            })
            .from(chatMessages)
            .where(and(
                eq(chatMessages.milkmanId, milkman.id),
                eq(chatMessages.isDelivered, true),
            ));

        // A message carries either a multi-product items array or a single
        // quantity/product pair — fold both into one per-product tally.
        const tally = new Map<string, { product: string; quantity: number; amount: number; orders: number }>();
        const add = (product: string, quantity: number, amount: number) => {
            const key = product || "Milk";
            const entry = tally.get(key) ?? { product: key, quantity: 0, amount: 0, orders: 0 };
            entry.quantity += quantity;
            entry.amount += amount;
            entry.orders += 1;
            tally.set(key, entry);
        };

        for (const order of deliveredOrders) {
            const items = Array.isArray(order.items) ? (order.items as any[]) : [];
            if (items.length) {
                for (const item of items) {
                    const qty = parseFloat(item.quantity ?? "0") || 0;
                    const price = parseFloat(item.price ?? item.pricePerLiter ?? "0") || 0;
                    add(item.name || item.productName || "Milk", qty, qty * price);
                }
            } else {
                add(
                    order.productName || "Milk",
                    parseFloat(order.quantity || "0") || 0,
                    parseFloat(order.totalAmount || "0") || 0,
                );
            }
        }

        const productTotals = [...tally.values()].sort((a, b) => b.amount - a.amount);

        res.json({
            products: productTotals,
            totalOrders: deliveredOrders.length,
            totalAmount: productTotals.reduce((sum, p) => sum + p.amount, 0),
        });
    } catch (error) {
        console.error("Get delivered summary error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /api/milkmen/profile
router.patch("/profile", async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;

        const {
            businessName,
            pricePerLiter,
            deliveryTimeStart,
            deliveryTimeEnd,
            address,
            phone
        } = req.body;

        const [milkman] = await db
            .select()
            .from(milkmen)
            .where(eq(milkmen.userId, userId))
            .limit(1);

        if (!milkman) {
            return res.status(404).json({ message: "Milkman profile not found" });
        }

        const [updatedMilkman] = await db
            .update(milkmen)
            .set({
                businessName,
                pricePerLiter: pricePerLiter?.toString(),
                deliveryTimeStart,
                deliveryTimeEnd,
                address,
                phone,
                updatedAt: new Date(),
            })
            .where(eq(milkmen.id, milkman.id))
            .returning();

        res.json(updatedMilkman);
    } catch (error) {
        console.error("Update milkman profile error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/milkmen
router.post("/", async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const phone = req.user!.phone;

        const {
            contactName,
            businessName,
            // phone, // Remove from body destructuring
            address,
            pricePerLiter,
            deliveryTimeStart,
            deliveryTimeEnd,
            dairyItems,
            deliverySlots
        } = req.body;

        // Check if milkman profile already exists
        const [existingMilkman] = await db
            .select()
            .from(milkmen)
            .where(eq(milkmen.userId, userId))
            .limit(1);

        if (existingMilkman) {
            // Update existing
            const [updatedMilkman] = await db
                .update(milkmen)
                .set({
                    contactName,
                    businessName,
                    phone, // Use extracted phone
                    address,
                    pricePerLiter: pricePerLiter?.toString(),
                    deliveryTimeStart,
                    deliveryTimeEnd,
                    dairyItems,
                    deliverySlots,
                    updatedAt: new Date(),
                })
                .where(eq(milkmen.id, existingMilkman.id))
                .returning();

            // Sync products table
            if (dairyItems && Array.isArray(dairyItems)) {
                // First delete existing products for this milkman to ensure clean sync
                await db.delete(products).where(eq(products.milkmanId, existingMilkman.id));

                // Insert new products
                for (const item of dairyItems) {
                    await db.insert(products).values({
                        milkmanId: existingMilkman.id,
                        name: item.name,
                        price: item.price?.toString() || "0",
                        unit: item.unit,
                        quantity: parseInt(item.quantity) || 0,
                        isAvailable: item.isAvailable !== false,
                        isCustom: item.isCustom || false
                    });
                }
            }

            return res.json(updatedMilkman);
        }

        // Create new
        const [newMilkman] = await db
            .insert(milkmen)
            .values({
                userId,
                contactName,
                businessName,
                phone, // Use extracted phone
                address,
                pricePerLiter: pricePerLiter?.toString() || "60",
                deliveryTimeStart: deliveryTimeStart || "06:00",
                deliveryTimeEnd: deliveryTimeEnd || "09:00",
                dairyItems: dairyItems || [],
                deliverySlots: deliverySlots || [
                    { id: 1, name: "Morning", startTime: "06:00", endTime: "09:00", isActive: true },
                    { id: 2, name: "Evening", startTime: "17:00", endTime: "20:00", isActive: true }
                ],
            })
            .returning();

        // Sync products table
        if (dairyItems && Array.isArray(dairyItems)) {
            // First delete existing products for this milkman to ensure clean sync
            await db.delete(products).where(eq(products.milkmanId, newMilkman.id));

            // Insert new products
            for (const item of dairyItems) {
                await db.insert(products).values({
                    milkmanId: newMilkman.id,
                    name: item.name,
                    price: item.price?.toString() || "0",
                    unit: item.unit,
                    quantity: parseInt(item.quantity) || 0,
                    isAvailable: item.isAvailable !== false,
                    isCustom: item.isCustom || false
                });
            }
        }

        // Also update user type if not set
        await db
            .update(users)
            .set({ userType: "milkman" })
            .where(eq(users.id, userId));

        res.json(newMilkman);
    } catch (error) {
        console.error("Create/Update milkman error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// PATCH /api/milkmen/products
router.patch("/products", async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;

        const { dairyItems } = req.body;

        if (!dairyItems || !Array.isArray(dairyItems)) {
            return res.status(400).json({ message: "Invalid dairy items" });
        }

        const [milkman] = await db
            .select()
            .from(milkmen)
            .where(eq(milkmen.userId, userId))
            .limit(1);

        if (!milkman) {
            return res.status(404).json({ message: "Milkman profile not found" });
        }

        // Update dairy items JSON
        await db
            .update(milkmen)
            .set({
                dairyItems,
                updatedAt: new Date(),
            })
            .where(eq(milkmen.id, milkman.id));

        // Sync products table
        // First delete existing products for this milkman
        await db.delete(products).where(eq(products.milkmanId, milkman.id));

        // Insert new products
        for (const item of dairyItems) {
            await db.insert(products).values({
                milkmanId: milkman.id,
                name: item.name,
                price: item.price?.toString() || "0",
                unit: item.unit,
                quantity: parseInt(item.quantity) || 0,
                isAvailable: item.isAvailable !== false,
                isCustom: item.isCustom || false
            });
        }

        res.json({ message: "Products updated successfully", dairyItems });
    } catch (error) {
        console.error("Update products error:", error);
        res.status(500).json({ message: "Server error" });
    }
});// PATCH /api/milkmen/availability
router.patch("/availability", async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;

        const { isAvailable } = req.body;

        if (typeof isAvailable !== 'boolean') {
            return res.status(400).json({ message: "Invalid availability status" });
        }

        const [milkman] = await db
            .select()
            .from(milkmen)
            .where(eq(milkmen.userId, userId))
            .limit(1);

        if (!milkman) {
            return res.status(404).json({ message: "Milkman profile not found" });
        }

        await db
            .update(milkmen)
            .set({
                isAvailable,
                updatedAt: new Date(),
            })
            .where(eq(milkmen.id, milkman.id));

        res.json({ message: "Availability updated successfully", isAvailable });
    } catch (error) {
        console.error("Update availability error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// GET /api/milkmen/:id
router.get("/:id", async (req, res) => {
    try {
        const milkmanId = parseInt(req.params.id);
        if (isNaN(milkmanId)) {
            return res.status(400).json({ message: "Invalid milkman ID" });
        }

        const [milkman] = await db
            .select()
            .from(milkmen)
            .where(eq(milkmen.id, milkmanId))
            .limit(1);

        if (!milkman) {
            return res.status(404).json({ message: "Milkman not found" });
        }

        res.json(milkman);
    } catch (error) {
        console.error("Get milkman error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// PATCH /api/milkmen/routes
router.patch("/routes", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

        const token = authHeader.split(" ")[1];
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) throw new Error("JWT_SECRET is required");
        let decoded: any;
        try {
            decoded = jwt.verify(token, jwtSecret);
        } catch (e) {
            return res.status(401).json({ message: "Invalid token" });
        }

        const userId = decoded.id;
        const { orderedCustomerIds } = req.body; // Array of customer IDs in desired order

        if (!Array.isArray(orderedCustomerIds)) {
            return res.status(400).json({ message: "Invalid data format" });
        }

        const [milkman] = await db
            .select()
            .from(milkmen)
            .where(eq(milkmen.userId, userId))
            .limit(1);

        if (!milkman) {
            return res.status(404).json({ message: "Milkman profile not found" });
        }

        // Update each customer's route order
        await db.transaction(async (tx) => {
            for (let i = 0; i < orderedCustomerIds.length; i++) {
                const customerId = orderedCustomerIds[i];
                await tx
                    .update(customers)
                    .set({ routeOrder: i + 1 })
                    .where(and(eq(customers.id, customerId), eq(customers.assignedMilkmanId, milkman.id)));
            }
        });

        res.json({ message: "Route updated successfully" });
    } catch (error) {
        console.error("Update route error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
