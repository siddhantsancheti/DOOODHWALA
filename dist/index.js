var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  adTracking: () => adTracking,
  ads: () => ads,
  agentPrompts: () => agentPrompts,
  agentStatus: () => agentStatus,
  bills: () => bills,
  chatMessages: () => chatMessages,
  customerPricings: () => customerPricings,
  customers: () => customers,
  familyChatMembers: () => familyChatMembers,
  familyChats: () => familyChats,
  insertAdSchema: () => insertAdSchema,
  insertAdTrackingSchema: () => insertAdTrackingSchema,
  insertAgentPromptsSchema: () => insertAgentPromptsSchema,
  insertAgentStatusSchema: () => insertAgentStatusSchema,
  insertBillSchema: () => insertBillSchema,
  insertChatMessageSchema: () => insertChatMessageSchema,
  insertCustomerPricingSchema: () => insertCustomerPricingSchema,
  insertCustomerSchema: () => insertCustomerSchema,
  insertFamilyChatMemberSchema: () => insertFamilyChatMemberSchema,
  insertFamilyChatSchema: () => insertFamilyChatSchema,
  insertLocationSchema: () => insertLocationSchema,
  insertMilkmanSchema: () => insertMilkmanSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertOrderSchema: () => insertOrderSchema,
  insertOtpCodeSchema: () => insertOtpCodeSchema,
  insertPaymentSchema: () => insertPaymentSchema,
  insertProductSchema: () => insertProductSchema,
  insertReviewSchema: () => insertReviewSchema,
  insertServiceRequestSchema: () => insertServiceRequestSchema,
  insertSettingsSchema: () => insertSettingsSchema,
  insertSmsQueueSchema: () => insertSmsQueueSchema,
  insertSubscriptionSchema: () => insertSubscriptionSchema,
  insertUserSchema: () => insertUserSchema,
  locations: () => locations,
  milkmen: () => milkmen,
  notifications: () => notifications,
  orders: () => orders,
  otpCodes: () => otpCodes,
  payments: () => payments,
  products: () => products,
  reviews: () => reviews,
  serviceRequests: () => serviceRequests,
  sessions: () => sessions,
  settings: () => settings,
  smsQueue: () => smsQueue,
  subscriptions: () => subscriptions,
  users: () => users
});
import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var sessions, users, otpCodes, milkmen, customers, orders, payments, familyChats, familyChatMembers, bills, reviews, locations, customerPricings, chatMessages, serviceRequests, notifications, ads, adTracking, smsQueue, products, insertUserSchema, insertMilkmanSchema, insertCustomerSchema, insertOrderSchema, insertBillSchema, insertReviewSchema, insertLocationSchema, insertCustomerPricingSchema, insertOtpCodeSchema, insertFamilyChatSchema, insertFamilyChatMemberSchema, insertChatMessageSchema, insertServiceRequestSchema, insertNotificationSchema, insertPaymentSchema, insertAdSchema, insertAdTrackingSchema, insertSmsQueueSchema, insertProductSchema, settings, agentStatus, agentPrompts, insertSettingsSchema, insertAgentStatusSchema, insertAgentPromptsSchema, subscriptions, insertSubscriptionSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    sessions = pgTable(
      "sessions",
      {
        sid: varchar("sid").primaryKey(),
        sess: jsonb("sess").notNull(),
        expire: timestamp("expire").notNull()
      },
      (table) => [index("IDX_session_expire").on(table.expire)]
    );
    users = pgTable("users", {
      id: varchar("id").primaryKey().notNull(),
      username: varchar("username").unique(),
      email: varchar("email").unique(),
      phone: varchar("phone").unique().notNull(),
      firstName: varchar("first_name"),
      lastName: varchar("last_name"),
      profileImageUrl: varchar("profile_image_url"),
      userType: varchar("user_type"),
      // "customer", "milkman", or "admin" - nullable to allow onboarding
      stripeCustomerId: varchar("stripe_customer_id"),
      stripeSubscriptionId: varchar("stripe_subscription_id"),
      isVerified: boolean("is_verified").default(false),
      fcmToken: varchar("fcm_token", { length: 255 }),
      // Firebase Cloud Messaging token for mobile push notifications
      // Location fields for proximity notifications
      latitude: varchar("latitude"),
      longitude: varchar("longitude"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow(),
      lastActiveAt: timestamp("last_active_at")
    });
    otpCodes = pgTable("otp_codes", {
      id: serial("id").primaryKey(),
      phone: varchar("phone").notNull(),
      code: varchar("code").notNull(),
      expiresAt: timestamp("expires_at").notNull(),
      isUsed: boolean("used").default(false),
      createdAt: timestamp("created_at").defaultNow()
    });
    milkmen = pgTable("milkmen", {
      id: serial("id").primaryKey(),
      userId: varchar("user_id").notNull().references(() => users.id),
      contactName: varchar("contact_name").notNull(),
      businessName: varchar("business_name").notNull(),
      phone: varchar("phone").notNull(),
      address: text("address").notNull(),
      latitude: decimal("latitude", { precision: 10, scale: 8 }),
      longitude: decimal("longitude", { precision: 11, scale: 8 }),
      pricePerLiter: decimal("price_per_liter", { precision: 10, scale: 2 }).notNull(),
      dairyItems: jsonb("dairy_items").default([]),
      deliveryTimeStart: varchar("delivery_time_start").notNull(),
      deliveryTimeEnd: varchar("delivery_time_end").notNull(),
      deliverySlots: jsonb("delivery_slots").default([]),
      isAvailable: boolean("is_available").default(true),
      rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
      totalReviews: integer("total_reviews").default(0),
      verified: boolean("verified").default(false),
      // Bank account details for payments
      bankAccountNumber: varchar("bank_account_number"),
      bankIfscCode: varchar("bank_ifsc_code"),
      bankAccountHolderName: varchar("bank_account_holder_name"),
      bankAccountType: varchar("bank_account_type"),
      bankName: varchar("bank_name"),
      bankBranch: varchar("bank_branch"),
      upiId: varchar("upi_id"),
      commissionPercentage: decimal("commission_percentage", { precision: 5, scale: 2 }),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    customers = pgTable("customers", {
      id: serial("id").primaryKey(),
      userId: varchar("user_id").notNull().references(() => users.id),
      name: varchar("name"),
      phone: varchar("phone"),
      address: text("address"),
      latitude: decimal("latitude", { precision: 10, scale: 8 }),
      longitude: decimal("longitude", { precision: 11, scale: 8 }),
      assignedMilkmanId: integer("assigned_milkman_id").references(() => milkmen.id),
      regularOrderQuantity: decimal("regular_order_quantity", { precision: 5, scale: 2 }),
      routeOrder: integer("route_order").default(0),
      presetOrder: jsonb("preset_order"),
      // { items: [{ productId: number, quantity: number }] }
      autoPayEnabled: boolean("auto_pay_enabled").default(false),
      settings: jsonb("settings"),
      // Unified settings for preferences
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    orders = pgTable("orders", {
      id: serial("id").primaryKey(),
      familyChatId: integer("family_chat_id").references(() => familyChats.id),
      // Link to family chat for family orders
      customerId: integer("customer_id").references(() => customers.id),
      // Individual orders
      milkmanId: integer("milkman_id").notNull().references(() => milkmen.id),
      orderedBy: varchar("ordered_by").references(() => users.id),
      // Which family member placed the order
      quantity: decimal("quantity", { precision: 5, scale: 2 }).notNull(),
      pricePerLiter: decimal("price_per_liter", { precision: 10, scale: 2 }).notNull(),
      totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
      status: varchar("status").notNull().default("pending"),
      // "pending", "confirmed", "out_for_delivery", "delivered", "cancelled"
      deliveryDate: timestamp("delivery_date").notNull(),
      deliveryTime: varchar("delivery_time"),
      specialInstructions: text("special_instructions"),
      deliveredAt: timestamp("delivered_at"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    payments = pgTable("payments", {
      id: serial("id").primaryKey(),
      orderId: varchar("order_id").notNull(),
      // Internal order reference
      userId: varchar("user_id").notNull().references(() => users.id),
      customerId: integer("customer_id").references(() => customers.id),
      milkmanId: integer("milkman_id").references(() => milkmen.id),
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      currency: varchar("currency").notNull().default("INR"),
      status: varchar("status").notNull().default("pending"),
      // "pending", "processing", "completed", "failed", "refunded"
      paymentMethod: varchar("payment_method").notNull(),
      // "razorpay", "stripe", "upi", "card", "netbanking", "cod"
      // Razorpay specific fields
      razorpayOrderId: varchar("razorpay_order_id"),
      razorpayPaymentId: varchar("razorpay_payment_id"),
      razorpaySignature: varchar("razorpay_signature"),
      // Stripe specific fields
      stripePaymentIntentId: varchar("stripe_payment_intent_id"),
      stripeChargeId: varchar("stripe_charge_id"),
      // Transaction metadata
      paymentDetails: jsonb("payment_details").default({}),
      // Store additional payment info
      webhookData: jsonb("webhook_data").default({}),
      // Store webhook payload for auditing
      failureReason: text("failure_reason"),
      refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
      refundedAt: timestamp("refunded_at"),
      // Timestamps
      initiatedAt: timestamp("initiated_at").defaultNow(),
      completedAt: timestamp("completed_at"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    familyChats = pgTable("family_chats", {
      id: serial("id").primaryKey(),
      chatName: varchar("chat_name").notNull(),
      milkmanId: integer("milkman_id").notNull().references(() => milkmen.id),
      createdBy: varchar("created_by").notNull().references(() => users.id),
      chatCode: varchar("chat_code").notNull().unique(),
      // 6-digit code for joining
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    familyChatMembers = pgTable("family_chat_members", {
      id: serial("id").primaryKey(),
      chatId: integer("chat_id").notNull().references(() => familyChats.id),
      userId: varchar("user_id").notNull().references(() => users.id),
      joinedAt: timestamp("joined_at").defaultNow(),
      isAdmin: boolean("is_admin").default(false)
    });
    bills = pgTable("bills", {
      id: serial("id").primaryKey(),
      familyChatId: integer("family_chat_id").references(() => familyChats.id),
      // Link to family chat
      customerId: integer("customer_id").references(() => customers.id),
      // Keep for individual bills
      milkmanId: integer("milkman_id").notNull().references(() => milkmen.id),
      billMonth: varchar("bill_month").notNull(),
      // YYYY-MM format for easier querying
      totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
      totalOrders: integer("total_orders").notNull().default(0),
      // Number of orders in the bill
      items: jsonb("items").default([]),
      // Detailed line items with date, product, quantity, price
      status: varchar("status").notNull().default("pending"),
      // "pending", "paid", "overdue"
      dueDate: timestamp("due_date").notNull(),
      paidAt: timestamp("paid_at"),
      paidBy: varchar("paid_by").references(() => users.id),
      // Which family member paid
      stripePaymentIntentId: varchar("stripe_payment_intent_id"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    reviews = pgTable("reviews", {
      id: serial("id").primaryKey(),
      customerId: integer("customer_id").notNull().references(() => customers.id),
      milkmanId: integer("milkman_id").notNull().references(() => milkmen.id),
      orderId: integer("order_id").references(() => orders.id),
      rating: integer("rating").notNull(),
      comment: text("comment"),
      createdAt: timestamp("created_at").defaultNow()
    });
    locations = pgTable("locations", {
      id: serial("id").primaryKey(),
      milkmanId: integer("milkman_id").references(() => milkmen.id),
      userId: varchar("user_id").references(() => users.id),
      // For general user location tracking
      latitude: varchar("latitude").notNull(),
      longitude: varchar("longitude").notNull(),
      timestamp: timestamp("timestamp").defaultNow()
    });
    customerPricings = pgTable("customer_pricings", {
      id: serial("id").primaryKey(),
      milkmanId: integer("milkman_id").notNull().references(() => milkmen.id),
      customerId: integer("customer_id").notNull().references(() => customers.id),
      pricePerLiter: decimal("price_per_liter", { precision: 10, scale: 2 }).notNull(),
      isActive: boolean("is_active").default(true),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => [
      // Ensure one pricing rule per milkman-customer pair
      index("idx_milkman_customer_pricing").on(table.milkmanId, table.customerId)
    ]);
    chatMessages = pgTable("chat_messages", {
      id: serial("id").primaryKey(),
      familyChatId: integer("family_chat_id").references(() => familyChats.id),
      // Family chat messages
      customerId: integer("customer_id").references(() => customers.id),
      // Individual chat messages
      milkmanId: integer("milkman_id").notNull().references(() => milkmen.id),
      senderId: varchar("sender_id").notNull().references(() => users.id),
      // Who sent the message
      message: text("message").notNull(),
      orderQuantity: decimal("order_quantity", { precision: 5, scale: 2 }),
      orderProduct: varchar("order_product"),
      // Product name for order messages
      orderTotal: decimal("order_total", { precision: 10, scale: 2 }),
      // Total amount for order
      orderItems: jsonb("order_items"),
      // Full order details for multi-product orders
      messageType: varchar("message_type").notNull().default("text"),
      // "text" | "order" | "notification" | "bill" | "voice" | "join"
      billId: integer("bill_id"),
      // Reference to bill for bill messages
      voiceUrl: text("voice_url"),
      // URL for voice message files
      voiceDuration: integer("voice_duration"),
      // Duration in seconds
      senderType: varchar("sender_type").notNull(),
      // "customer" | "milkman" | "system"
      isRead: boolean("is_read").default(false),
      isDelivered: boolean("is_delivered").default(false),
      isAccepted: boolean("is_accepted").default(false),
      isDeliveryConfirmed: boolean("is_delivery_confirmed").default(false),
      // Third tick for delivery confirmation
      isEditable: boolean("is_editable").default(true),
      // Orders can be edited until delivery
      editedAt: timestamp("edited_at"),
      deliveredAt: timestamp("delivered_at"),
      acceptedAt: timestamp("accepted_at"),
      createdAt: timestamp("created_at").defaultNow()
    });
    serviceRequests = pgTable("service_requests", {
      id: serial("id").primaryKey(),
      customerId: integer("customer_id").notNull().references(() => customers.id),
      milkmanId: integer("milkman_id").notNull().references(() => milkmen.id),
      services: jsonb("services").notNull(),
      // Array of requested services
      status: varchar("status").notNull().default("pending"),
      // "pending", "quoted", "accepted", "rejected"
      milkmanNotes: text("milkman_notes"),
      customerNotes: text("customer_notes"),
      quotedAt: timestamp("quoted_at"),
      respondedAt: timestamp("responded_at"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    notifications = pgTable("notifications", {
      id: serial("id").primaryKey(),
      userId: text("user_id").notNull(),
      // Can be customer or milkman user ID
      title: text("title").notNull(),
      message: text("message").notNull(),
      type: varchar("type").notNull(),
      // "order" | "message" | "system" | "service_request" | "proximity" | "bill"
      relatedId: integer("related_id"),
      // Order ID, Message ID, Service Request ID, etc.
      isRead: boolean("is_read").default(false),
      createdAt: timestamp("created_at").defaultNow()
    });
    ads = pgTable("ads", {
      id: serial("id").primaryKey(),
      title: varchar("title").notNull(),
      description: text("description").notNull(),
      imageUrl: varchar("image_url"),
      ctaText: varchar("cta_text").notNull(),
      ctaUrl: varchar("cta_url").notNull(),
      advertiserName: varchar("advertiser_name").notNull(),
      advertiserEmail: varchar("advertiser_email"),
      adType: varchar("ad_type").notNull(),
      // 'banner', 'sponsored', 'promotional', 'native'
      position: varchar("position").notNull(),
      // 'top', 'bottom', 'sidebar', 'inline', 'modal'
      targetAudience: varchar("target_audience").default("all"),
      // 'customers', 'milkmen', 'all'
      targetLocation: varchar("target_location"),
      // City/region targeting
      startDate: timestamp("start_date").notNull(),
      endDate: timestamp("end_date").notNull(),
      isActive: boolean("is_active").default(true),
      impressions: integer("impressions").default(0),
      clicks: integer("clicks").default(0),
      conversions: integer("conversions").default(0),
      budget: decimal("budget", { precision: 10, scale: 2 }),
      costPerClick: decimal("cost_per_click", { precision: 10, scale: 2 }),
      costPerImpression: decimal("cost_per_impression", { precision: 10, scale: 4 }),
      priority: integer("priority").default(1),
      // Higher number = higher priority
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    adTracking = pgTable("ad_tracking", {
      id: serial("id").primaryKey(),
      adId: integer("ad_id").notNull().references(() => ads.id),
      userId: varchar("user_id").references(() => users.id),
      event: varchar("event").notNull(),
      // 'impression', 'click', 'conversion', 'dismiss'
      timestamp: timestamp("timestamp").notNull(),
      ipAddress: varchar("ip_address"),
      userAgent: varchar("user_agent"),
      location: varchar("location"),
      // City/region
      deviceType: varchar("device_type"),
      // 'mobile', 'desktop', 'tablet'
      createdAt: timestamp("created_at").defaultNow()
    });
    smsQueue = pgTable("sms_queue", {
      id: serial("id").primaryKey(),
      phone: varchar("phone").notNull(),
      message: text("message").notNull(),
      status: varchar("status").notNull().default("pending"),
      // "pending", "processing", "sent", "failed"
      attempts: integer("attempts").default(0),
      lastAttemptAt: timestamp("last_attempt_at"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    products = pgTable("products", {
      id: serial("id").primaryKey(),
      milkmanId: integer("milkman_id").notNull().references(() => milkmen.id),
      name: varchar("name").notNull(),
      price: decimal("price", { precision: 10, scale: 2 }).notNull(),
      unit: varchar("unit").notNull(),
      quantity: integer("quantity").default(0),
      isAvailable: boolean("is_available").default(true),
      isCustom: boolean("is_custom").default(false),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    insertUserSchema = createInsertSchema(users).omit({
      createdAt: true,
      updatedAt: true
    });
    insertMilkmanSchema = createInsertSchema(milkmen).omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      rating: true,
      totalReviews: true,
      isAvailable: true,
      verified: true
    }).extend({
      phone: z.string().optional(),
      // Phone comes from user session
      latitude: z.string().optional().nullable(),
      longitude: z.string().optional().nullable(),
      dairyItems: z.array(z.object({
        name: z.string(),
        price: z.string(),
        unit: z.string(),
        isCustom: z.boolean().optional(),
        quantity: z.number().optional().default(0),
        isAvailable: z.boolean().optional().default(true)
      })).optional().default([]),
      deliverySlots: z.array(z.object({
        name: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        isActive: z.boolean().optional().default(true)
      })).optional().default([])
    });
    insertCustomerSchema = createInsertSchema(customers).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertOrderSchema = createInsertSchema(orders).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertBillSchema = createInsertSchema(bills).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertReviewSchema = createInsertSchema(reviews).omit({
      id: true,
      createdAt: true
    });
    insertLocationSchema = createInsertSchema(locations).omit({
      id: true,
      timestamp: true
    });
    insertCustomerPricingSchema = createInsertSchema(customerPricings).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertOtpCodeSchema = createInsertSchema(otpCodes).omit({
      id: true,
      createdAt: true
    });
    insertFamilyChatSchema = createInsertSchema(familyChats).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertFamilyChatMemberSchema = createInsertSchema(familyChatMembers).omit({
      id: true,
      joinedAt: true
    });
    insertChatMessageSchema = createInsertSchema(chatMessages).omit({
      id: true,
      createdAt: true
    });
    insertServiceRequestSchema = createInsertSchema(serviceRequests).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertNotificationSchema = createInsertSchema(notifications).omit({
      id: true,
      createdAt: true
    });
    insertPaymentSchema = createInsertSchema(payments).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertAdSchema = createInsertSchema(ads).omit({
      id: true,
      createdAt: true,
      updatedAt: true,
      impressions: true,
      clicks: true,
      conversions: true
    });
    insertAdTrackingSchema = createInsertSchema(adTracking).omit({
      id: true,
      createdAt: true
    });
    insertSmsQueueSchema = createInsertSchema(smsQueue).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertProductSchema = createInsertSchema(products).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    settings = pgTable("settings", {
      keyName: varchar("key_name", { length: 50 }).primaryKey(),
      value: varchar("value", { length: 255 })
    });
    agentStatus = pgTable("agent_status", {
      agentName: varchar("agent_name", { length: 50 }).primaryKey(),
      status: varchar("status", { length: 20 }),
      lastSeen: timestamp("last_seen")
    });
    agentPrompts = pgTable("agent_prompts", {
      id: serial("id").primaryKey(),
      agentName: varchar("agent_name", { length: 50 }),
      instruction: text("instruction"),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    insertSettingsSchema = createInsertSchema(settings);
    insertAgentStatusSchema = createInsertSchema(agentStatus);
    insertAgentPromptsSchema = createInsertSchema(agentPrompts).omit({
      id: true,
      updatedAt: true
    });
    subscriptions = pgTable("subscriptions", {
      id: serial("id").primaryKey(),
      customerId: integer("customer_id").notNull().references(() => customers.id),
      milkmanId: integer("milkman_id").notNull().references(() => milkmen.id),
      productName: varchar("product_name").notNull(),
      quantity: decimal("quantity", { precision: 5, scale: 2 }).notNull(),
      unit: varchar("unit").default("liter"),
      priceSnapshot: decimal("price_snapshot", { precision: 10, scale: 2 }),
      frequencyType: varchar("frequency_type").notNull(),
      // 'daily' | 'weekly' | 'monthly'
      daysOfWeek: jsonb("days_of_week"),
      // e.g. [1,3,5] for Mon/Wed/Fri (0=Sun)
      startDate: timestamp("start_date").notNull(),
      endDate: timestamp("end_date"),
      isActive: boolean("is_active").default(true),
      specialInstructions: text("special_instructions"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  pool: () => pool
});
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
var Pool, pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    ({ Pool } = pg);
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 3e4,
      connectionTimeoutMillis: 1e4
    });
    db = drizzle(pool, { schema: schema_exports });
  }
});

// server/gatewayRoutes.ts
var gatewayRoutes_exports = {};
__export(gatewayRoutes_exports, {
  default: () => gatewayRoutes_default,
  retryFailedMessages: () => retryFailedMessages
});
import { Router as Router9 } from "express";
import { eq as eq11, and as and9, lt as lt2 } from "drizzle-orm";
async function retryFailedMessages() {
  try {
    await db.update(smsQueue).set({
      status: "pending",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(
      and9(
        eq11(smsQueue.status, "failed"),
        lt2(smsQueue.attempts, 3)
      )
    );
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1e3);
    await db.update(smsQueue).set({
      status: "pending",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(
      and9(
        eq11(smsQueue.status, "processing"),
        lt2(smsQueue.updatedAt, fifteenMinutesAgo)
      )
    );
    console.log("Retry logic executed for SMS queue.");
  } catch (error) {
    console.error("Error retrying failed messages:", error);
  }
}
var router9, GATEWAY_SECRET, requireGatewayAuth, gatewayRoutes_default;
var init_gatewayRoutes = __esm({
  "server/gatewayRoutes.ts"() {
    "use strict";
    init_db();
    init_schema();
    router9 = Router9();
    GATEWAY_SECRET = process.env.GATEWAY_SECRET;
    if (!GATEWAY_SECRET) {
      console.error("GATEWAY_SECRET is not set. Android Gateway integration will fail.");
    }
    requireGatewayAuth = (req, res, next) => {
      const secret = req.headers["x-gateway-secret"];
      if (secret !== GATEWAY_SECRET) {
        return res.status(401).json({ message: "Unauthorized Gateway" });
      }
      next();
    };
    router9.get("/pending", requireGatewayAuth, async (req, res) => {
      try {
        const pendingMessages = await db.select().from(smsQueue).where(
          and9(
            eq11(smsQueue.status, "pending"),
            lt2(smsQueue.attempts, 3)
            // Max 3 attempts
          )
        ).limit(10);
        if (pendingMessages.length > 0) {
          const ids = pendingMessages.map((m) => m.id);
        }
        res.json({ success: true, messages: pendingMessages });
      } catch (error) {
        console.error("[Gateway] Error fetching pending messages:", error);
        res.status(500).json({ message: "Server error" });
      }
    });
    router9.post("/status", requireGatewayAuth, async (req, res) => {
      try {
        const { id, status, error } = req.body;
        if (!id || !status) {
          return res.status(400).json({ message: "Missing id or status" });
        }
        await db.update(smsQueue).set({
          status,
          updatedAt: /* @__PURE__ */ new Date(),
          lastAttemptAt: /* @__PURE__ */ new Date()
          // Increment attempts if we are reporting a result (whether success or fail)
          // actually attempts should be incremented when we pick it up, but simple logic for now
        }).where(eq11(smsQueue.id, id));
        res.json({ success: true });
      } catch (error) {
        console.error("[Gateway] Error updating status:", error);
        res.status(500).json({ message: "Server error" });
      }
    });
    gatewayRoutes_default = router9;
  }
});

// server/index.ts
import "dotenv/config";
import express2 from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

// server/routes.ts
import { createServer } from "http";

// server/authRoutes.ts
init_db();
init_schema();
import { Router } from "express";
import { eq as eq2 } from "drizzle-orm";
import jwt from "jsonwebtoken";

// server/services/otpService.ts
init_db();
init_schema();
import { eq, and, gt } from "drizzle-orm";
var devOtpStore = /* @__PURE__ */ new Map();
var OTPService = class {
  static generateCode() {
    if (process.env.NODE_ENV === "development") {
      return "123456";
    }
    return Math.floor(1e5 + Math.random() * 9e5).toString();
  }
  static async sendOTP(phone) {
    try {
      const code = this.generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1e3);
      if (process.env.NODE_ENV === "development") {
        devOtpStore.set(phone, { code, expiresAt, isUsed: false });
        console.log(`[OTPService] DEV OTP for ${phone}: ${code}`);
        return { success: true, message: "OTP sent successfully", debugCode: code };
      }
      await db.insert(otpCodes).values({ phone, code, expiresAt });
      const message = `Your DOOODHWALA verification code is: ${code}. Valid for 10 minutes. Do not share this code.`;
      await db.insert(smsQueue).values({ phone, message, status: "pending" });
      console.log(`[OTPService] Queued OTP SMS for ${phone}`);
      return { success: true, message: "OTP sent successfully" };
    } catch (error) {
      console.error("[OTPService] Error sending OTP:", error);
      throw new Error(`Failed to send OTP: ${error.message}`);
    }
  }
  static async verifyOTP(phone, code) {
    try {
      const codeStr = String(code).trim();
      if (process.env.NODE_ENV === "development") {
        if (codeStr === "123456") return true;
        const devOtp = devOtpStore.get(phone);
        if (devOtp && devOtp.code === codeStr && !devOtp.isUsed && devOtp.expiresAt > /* @__PURE__ */ new Date()) {
          devOtp.isUsed = true;
          return true;
        }
        return false;
      }
      const [validOtp] = await db.select().from(otpCodes).where(
        and(
          eq(otpCodes.phone, phone),
          eq(otpCodes.code, codeStr),
          eq(otpCodes.isUsed, false),
          gt(otpCodes.expiresAt, /* @__PURE__ */ new Date())
        )
      ).limit(1);
      if (validOtp) {
        await db.update(otpCodes).set({ isUsed: true }).where(eq(otpCodes.id, validOtp.id));
        console.log(`[OTPService] OTP verified for ${phone}`);
        return true;
      }
      console.log(`[OTPService] Invalid/expired OTP for ${phone}`);
      return false;
    } catch (error) {
      console.error("[OTPService] Error verifying OTP:", error);
      return false;
    }
  }
};

// server/authRoutes.ts
var router = Router();
var JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET is required");
router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }
    const result = await OTPService.sendOTP(phone);
    return res.json(result);
  } catch (error) {
    console.error("Send OTP error:", error);
    return res.status(500).json({
      message: "Server error while sending OTP",
      error: process.env.NODE_ENV === "development" ? error.message : void 0
    });
  }
});
router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ message: "Phone and OTP are required" });
    }
    const isValid = await OTPService.verifyOTP(phone, otp);
    if (!isValid) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    try {
      let [user] = await db.select().from(users).where(eq2(users.phone, phone)).limit(1);
      const formattedPhone = phone.replace(/\s+/g, "");
      const isAdmin = formattedPhone === "+918087906174" || formattedPhone === "8087906174";
      if (!user) {
        const userId = crypto.randomUUID();
        [user] = await db.insert(users).values({
          id: userId,
          phone,
          username: `user_${phone.slice(-4)}`,
          userType: isAdmin ? "admin" : null
        }).returning();
      } else if (isAdmin && user.userType !== "admin") {
        [user] = await db.update(users).set({ userType: "admin" }).where(eq2(users.id, user.id)).returning();
      }
      const token = jwt.sign({ id: user.id, phone: user.phone }, JWT_SECRET, {
        expiresIn: "30d"
      });
      return res.json({
        success: true,
        message: "Login successful",
        accessToken: token,
        user
      });
    } catch (dbError) {
      console.error("[Auth] Database error during user creation:", dbError);
      return res.status(500).json({
        message: "Error creating user account",
        error: process.env.NODE_ENV === "development" ? dbError.message : void 0
      });
    }
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({
      message: "Server error while verifying OTP",
      error: process.env.NODE_ENV === "development" ? error.message : void 0
    });
  }
});
router.put("/user-type", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }
    const { userType } = req.body;
    if (!userType || !["customer", "milkman"].includes(userType)) {
      return res.status(400).json({ message: "Invalid user type" });
    }
    const [updatedUser] = await db.update(users).set({ userType }).where(eq2(users.id, decoded.id)).returning();
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Update user type error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/user", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const [user] = await db.select().from(users).where(eq2(users.id, decoded.id)).limit(1);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      res.json({ success: true, user });
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router.post("/profile", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }
    const { fcmToken, ...profileData } = req.body;
    const userId = decoded.id;
    const updateData = { ...profileData, updatedAt: /* @__PURE__ */ new Date() };
    if (fcmToken) {
      updateData.fcmToken = fcmToken;
    }
    const [updatedUser] = await db.update(users).set(updateData).where(eq2(users.id, userId)).returning();
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router.post("/logout", (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});
var authRoutes_default = router;

// server/customerRoutes.ts
init_db();
init_schema();
import { Router as Router2 } from "express";
import { eq as eq3, and as and3 } from "drizzle-orm";
var router2 = Router2();
router2.get("/profile", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    const userId = payload.id;
    const [customer] = await db.select().from(customers).where(eq3(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    res.json(customer);
  } catch (error) {
    console.error("Get customer profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router2.patch("/profile", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    const userId = payload.id;
    const phone = payload.phone;
    const { name, email, address, latitude, longitude, settings: settings2 } = req.body;
    const [existingCustomer] = await db.select().from(customers).where(eq3(customers.userId, userId)).limit(1);
    let updatedCustomer;
    if (existingCustomer) {
      [updatedCustomer] = await db.update(customers).set({
        name,
        phone,
        // Update phone number
        address,
        settings: settings2,
        // Persist JSON settings
        latitude: latitude?.toString(),
        longitude: longitude?.toString(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq3(customers.id, existingCustomer.id)).returning();
    } else {
      [updatedCustomer] = await db.insert(customers).values({
        userId,
        name,
        phone,
        // Save phone number
        address,
        settings: settings2,
        // Persist JSON settings
        latitude: latitude?.toString(),
        longitude: longitude?.toString()
      }).returning();
    }
    if (email) {
      await db.update(users).set({ email }).where(eq3(users.id, userId));
    }
    await db.update(users).set({ userType: "customer" }).where(eq3(users.id, userId));
    res.json(updatedCustomer);
  } catch (error) {
    console.error("Update customer profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router2.patch("/profile/preset-order", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    const userId = payload.id;
    const { presetOrder } = req.body;
    const [customer] = await db.select().from(customers).where(eq3(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    const [updatedCustomer] = await db.update(customers).set({
      presetOrder,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq3(customers.id, customer.id)).returning();
    res.json(updatedCustomer);
  } catch (error) {
    console.error("Update preset order error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router2.post("/", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    const userId = payload.id;
    const { name, address, latitude, longitude } = req.body;
    const [existingCustomer] = await db.select().from(customers).where(eq3(customers.userId, userId)).limit(1);
    if (existingCustomer) {
      const [updatedCustomer] = await db.update(customers).set({
        name,
        address,
        latitude: latitude?.toString(),
        longitude: longitude?.toString(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq3(customers.id, existingCustomer.id)).returning();
      return res.json(updatedCustomer);
    }
    const [newCustomer] = await db.insert(customers).values({
      userId,
      name,
      address,
      latitude: latitude?.toString(),
      longitude: longitude?.toString()
    }).returning();
    await db.update(users).set({ userType: "customer" }).where(eq3(users.id, userId));
    res.json(newCustomer);
  } catch (error) {
    console.error("Create/Update customer error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router2.get("/:id", async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    if (isNaN(customerId)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }
    const [customer] = await db.select().from(customers).where(eq3(customers.id, customerId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json(customer);
  } catch (error) {
    console.error("Get customer error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router2.post("/assign-yd", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    const userId = payload.id;
    const { milkmanId } = req.body;
    if (!milkmanId) {
      return res.status(400).json({ message: "Milkman ID is required" });
    }
    const [customer] = await db.select().from(customers).where(eq3(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    const [updatedCustomer] = await db.update(customers).set({
      assignedMilkmanId: milkmanId,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq3(customers.id, customer.id)).returning();
    res.json(updatedCustomer);
  } catch (error) {
    console.error("Assign milkman error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router2.patch("/assign-yd", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    const userId = payload.id;
    const { milkmanId } = req.body;
    if (!milkmanId) {
      return res.status(400).json({ message: "Milkman ID is required" });
    }
    const [customer] = await db.select().from(customers).where(eq3(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    const [updatedCustomer] = await db.update(customers).set({
      assignedMilkmanId: milkmanId,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq3(customers.id, customer.id)).returning();
    res.json(updatedCustomer);
  } catch (error) {
    console.error("Assign milkman error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router2.post("/unassign-yd", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    const userId = payload.id;
    const [customer] = await db.select().from(customers).where(eq3(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    if (!customer.assignedMilkmanId) {
      return res.status(400).json({ message: "No milkman assigned" });
    }
    const pendingBills = await db.select().from(bills).where(
      and3(
        eq3(bills.customerId, customer.id),
        eq3(bills.milkmanId, customer.assignedMilkmanId),
        eq3(bills.status, "pending")
      )
    );
    if (pendingBills.length > 0) {
      return res.status(400).json({
        message: "Pending bills exist",
        pendingCount: pendingBills.length,
        totalAmount: pendingBills.reduce((sum2, bill) => sum2 + parseFloat(bill.totalAmount), 0)
      });
    }
    const [updatedCustomer] = await db.update(customers).set({
      assignedMilkmanId: null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq3(customers.id, customer.id)).returning();
    res.json(updatedCustomer);
  } catch (error) {
    console.error("Unassign milkman error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
var customerRoutes_default = router2;

// server/milkmanRoutes.ts
init_db();
init_schema();
import { Router as Router3 } from "express";
import { eq as eq4, asc, and as and4 } from "drizzle-orm";
import jwt2 from "jsonwebtoken";
var JWT_SECRET2 = process.env.JWT_SECRET;
if (!JWT_SECRET2) throw new Error("JWT_SECRET is required");
var router3 = Router3();
router3.get("/", async (req, res) => {
  try {
    const allMilkmen = await db.select().from(milkmen);
    res.json(allMilkmen);
  } catch (error) {
    console.error("Get milkmen error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router3.get("/customers", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt2.verify(token, JWT_SECRET2);
    } catch (err) {
      console.error("Token verification failed:", err);
      return res.status(401).json({ message: "Invalid token" });
    }
    const userId = decoded.id;
    const [milkman] = await db.select().from(milkmen).where(eq4(milkmen.userId, userId)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    const assignedCustomers = await db.select().from(customers).where(eq4(customers.assignedMilkmanId, milkman.id)).orderBy(asc(customers.routeOrder));
    res.json(assignedCustomers);
  } catch (error) {
    console.error("Get assigned customers error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router3.get("/profile", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(base64, "base64").toString());
    const userId = payload.id;
    const [milkman] = await db.select().from(milkmen).where(eq4(milkmen.userId, userId)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    res.json(milkman);
  } catch (error) {
    console.error("Get milkman profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router3.patch("/profile", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(base64, "base64").toString());
    const userId = payload.id;
    const {
      businessName,
      pricePerLiter,
      deliveryTimeStart,
      deliveryTimeEnd,
      address,
      phone
    } = req.body;
    const [milkman] = await db.select().from(milkmen).where(eq4(milkmen.userId, userId)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    const [updatedMilkman] = await db.update(milkmen).set({
      businessName,
      pricePerLiter: pricePerLiter?.toString(),
      deliveryTimeStart,
      deliveryTimeEnd,
      address,
      phone,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq4(milkmen.id, milkman.id)).returning();
    res.json(updatedMilkman);
  } catch (error) {
    console.error("Update milkman profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router3.post("/", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(base64, "base64").toString());
    const userId = payload.id;
    const phone = payload.phone;
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
    const [existingMilkman] = await db.select().from(milkmen).where(eq4(milkmen.userId, userId)).limit(1);
    if (existingMilkman) {
      const [updatedMilkman] = await db.update(milkmen).set({
        contactName,
        businessName,
        phone,
        // Use extracted phone
        address,
        pricePerLiter: pricePerLiter?.toString(),
        deliveryTimeStart,
        deliveryTimeEnd,
        dairyItems,
        deliverySlots,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq4(milkmen.id, existingMilkman.id)).returning();
      if (dairyItems && Array.isArray(dairyItems)) {
        await db.delete(products).where(eq4(products.milkmanId, existingMilkman.id));
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
    const [newMilkman] = await db.insert(milkmen).values({
      userId,
      contactName,
      businessName,
      phone,
      // Use extracted phone
      address,
      pricePerLiter: pricePerLiter?.toString() || "60",
      deliveryTimeStart: deliveryTimeStart || "06:00",
      deliveryTimeEnd: deliveryTimeEnd || "09:00",
      dairyItems: dairyItems || [],
      deliverySlots: deliverySlots || [
        { id: 1, name: "Morning", startTime: "06:00", endTime: "09:00", isActive: true },
        { id: 2, name: "Evening", startTime: "17:00", endTime: "20:00", isActive: true }
      ]
    }).returning();
    if (dairyItems && Array.isArray(dairyItems)) {
      await db.delete(products).where(eq4(products.milkmanId, newMilkman.id));
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
    await db.update(users).set({ userType: "milkman" }).where(eq4(users.id, userId));
    res.json(newMilkman);
  } catch (error) {
    console.error("Create/Update milkman error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router3.patch("/products", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(base64, "base64").toString());
    const userId = payload.id;
    const { dairyItems } = req.body;
    if (!dairyItems || !Array.isArray(dairyItems)) {
      return res.status(400).json({ message: "Invalid dairy items" });
    }
    const [milkman] = await db.select().from(milkmen).where(eq4(milkmen.userId, userId)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    await db.update(milkmen).set({
      dairyItems,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq4(milkmen.id, milkman.id));
    await db.delete(products).where(eq4(products.milkmanId, milkman.id));
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
});
router3.patch("/availability", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(base64, "base64").toString());
    const userId = payload.id;
    const { isAvailable } = req.body;
    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({ message: "Invalid availability status" });
    }
    const [milkman] = await db.select().from(milkmen).where(eq4(milkmen.userId, userId)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    await db.update(milkmen).set({
      isAvailable,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq4(milkmen.id, milkman.id));
    res.json({ message: "Availability updated successfully", isAvailable });
  } catch (error) {
    console.error("Update availability error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router3.get("/:id", async (req, res) => {
  try {
    const milkmanId = parseInt(req.params.id);
    if (isNaN(milkmanId)) {
      return res.status(400).json({ message: "Invalid milkman ID" });
    }
    const [milkman] = await db.select().from(milkmen).where(eq4(milkmen.id, milkmanId)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman not found" });
    }
    res.json(milkman);
  } catch (error) {
    console.error("Get milkman error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router3.patch("/routes", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) throw new Error("JWT_SECRET is required");
    let decoded;
    try {
      decoded = jwt2.verify(token, jwtSecret);
    } catch (e) {
      return res.status(401).json({ message: "Invalid token" });
    }
    const userId = decoded.id;
    const { orderedCustomerIds } = req.body;
    if (!Array.isArray(orderedCustomerIds)) {
      return res.status(400).json({ message: "Invalid data format" });
    }
    const [milkman] = await db.select().from(milkmen).where(eq4(milkmen.userId, userId)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    await db.transaction(async (tx) => {
      for (let i = 0; i < orderedCustomerIds.length; i++) {
        const customerId = orderedCustomerIds[i];
        await tx.update(customers).set({ routeOrder: i + 1 }).where(and4(eq4(customers.id, customerId), eq4(customers.assignedMilkmanId, milkman.id)));
      }
    });
    res.json({ message: "Route updated successfully" });
  } catch (error) {
    console.error("Update route error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
var milkmanRoutes_default = router3;

// server/orderRoutes.ts
init_db();
init_schema();
import { Router as Router4 } from "express";
import { eq as eq5, desc } from "drizzle-orm";
var router4 = Router4();
router4.get("/customer", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    const userId = payload.id;
    const [customer] = await db.select().from(customers).where(eq5(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    const customerOrders = await db.select().from(orders).where(eq5(orders.customerId, customer.id)).orderBy(desc(orders.createdAt));
    res.json(customerOrders);
  } catch (error) {
    console.error("Get customer orders error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router4.get("/customer/:customerId", async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);
    if (isNaN(customerId)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }
    const customerOrders = await db.select().from(orders).where(eq5(orders.customerId, customerId)).orderBy(desc(orders.createdAt));
    res.json(customerOrders);
  } catch (error) {
    console.error("Get specific customer orders error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router4.get("/milkman", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    const userId = payload.id;
    const [milkman] = await db.select().from(milkmen).where(eq5(milkmen.userId, userId)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    const milkmanOrders = await db.select().from(orders).where(eq5(orders.milkmanId, milkman.id)).orderBy(desc(orders.createdAt));
    res.json(milkmanOrders);
  } catch (error) {
    console.error("Get milkman orders error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router4.post("/", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    const userId = payload.id;
    const { milkmanId, quantity, pricePerLiter, deliveryDate, deliveryTime, specialInstructions } = req.body;
    const [customer] = await db.select().from(customers).where(eq5(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(400).json({ message: "Complete your profile before ordering" });
    }
    const totalAmount = (parseFloat(quantity) * parseFloat(pricePerLiter)).toString();
    const [newOrder] = await db.insert(orders).values({
      customerId: customer.id,
      milkmanId,
      orderedBy: userId,
      quantity: quantity.toString(),
      pricePerLiter: pricePerLiter.toString(),
      totalAmount,
      status: "pending",
      deliveryDate: new Date(deliveryDate),
      deliveryTime,
      specialInstructions
    }).returning();
    res.json(newOrder);
    try {
      const [milkman] = await db.select().from(milkmen).where(eq5(milkmen.id, milkmanId)).limit(1);
      if (milkman) {
        await db.insert(notifications).values({
          userId: milkman.userId,
          title: "New Order Received",
          message: `New order for ${quantity}L milk from a customer.`,
          type: "order",
          relatedId: newOrder.id,
          isRead: false
        });
      }
    } catch (notifError) {
      console.error("Failed to send notification:", notifError);
    }
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router4.patch("/:id/status", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;
    if (isNaN(orderId) || !status) {
      return res.status(400).json({ message: "Invalid request parameters" });
    }
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    const userId = payload.id;
    const [milkman] = await db.select().from(milkmen).where(eq5(milkmen.userId, userId)).limit(1);
    if (!milkman) {
      return res.status(403).json({ message: "Only milkmen can update order status" });
    }
    const [existingOrder] = await db.select().from(orders).where(eq5(orders.id, orderId)).limit(1);
    if (!existingOrder || existingOrder.milkmanId !== milkman.id) {
      return res.status(404).json({ message: "Order not found or unauthorized" });
    }
    const [updatedOrder] = await db.update(orders).set({
      status,
      deliveredAt: status === "delivered" ? /* @__PURE__ */ new Date() : existingOrder.deliveredAt,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq5(orders.id, orderId)).returning();
    try {
      const [customer] = await db.select().from(customers).where(eq5(customers.id, updatedOrder.customerId ?? -1)).limit(1);
      if (customer) {
        await db.insert(notifications).values({
          userId: customer.userId,
          title: "Order Status Updated",
          message: `Your order status is now: ${status}`,
          type: "order",
          relatedId: updatedOrder.id,
          isRead: false
        });
      }
    } catch (e) {
      console.error("Failed to notify customer:", e);
    }
    res.json(updatedOrder);
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
var orderRoutes_default = router4;

// server/serviceRequestRoutes.ts
init_db();
init_schema();
import { Router as Router5 } from "express";
import { eq as eq6, desc as desc2, ne, and as and5 } from "drizzle-orm";
import jwt3 from "jsonwebtoken";
var router5 = Router5();
var JWT_SECRET3 = process.env.JWT_SECRET;
if (!JWT_SECRET3) throw new Error("JWT_SECRET is required");
router5.get("/test", (req, res) => res.json({ message: "Service requests route working" }));
router5.get("/customer", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    const userId = payload.id;
    const [customer] = await db.select().from(customers).where(eq6(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    const requests = await db.select().from(serviceRequests).where(eq6(serviceRequests.customerId, customer.id)).orderBy(desc2(serviceRequests.createdAt));
    res.json(requests);
  } catch (error) {
    console.error("Get service requests error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router5.get("/milkman", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt3.verify(token, JWT_SECRET3);
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }
    const userId = decoded.id;
    const [milkman] = await db.select().from(milkmen).where(eq6(milkmen.userId, userId)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    const requests = await db.select({
      id: serviceRequests.id,
      customerId: serviceRequests.customerId,
      milkmanId: serviceRequests.milkmanId,
      services: serviceRequests.services,
      status: serviceRequests.status,
      milkmanNotes: serviceRequests.milkmanNotes,
      customerNotes: serviceRequests.customerNotes,
      createdAt: serviceRequests.createdAt,
      customer: {
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        address: customers.address,
        userId: customers.userId
      }
    }).from(serviceRequests).leftJoin(customers, eq6(serviceRequests.customerId, customers.id)).where(
      and5(
        eq6(serviceRequests.milkmanId, milkman.id),
        ne(serviceRequests.status, "rejected"),
        ne(serviceRequests.status, "accepted")
      )
    ).orderBy(desc2(serviceRequests.createdAt));
    res.json(requests);
  } catch (error) {
    console.error("Get milkman requests error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router5.post("/", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt3.verify(token, JWT_SECRET3);
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }
    const userId = decoded.id;
    const { milkmanId, services, customerNotes } = req.body;
    const [customer] = await db.select().from(customers).where(eq6(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(400).json({ message: "Complete your profile first" });
    }
    const [newRequest] = await db.insert(serviceRequests).values({
      customerId: customer.id,
      milkmanId,
      services,
      customerNotes,
      status: "pending"
    }).returning();
    res.json(newRequest);
  } catch (error) {
    console.error("Create service request error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router5.post("/:id/approve", async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const { services } = req.body;
    const [request] = await db.select().from(serviceRequests).where(eq6(serviceRequests.id, requestId)).limit(1);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    const [updatedRequest] = await db.update(serviceRequests).set({
      status: "accepted",
      services: services || request.services,
      respondedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq6(serviceRequests.id, requestId)).returning();
    await db.update(customers).set({
      assignedMilkmanId: request.milkmanId,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq6(customers.id, request.customerId));
    if (updatedRequest.services && Array.isArray(updatedRequest.services)) {
    }
    res.json(updatedRequest);
  } catch (error) {
    console.error("Approve request error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router5.post("/:id/reject", async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const [updatedRequest] = await db.update(serviceRequests).set({
      status: "rejected",
      respondedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq6(serviceRequests.id, requestId)).returning();
    res.json(updatedRequest);
  } catch (error) {
    console.error("Reject request error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router5.patch("/:id/status", async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const { status } = req.body;
    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const [updatedRequest] = await db.update(serviceRequests).set({
      status,
      respondedAt: /* @__PURE__ */ new Date()
    }).where(eq6(serviceRequests.id, requestId)).returning();
    res.json(updatedRequest);
  } catch (error) {
    console.error("Update request status error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
var serviceRequestRoutes_default = router5;

// server/paymentRoutes.ts
init_db();
init_schema();
import { Router as Router6 } from "express";
import { eq as eq8, desc as desc3, and as and7 } from "drizzle-orm";
import Razorpay from "razorpay";
import Stripe from "stripe";
import crypto2 from "crypto";

// server/services/billingService.ts
init_db();
init_schema();
import { eq as eq7, and as and6 } from "drizzle-orm";
var BillingService = class {
  static async generateMonthlyBill(milkmanId) {
    const currentMonth = (/* @__PURE__ */ new Date()).toLocaleString("default", { month: "long", year: "numeric" });
    const orderMessages = await db.select().from(chatMessages).where(
      and6(
        eq7(chatMessages.milkmanId, milkmanId),
        eq7(chatMessages.messageType, "order")
      )
    );
    const customerOrders = {};
    orderMessages.forEach((msg) => {
      if (!msg.customerId) return;
      if (!customerOrders[msg.customerId]) {
        customerOrders[msg.customerId] = {
          total: 0,
          items: []
        };
      }
      const amount = msg.orderTotal ? parseFloat(msg.orderTotal) : 0;
      customerOrders[msg.customerId].total += amount;
      customerOrders[msg.customerId].items.push({
        product: msg.orderProduct || "Order",
        quantity: msg.orderQuantity,
        price: amount / (parseFloat(msg.orderQuantity?.toString() || "1") || 1),
        // Approximate unit price
        amount
      });
    });
    for (const [customerIdStr, data] of Object.entries(customerOrders)) {
      const customerId = parseInt(customerIdStr);
      const existingBills = await db.select().from(bills).where(
        and6(
          eq7(bills.milkmanId, milkmanId),
          eq7(bills.customerId, customerId),
          eq7(bills.billMonth, currentMonth),
          eq7(bills.status, "pending")
        )
      );
      if (existingBills.length > 0) {
        await db.update(bills).set({
          totalAmount: data.total.toString(),
          items: data.items,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq7(bills.id, existingBills[0].id));
      } else {
        const [newBill] = await db.insert(bills).values({
          milkmanId,
          customerId,
          billMonth: currentMonth,
          totalAmount: data.total.toString(),
          totalOrders: data.items.length,
          items: data.items,
          status: "pending",
          dueDate: new Date((/* @__PURE__ */ new Date()).setDate((/* @__PURE__ */ new Date()).getDate() + 7))
          // Due in 7 days
        }).returning();
        const [milkmanData] = await db.select().from(milkmen).where(eq7(milkmen.id, milkmanId)).limit(1);
        await db.insert(chatMessages).values({
          milkmanId,
          customerId,
          senderId: milkmanData?.userId || "system",
          // Use milkman's user ID if available
          senderType: "milkman",
          message: `\u{1F4C4} Bill Generated for ${currentMonth}
Total Amount: \u20B9${data.total.toFixed(2)}
Due Date: ${new Date((/* @__PURE__ */ new Date()).setDate((/* @__PURE__ */ new Date()).getDate() + 7)).toLocaleDateString()}`,
          messageType: "bill",
          orderTotal: data.total.toString(),
          billId: newBill.id
        });
      }
    }
  }
  static async generateAllMonthlyBills() {
    try {
      const allMilkmen = await db.select().from(milkmen);
      console.log(`Starting monthly billing for ${allMilkmen.length} milkmen...`);
      for (const milkman of allMilkmen) {
        try {
          await this.generateMonthlyBill(milkman.id);
          console.log(`Generated bills for milkman ${milkman.id}`);
        } catch (err) {
          console.error(`Failed to generate bills for milkman ${milkman.id}`, err);
        }
      }
      console.log("Monthly billing completed.");
    } catch (error) {
      console.error("Critical error in generateAllMonthlyBills:", error);
    }
  }
};

// server/paymentRoutes.ts
var router6 = Router6();
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn("Razorpay keys are missing. Payment routes will fail.");
}
var razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "",
  key_secret: process.env.RAZORPAY_KEY_SECRET || ""
});
var stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  // apiVersion: '2024-10-28.acacia', // Use a recent valid API version
});
router6.get("/milkman", async (req, res) => {
  try {
    const milkmanId = req.query.milkmanId ? parseInt(req.query.milkmanId) : null;
    if (!milkmanId) return res.status(400).json({ message: "Milkman ID required" });
    const milkmanBills = await db.select().from(bills).where(eq8(bills.milkmanId, milkmanId)).orderBy(desc3(bills.createdAt));
    res.json(milkmanBills);
  } catch (error) {
    console.error("Get milkman bills error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router6.post("/generate", async (req, res) => {
  try {
    const { milkmanId, customerId } = req.body;
    if (!milkmanId || !customerId) return res.status(400).json({ message: "Milkman ID and Customer ID required" });
    await BillingService.generateMonthlyBill(milkmanId);
    res.json({ success: true, message: "Bills generated successfully" });
  } catch (error) {
    console.error("Generate bills error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router6.get("/cod/pending", async (req, res) => {
  try {
    res.json([]);
  } catch (error) {
    console.error("Get COD pending error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router6.post("/cod/verify-otp", async (req, res) => {
  try {
    const { otp, orderId } = req.body;
    const user = req.user;
    if (!otp || !orderId) return res.status(400).json({ message: "OTP and Order ID required" });
    if (orderId.startsWith("BILL_")) {
      const billId = parseInt(orderId.replace("BILL_", ""));
      await db.update(bills).set({
        status: "paid",
        paidAt: /* @__PURE__ */ new Date(),
        paidBy: user.id
      }).where(eq8(bills.id, billId));
      await db.insert(payments).values({
        userId: user.id,
        orderId,
        amount: "0.00",
        // Would be fetched from bill
        status: "completed",
        paymentMethod: "cod",
        paymentDetails: { verified: true, otp, timestamp: /* @__PURE__ */ new Date() }
      });
      return res.json({ success: true, message: "COD payment verified and Bill updated." });
    }
    res.status(400).json({ message: "Invalid order ID format" });
  } catch (error) {
    console.error("Verify COD OTP error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router6.get("/consolidated/:milkmanId", async (req, res) => {
  try {
    const milkmanId = parseInt(req.params.milkmanId);
    const results = await db.select().from(bills).leftJoin(customers, eq8(bills.customerId, customers.id)).where(
      and7(
        eq8(bills.milkmanId, milkmanId),
        eq8(bills.status, "pending")
      )
    );
    if (results.length === 0) {
      return res.json(null);
    }
    const totalAmount = results.reduce((sum2, row) => sum2 + parseFloat(row.bills.totalAmount), 0);
    const ordersByMemberMap = {};
    results.forEach((row) => {
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
      const items = bill.items;
      if (items && Array.isArray(items)) {
        items.forEach((item) => {
          ordersByMemberMap[cId].orders.push({
            date: bill.createdAt ? new Date(bill.createdAt).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
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
      month: (/* @__PURE__ */ new Date()).toLocaleString("default", { month: "long", year: "numeric" }),
      ordersByMember
    });
  } catch (error) {
    console.error("Get consolidated bill error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router6.post("/consolidated/:milkmanId/generate", async (req, res) => {
  try {
    const milkmanId = parseInt(req.params.milkmanId);
    await BillingService.generateMonthlyBill(milkmanId);
    res.redirect(307, `/api/bills/consolidated/${milkmanId}`);
  } catch (error) {
    console.error("Generate consolidated bill error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router6.get("/current", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    const userId = payload.id;
    const [customer] = await db.select().from(customers).where(eq8(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    const [currentBill] = await db.select().from(bills).where(
      and7(
        eq8(bills.customerId, customer.id),
        eq8(bills.status, "pending")
      )
    ).orderBy(desc3(bills.createdAt)).limit(1);
    if (!currentBill) {
      return res.json({ totalOrders: 0, totalQuantity: "0L", totalAmount: "0", discount: "0" });
    }
    const discountAmount = (parseFloat(currentBill.totalAmount) * 0.05).toFixed(2);
    res.json({
      ...currentBill,
      totalQuantity: currentBill.items ? `${currentBill.items.reduce((sum2, item) => sum2 + (parseFloat(item.quantity) || 0), 0)}L` : "0L",
      discount: discountAmount
    });
  } catch (error) {
    console.error("Get current bills error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router6.get("/customer/:customerId", async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);
    if (req.baseUrl.includes("bills")) {
      const customerBills = await db.select().from(bills).where(eq8(bills.customerId, customerId)).orderBy(desc3(bills.createdAt));
      return res.json(customerBills);
    }
    const customerPayments = await db.select().from(payments).where(eq8(payments.customerId, customerId)).orderBy(desc3(payments.createdAt));
    res.json(customerPayments);
  } catch (error) {
    console.error("Get customer payments/bills error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router6.post("/razorpay/create-order", async (req, res) => {
  try {
    const { amount, orderId, description } = req.body;
    const options = {
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: orderId?.toString() || `receipt_${Date.now()}`,
      notes: {
        description: description || "Dooodhwala Payment"
      }
    };
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
router6.post("/razorpay/verify", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error("RAZORPAY_KEY_SECRET is missing");
      return res.status(500).json({ message: "Server configuration error" });
    }
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto2.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest("hex");
    const isValid = expectedSignature === razorpay_signature;
    if (isValid) {
      const existingPayment = await db.select().from(payments).where(eq8(payments.razorpayPaymentId, razorpay_payment_id));
      if (existingPayment.length > 0) {
        return res.json({ success: true, message: "Payment already verified" });
      }
      const user = req.user;
      const userId = user?.id ?? null;
      const internalOrderId = req.body.orderId;
      let verifiedAmount = "0.00";
      if (internalOrderId && internalOrderId.startsWith("BILL_")) {
        const billId = parseInt(internalOrderId.replace("BILL_", ""));
        const [bill] = await db.select().from(bills).where(eq8(bills.id, billId)).limit(1);
        if (bill) {
          verifiedAmount = bill.totalAmount;
          await db.update(bills).set({ status: "paid", paidAt: /* @__PURE__ */ new Date(), paidBy: userId }).where(eq8(bills.id, billId));
        }
      }
      await db.insert(payments).values({
        userId,
        orderId: razorpay_order_id,
        amount: verifiedAmount,
        status: "completed",
        paymentMethod: "razorpay",
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paymentDetails: { verified: true, timestamp: /* @__PURE__ */ new Date() }
      });
      console.log(`[Payment] Razorpay verified: ${razorpay_payment_id}, amount: \u20B9${verifiedAmount}`);
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
router6.post("/razorpay/webhook", async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return res.status(500).send("Webhook secret missing");
    const signature = req.headers["x-razorpay-signature"];
    if (!signature) return res.status(400).send("Missing signature");
    const expectedSignature = crypto2.createHmac("sha256", secret).update(JSON.stringify(req.body)).digest("hex");
    if (expectedSignature !== signature) {
      return res.status(400).send("Invalid webhook signature");
    }
    const event = req.body;
    if (event.event === "payment.captured") {
      const paymentEntity = event.payload.payment.entity;
      console.log("Razorpay payment captured via webhook:", paymentEntity.id);
    }
    res.json({ status: "ok" });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    res.status(500).send("Webhook Error");
  }
});
router6.post("/stripe/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpointSecret || !sig) {
    return res.status(400).send(`Webhook Error: Missing secret or signature`);
  }
  try {
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.warn("Stripe webhook constructEvent failed - ensuring raw body parsing is set up in index.ts", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      console.log("Stripe PaymentIntent was successful!", paymentIntent.id);
    }
    res.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook error:", err);
    res.status(500).send(`Webhook Error: ${err.message}`);
  }
});
router6.post("/cod/create-order", async (req, res) => {
  try {
    const { amount, orderId, customerId, milkmanId, description, customerPhone } = req.body;
    const otp = Math.floor(1e5 + Math.random() * 9e5).toString();
    if (customerPhone) {
      await db.insert(smsQueue).values({
        phone: customerPhone,
        message: `Your Dooodhwala COD OTP is ${otp}. Please share this with your milkman to confirm payment of Rs.${amount}.`,
        status: "pending",
        attempts: 0
      });
    }
    res.json({
      success: true,
      otpSent: true,
      smsOtpSent: !!customerPhone,
      chatOtpSent: true,
      // Assuming chat integration would happen too
      codOTP: otp,
      message: "Order placed successfully"
    });
  } catch (error) {
    console.error("COD create order error:", error);
    res.status(500).json({ message: "Failed to place COD order" });
  }
});
router6.post("/stripe/create-intent", async (req, res) => {
  try {
    const { amount, description } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "inr",
      description: description || "Dooodhwala Payment",
      automatic_payment_methods: {
        enabled: true
      }
    });
    res.json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error("Stripe create intent error:", error);
    res.status(500).json({ message: "Stripe initialization failed" });
  }
});
var paymentRoutes_default = router6;

// server/chatRoutes.ts
init_db();
init_schema();
import { Router as Router7 } from "express";
import { eq as eq9, and as and8, asc as asc2, gt as gt3, gte, lt } from "drizzle-orm";

// server/websocket.ts
import { WebSocketServer, WebSocket } from "ws";

// server/vite.ts
import express from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: { server } },
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html"
      );
      const template = fs.readFileSync(clientTemplate, "utf-8");
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.log(`[express] No frontend build found at ${distPath} \u2014 running in API-only mode`);
    app2.use("*", (_req, res, next) => {
      if (_req.originalUrl.startsWith("/api")) return next();
      res.status(200).json({ status: "DOOODHWALA API running", mode: "api-only" });
    });
    return;
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// server/websocket.ts
var wss;
function setupWebSocket(server) {
  wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (ws) => {
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === "authenticate") {
          ws.userId = parseInt(message.userId);
          ws.userType = message.userType;
          log(`WebSocket authenticated: User ${ws.userId} (${ws.userType})`);
          ws.send(JSON.stringify({ type: "authenticated" }));
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws;
      if (extWs.isAlive === false) return ws.terminate();
      extWs.isAlive = false;
      ws.ping();
    });
  }, 3e4);
  wss.on("close", () => {
    clearInterval(interval);
  });
  log("WebSocket server setup complete");
}
function broadcast(message) {
  if (!wss) return;
  wss.clients.forEach((client) => {
    const ws = client;
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}
function broadcastLocationUpdate(milkmanId, latitude, longitude) {
  if (!wss) return;
  const message = JSON.stringify({
    type: "location_update",
    milkmanId,
    latitude,
    longitude,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// server/services/fcmService.ts
import * as admin from "firebase-admin";
import path2 from "path";
import fs2 from "fs";
var isFcmInitialized = false;
try {
  let serviceAccount = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      console.log("[FCM] Loading credentials from FIREBASE_SERVICE_ACCOUNT env var.");
    } catch (parseErr) {
      console.error("[FCM] Failed to parse FIREBASE_SERVICE_ACCOUNT env var as JSON:", parseErr);
    }
  }
  if (!serviceAccount) {
    const serviceAccountPath = path2.resolve(process.cwd(), "firebase-service-account.json");
    if (fs2.existsSync(serviceAccountPath)) {
      const raw = fs2.readFileSync(serviceAccountPath, "utf-8");
      serviceAccount = JSON.parse(raw);
      console.log("[FCM] Loading credentials from firebase-service-account.json file.");
    }
  }
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    isFcmInitialized = true;
    console.log("[FCM] Firebase Admin initialized successfully.");
  } else {
    console.warn("[FCM] No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT env var on Railway. Push notifications will be disabled.");
  }
} catch (error) {
  console.error("[FCM] Failed to initialize Firebase Admin:", error);
}
async function sendPushNotification(token, title, body, data) {
  if (!isFcmInitialized) {
    console.warn("[FCM] Cannot send notification. Firebase Admin is not initialized.");
    return false;
  }
  if (!token) {
    console.warn("[FCM] Cannot send notification. Token is empty.");
    return false;
  }
  try {
    const message = {
      token,
      notification: {
        title,
        body
      },
      data: data || {},
      // Options to handle Android and iOS specific settings can be added here
      android: {
        notification: {
          sound: "default"
        }
      },
      apns: {
        payload: {
          aps: {
            sound: "default"
          }
        }
      }
    };
    const response = await admin.messaging().send(message);
    console.log(`[FCM] Successfully sent message to ${token.substring(0, 10)}... Response:`, response);
    return true;
  } catch (error) {
    console.error(`[FCM] Error sending message to ${token.substring(0, 10)}... :`, error);
    return false;
  }
}

// server/chatRoutes.ts
var router7 = Router7();
router7.get("/group/:milkmanId", async (req, res) => {
  try {
    const milkmanId = parseInt(req.params.milkmanId);
    const messages = await db.select().from(chatMessages).where(eq9(chatMessages.milkmanId, milkmanId)).orderBy(asc2(chatMessages.createdAt));
    res.json(messages);
  } catch (error) {
    console.error("Get group messages error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router7.get("/messages", async (req, res) => {
  try {
    const { milkmanId, customerId } = req.query;
    if (!milkmanId || !customerId) {
      return res.status(400).json({ message: "Milkman ID and Customer ID required" });
    }
    const messages = await db.select().from(chatMessages).where(
      and8(
        eq9(chatMessages.milkmanId, parseInt(milkmanId)),
        eq9(chatMessages.customerId, parseInt(customerId))
      )
    ).orderBy(asc2(chatMessages.createdAt));
    res.json(messages);
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router7.post("/messages", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    const userId = payload.id;
    const {
      milkmanId,
      customerId,
      message,
      senderType,
      messageType = "text",
      orderQuantity,
      orderProduct,
      orderTotal,
      orderItems,
      voiceUrl,
      voiceDuration
    } = req.body;
    const [newMessage] = await db.insert(chatMessages).values({
      milkmanId,
      customerId,
      senderId: userId,
      message,
      senderType,
      messageType,
      orderQuantity: orderQuantity ? orderQuantity.toString() : null,
      orderProduct,
      orderTotal: orderTotal ? orderTotal.toString() : null,
      orderItems,
      voiceUrl,
      voiceDuration,
      isRead: false
    }).returning();
    res.json(newMessage);
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router7.post("/send", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    const userId = payload.id;
    const {
      milkmanId,
      customerId,
      message,
      senderType,
      messageType = "text",
      orderQuantity,
      orderProduct,
      orderTotal,
      orderItems,
      voiceUrl,
      voiceDuration
    } = req.body;
    const [newMessage] = await db.insert(chatMessages).values({
      milkmanId,
      customerId,
      senderId: userId,
      message,
      senderType,
      messageType,
      orderQuantity: orderQuantity ? orderQuantity.toString() : null,
      orderProduct,
      orderTotal: orderTotal ? orderTotal.toString() : null,
      orderItems,
      voiceUrl,
      voiceDuration,
      isRead: false
    }).returning();
    res.json(newMessage);
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router7.post("/messages/:id/accepted", async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    if (isNaN(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }
    const [updatedMessage] = await db.update(chatMessages).set({
      isAccepted: true,
      acceptedAt: /* @__PURE__ */ new Date()
    }).where(eq9(chatMessages.id, messageId)).returning();
    if (!updatedMessage) {
      return res.status(404).json({ message: "Message not found" });
    }
    res.json(updatedMessage);
    if (updatedMessage.orderQuantity) {
      const milkman = await db.query.milkmen.findFirst({
        where: eq9(milkmen.id, updatedMessage.milkmanId)
      });
      if (milkman) {
        await db.insert(orders).values({
          milkmanId: updatedMessage.milkmanId,
          customerId: updatedMessage.customerId,
          orderedBy: updatedMessage.senderId,
          quantity: updatedMessage.orderQuantity,
          pricePerLiter: milkman.pricePerLiter,
          totalAmount: (parseFloat(updatedMessage.orderQuantity) * parseFloat(milkman.pricePerLiter)).toString(),
          status: "pending",
          // Or "confirmed" since it's accepted? Let's say "confirmed" or "pending" delivery
          deliveryDate: /* @__PURE__ */ new Date(),
          // Today
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        });
      }
    }
    if (updatedMessage.orderProduct && updatedMessage.orderQuantity) {
      try {
        const milkman = await db.query.milkmen.findFirst({
          where: eq9(milkmen.id, updatedMessage.milkmanId)
        });
        if (milkman && milkman.dairyItems) {
          const dairyItems = milkman.dairyItems;
          const orderQty = parseFloat(updatedMessage.orderQuantity);
          const productName = updatedMessage.orderProduct.toLowerCase();
          const updatedItems = dairyItems.map((item) => {
            if (item.name.toLowerCase() === productName) {
              const currentQty = parseFloat(item.quantity || "0");
              const newQty = Math.max(0, currentQty - orderQty);
              console.log(`Updating JSONB inventory for ${item.name}: ${currentQty} -> ${newQty}`);
              return { ...item, quantity: newQty };
            }
            return item;
          });
          await db.update(milkmen).set({
            dairyItems: updatedItems,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq9(milkmen.id, updatedMessage.milkmanId));
          broadcast({
            type: "inventory_update",
            milkmanId: updatedMessage.milkmanId,
            data: {
              message: `Inventory updated: ${updatedMessage.orderProduct}`,
              dairyItems: updatedItems
            }
          });
        }
      } catch (invError) {
        console.error("Failed to update JSONB inventory:", invError);
      }
    }
    if (updatedMessage.senderType === "customer" && updatedMessage.customerId) {
      try {
        await db.insert(notifications).values({
          userId: updatedMessage.senderId,
          // The customer who sent the order
          title: "Order Accepted",
          message: `Your order for ${updatedMessage.orderProduct || "items"} has been accepted.`,
          type: "order",
          relatedId: updatedMessage.id,
          // chat message id
          isRead: false
        });
        const customerUser = await db.query.users.findFirst({
          where: eq9(users.id, updatedMessage.senderId)
        });
        if (customerUser && customerUser.fcmToken) {
          await sendPushNotification(
            customerUser.fcmToken,
            "Order Confirmed",
            `Your order for ${updatedMessage.orderProduct || "items"} has been confirmed.`,
            {
              type: "order_status",
              status: "confirmed",
              orderId: String(updatedMessage.id)
            }
          );
        }
      } catch (notifError) {
        console.error("Failed to send notification:", notifError);
      }
    }
    broadcast({
      type: "order_accepted",
      messageId: updatedMessage.id,
      customerId: updatedMessage.customerId,
      milkmanId: updatedMessage.milkmanId
    });
  } catch (error) {
    console.error("Accept order error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router7.post("/messages/:id/delivered", async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    if (isNaN(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }
    const [updatedMessage] = await db.update(chatMessages).set({
      isDelivered: true,
      deliveredAt: /* @__PURE__ */ new Date(),
      isEditable: false
      // Lock editing
    }).where(eq9(chatMessages.id, messageId)).returning();
    if (!updatedMessage) {
      return res.status(404).json({ message: "Message not found" });
    }
    if (updatedMessage.orderQuantity) {
      const [updatedOrder] = await db.update(orders).set({
        status: "delivered",
        deliveredAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(
        and8(
          eq9(orders.milkmanId, updatedMessage.milkmanId),
          updatedMessage.customerId !== null ? eq9(orders.customerId, updatedMessage.customerId) : void 0,
          // eq(orders.orderedBy, updatedMessage.senderId), // Sender might be user ID but orderedBy is also user ID. Secure match.
          // Actually, simplified check: match quantity and 'pending' status created today
          eq9(orders.quantity, updatedMessage.orderQuantity),
          eq9(orders.status, "pending")
          // We could also check date but let's assume FIFO or matching quantity on pending is enough for now.
        )
      ).returning();
      if (updatedOrder) {
        console.log(`Order ${updatedOrder.id} confirmed as delivered from chat message ${messageId}`);
      }
      if (updatedMessage.customerId) {
        const customerUser = await db.query.users.findFirst({
          where: eq9(users.id, updatedMessage.senderId)
        });
        if (customerUser && customerUser.fcmToken) {
          await sendPushNotification(
            customerUser.fcmToken,
            "Order Delivered",
            `Your order for ${updatedMessage.orderProduct || "items"} has been successfully delivered.`,
            {
              type: "order_status",
              status: "delivered",
              orderId: String(updatedMessage.id)
            }
          );
        }
      }
    }
    if (updatedMessage.customerId && updatedMessage.milkmanId) {
      const [currentCustomer] = await db.select().from(customers).where(eq9(customers.id, updatedMessage.customerId)).limit(1);
      if (currentCustomer && currentCustomer.routeOrder !== null) {
        const [nextCustomer] = await db.select().from(customers).where(and8(
          eq9(customers.assignedMilkmanId, updatedMessage.milkmanId),
          gt3(customers.routeOrder, currentCustomer.routeOrder)
        )).orderBy(asc2(customers.routeOrder)).limit(1);
        if (nextCustomer) {
          const today = /* @__PURE__ */ new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const [nextOrder] = await db.select().from(orders).where(and8(
            eq9(orders.milkmanId, updatedMessage.milkmanId),
            eq9(orders.customerId, nextCustomer.id),
            gte(orders.deliveryDate, today),
            lt(orders.deliveryDate, tomorrow)
          )).limit(1);
          if (!nextOrder) {
            const [milkmanData] = await db.select().from(milkmen).where(eq9(milkmen.id, updatedMessage.milkmanId)).limit(1);
            if (milkmanData) {
              await db.insert(chatMessages).values({
                milkmanId: updatedMessage.milkmanId,
                customerId: nextCustomer.id,
                senderId: milkmanData.userId,
                senderType: "milkman",
                message: "Hello! I am nearby (at the previous stop). Do you want to place an order today?",
                messageType: "text",
                isRead: false
              });
              await db.insert(notifications).values({
                userId: nextCustomer.userId,
                title: "Milkman Nearby",
                message: "Your milkman is at the previous stop. Place your order now if you haven't!",
                type: "proximity",
                isRead: false
              });
              const nextCustomerUser = await db.query.users.findFirst({
                where: eq9(users.id, nextCustomer.userId)
              });
              if (nextCustomerUser && nextCustomerUser.fcmToken) {
                await sendPushNotification(
                  nextCustomerUser.fcmToken,
                  "Out for Delivery",
                  "Your milkman is at the previous stop! Get ready.",
                  {
                    type: "order_status",
                    status: "out_for_delivery"
                  }
                );
              }
              console.log(`Proactive notification sent to Customer ${nextCustomer.id}`);
            }
          }
        }
      }
    }
    res.json(updatedMessage);
    broadcast({
      type: "order_delivered",
      messageId: updatedMessage.id,
      customerId: updatedMessage.customerId,
      milkmanId: updatedMessage.milkmanId
    });
  } catch (error) {
    console.error("Mark delivered error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
var chatRoutes_default = router7;

// server/locationRoutes.ts
init_db();
init_schema();
import { Router as Router8 } from "express";
import { eq as eq10, desc as desc4 } from "drizzle-orm";
var router8 = Router8();
router8.get("/milkman/:milkmanId", async (req, res) => {
  try {
    const milkmanId = parseInt(req.params.milkmanId);
    const [latestLocation] = await db.select().from(locations).where(eq10(locations.milkmanId, milkmanId)).orderBy(desc4(locations.timestamp)).limit(1);
    if (!latestLocation) {
      return res.status(404).json({ message: "Location not found" });
    }
    res.json(latestLocation);
  } catch (error) {
    console.error("Get location error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router8.post("/", async (req, res) => {
  try {
    const { milkmanId, latitude, longitude } = req.body;
    const [newLocation] = await db.insert(locations).values({
      milkmanId,
      latitude: latitude.toString(),
      longitude: longitude.toString()
    }).returning();
    res.json(newLocation);
  } catch (error) {
    console.error("Update location error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
var locationRoutes_default = router8;

// server/routes.ts
init_gatewayRoutes();

// server/productRoutes.ts
init_db();
init_schema();
import { Router as Router10 } from "express";
import { eq as eq12 } from "drizzle-orm";
var router10 = Router10();
router10.get("/", async (req, res) => {
  try {
    const { search, category, maxPrice, milkmanId } = req.query;
    let query = db.select({
      product: products,
      milkman: milkmen
    }).from(products).innerJoin(milkmen, eq12(products.milkmanId, milkmen.id)).where(eq12(products.isAvailable, true));
    if (milkmanId) {
    }
    const results = await query;
    const enrichedProducts = results.map(({ product, milkman }) => ({
      ...product,
      milkmanName: milkman.businessName,
      milkmanContact: milkman.contactName,
      milkmanPhone: milkman.phone,
      milkmanAddress: milkman.address,
      milkmanRating: milkman.rating,
      deliveryTime: `${milkman.deliveryTimeStart} - ${milkman.deliveryTimeEnd}`,
      // Ensure numeric conversions if needed, though schema types should handle it
      price: parseFloat(product.price)
    }));
    res.json(enrichedProducts);
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
var productRoutes_default = router10;

// server/deliveryRoutes.ts
init_db();
init_schema();
import { Router as Router11 } from "express";
import { eq as eq13, and as and11, asc as asc3, gt as gt4, desc as desc5, sql } from "drizzle-orm";
import jwt4 from "jsonwebtoken";
var router11 = Router11();
var JWT_SECRET4 = process.env.JWT_SECRET;
if (!JWT_SECRET4) throw new Error("JWT_SECRET is required");
var MAPBOX_TOKEN = process.env.MAPBOX_SECRET_TOKEN || process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
router11.post("/complete", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt4.verify(token, JWT_SECRET4);
    } catch (e) {
      return res.status(401).json({ message: "Invalid token" });
    }
    const milkmanUserId = decoded.id;
    const { customerId } = req.body;
    if (!customerId) {
      return res.status(400).json({ message: "Customer ID is required" });
    }
    const [milkman] = await db.select().from(milkmen).where(eq13(milkmen.userId, milkmanUserId)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    const [completedCustomer] = await db.select().from(customers).where(eq13(customers.id, customerId)).limit(1);
    if (!completedCustomer || completedCustomer.assignedMilkmanId !== milkman.id) {
      return res.status(400).json({ message: "Invalid customer for this milkman" });
    }
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const [activeOrder] = await db.select().from(orders).where(
      and11(
        eq13(orders.customerId, customerId),
        eq13(orders.milkmanId, milkman.id),
        eq13(orders.status, "confirmed")
      )
    ).limit(1);
    if (activeOrder) {
      await db.update(orders).set({
        status: "delivered",
        deliveredAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq13(orders.id, activeOrder.id));
      const customerUser = await db.query.users.findFirst({
        where: eq13(users.id, completedCustomer.userId)
      });
      if (customerUser && customerUser.fcmToken) {
        await sendPushNotification(
          customerUser.fcmToken,
          "Order Delivered",
          "Your order has been successfully delivered.",
          {
            type: "order_status",
            status: "delivered",
            orderId: String(activeOrder.id)
          }
        );
      }
    }
    const [nextCustomer] = await db.select().from(customers).where(
      and11(
        eq13(customers.assignedMilkmanId, milkman.id),
        gt4(customers.routeOrder, completedCustomer.routeOrder || 0)
      )
    ).orderBy(asc3(customers.routeOrder)).limit(1);
    let notificationSent = false;
    let nextCustomerName = null;
    if (nextCustomer) {
      nextCustomerName = nextCustomer.name;
      console.log(`[Notification] Sending 'Get Ready' to ${nextCustomer.name} (${nextCustomer.phone})`);
      const nextCustomerUser = await db.query.users.findFirst({
        where: eq13(users.id, nextCustomer.userId)
      });
      if (nextCustomerUser && nextCustomerUser.fcmToken) {
        await sendPushNotification(
          nextCustomerUser.fcmToken,
          "Out for Delivery",
          "Your milkman is arriving next! Get ready.",
          {
            type: "order_status",
            status: "out_for_delivery"
          }
        );
      }
      notificationSent = true;
    }
    res.json({
      message: "Delivery marked complete",
      orderUpdated: !!activeOrder,
      nextCustomer: nextCustomer ? {
        id: nextCustomer.id,
        name: nextCustomer.name,
        routeOrder: nextCustomer.routeOrder
      } : null,
      notificationSent
    });
  } catch (error) {
    console.error("Delivery complete error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router11.get("/geocode", async (req, res) => {
  try {
    const { address } = req.query;
    if (!address || typeof address !== "string") {
      return res.status(400).json({ message: "Address is required" });
    }
    if (!MAPBOX_TOKEN) {
      return res.status(500).json({ message: "Mapbox token not configured" });
    }
    const encoded = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?country=IN&limit=1&access_token=${MAPBOX_TOKEN}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.features || data.features.length === 0) {
      return res.status(404).json({ message: "Address not found" });
    }
    const [longitude, latitude] = data.features[0].center;
    const placeName = data.features[0].place_name;
    res.json({ latitude, longitude, placeName });
  } catch (error) {
    console.error("Geocode error:", error);
    res.status(500).json({ message: "Geocoding failed" });
  }
});
router11.get("/location/:orderId", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    jwt4.verify(token, JWT_SECRET4);
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }
    const [order] = await db.select().from(orders).where(eq13(orders.id, orderId)).limit(1);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    const [latestLocation] = await db.select().from(locations).where(eq13(locations.milkmanId, order.milkmanId)).orderBy(desc5(locations.timestamp)).limit(1);
    if (!latestLocation) {
      return res.status(404).json({ message: "Milkman location not found" });
    }
    res.json({
      milkmanId: order.milkmanId,
      latitude: parseFloat(latestLocation.latitude),
      longitude: parseFloat(latestLocation.longitude),
      timestamp: latestLocation.timestamp
    });
  } catch (error) {
    console.error("Get milkman location error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router11.get("/location/:orderId/history", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    jwt4.verify(token, JWT_SECRET4);
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }
    const [order] = await db.select().from(orders).where(eq13(orders.id, orderId)).limit(1);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    const history = await db.select().from(locations).where(eq13(locations.milkmanId, order.milkmanId)).orderBy(desc5(locations.timestamp)).limit(25);
    const coords = history.reverse().map((loc) => ({
      longitude: parseFloat(loc.longitude),
      latitude: parseFloat(loc.latitude),
      timestamp: loc.timestamp
    }));
    res.json({ milkmanId: order.milkmanId, history: coords });
  } catch (error) {
    console.error("Location history error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router11.post("/location", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt4.verify(token, JWT_SECRET4);
    } catch (e) {
      return res.status(401).json({ message: "Invalid token" });
    }
    const milkmanUserId = decoded.id;
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ message: "Latitude and Longitude are required" });
    }
    const [milkman] = await db.select().from(milkmen).where(eq13(milkmen.userId, milkmanUserId)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    const [newLocation] = await db.insert(locations).values({
      milkmanId: milkman.id,
      latitude: latitude.toString(),
      longitude: longitude.toString()
    }).returning();
    broadcastLocationUpdate(milkman.id, parseFloat(latitude), parseFloat(longitude));
    await db.execute(
      sql`DELETE FROM locations WHERE milkman_id = ${milkman.id} AND id NOT IN (
                SELECT id FROM locations WHERE milkman_id = ${milkman.id}
                ORDER BY timestamp DESC LIMIT 200
            )`
    );
    res.json({ success: true, location: newLocation });
  } catch (error) {
    console.error("Update milkman location error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
var deliveryRoutes_default = router11;

// server/subscriptionRoutes.ts
init_db();
init_schema();
import { Router as Router12 } from "express";
import { eq as eq14, and as and12, desc as desc6 } from "drizzle-orm";
var router12 = Router12();
function getUserId(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const payload = JSON.parse(atob(base64));
  return payload.id;
}
router12.post("/", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const [customer] = await db.select().from(customers).where(eq14(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    const {
      milkmanId,
      productName,
      quantity,
      unit,
      priceSnapshot,
      frequencyType,
      daysOfWeek,
      startDate,
      endDate,
      specialInstructions
    } = req.body;
    if (!milkmanId || !productName || !quantity || !frequencyType || !startDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const [newSubscription] = await db.insert(subscriptions).values({
      customerId: customer.id,
      milkmanId,
      productName,
      quantity: quantity.toString(),
      unit: unit || "liter",
      priceSnapshot: priceSnapshot?.toString(),
      frequencyType,
      daysOfWeek: daysOfWeek || null,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      isActive: true,
      specialInstructions: specialInstructions || null
    }).returning();
    res.json(newSubscription);
  } catch (error) {
    console.error("Create subscription error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router12.get("/customer", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const [customer] = await db.select().from(customers).where(eq14(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    const customerSubscriptions = await db.select().from(subscriptions).where(eq14(subscriptions.customerId, customer.id)).orderBy(desc6(subscriptions.createdAt));
    res.json(customerSubscriptions);
  } catch (error) {
    console.error("Get customer subscriptions error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router12.get("/milkman", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const [milkman] = await db.select().from(milkmen).where(eq14(milkmen.userId, userId)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    const milkmanSubscriptions = await db.select().from(subscriptions).where(eq14(subscriptions.milkmanId, milkman.id)).orderBy(desc6(subscriptions.createdAt));
    res.json(milkmanSubscriptions);
  } catch (error) {
    console.error("Get milkman subscriptions error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router12.patch("/:id/toggle", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const subscriptionId = parseInt(req.params.id);
    const [customer] = await db.select().from(customers).where(eq14(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    const [existing] = await db.select().from(subscriptions).where(and12(eq14(subscriptions.id, subscriptionId), eq14(subscriptions.customerId, customer.id))).limit(1);
    if (!existing) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    const [updated] = await db.update(subscriptions).set({
      isActive: !existing.isActive,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq14(subscriptions.id, subscriptionId)).returning();
    res.json(updated);
  } catch (error) {
    console.error("Toggle subscription error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router12.patch("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const subscriptionId = parseInt(req.params.id);
    const [customer] = await db.select().from(customers).where(eq14(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    const [existing] = await db.select().from(subscriptions).where(and12(eq14(subscriptions.id, subscriptionId), eq14(subscriptions.customerId, customer.id))).limit(1);
    if (!existing) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    const updateData = { updatedAt: /* @__PURE__ */ new Date() };
    if (req.body.quantity !== void 0) updateData.quantity = req.body.quantity.toString();
    if (req.body.frequencyType !== void 0) updateData.frequencyType = req.body.frequencyType;
    if (req.body.daysOfWeek !== void 0) updateData.daysOfWeek = req.body.daysOfWeek;
    if (req.body.endDate !== void 0) updateData.endDate = req.body.endDate ? new Date(req.body.endDate) : null;
    if (req.body.specialInstructions !== void 0) updateData.specialInstructions = req.body.specialInstructions;
    if (req.body.isActive !== void 0) updateData.isActive = req.body.isActive;
    const [updated] = await db.update(subscriptions).set(updateData).where(eq14(subscriptions.id, subscriptionId)).returning();
    res.json(updated);
  } catch (error) {
    console.error("Update subscription error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router12.delete("/:id", async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const subscriptionId = parseInt(req.params.id);
    const [customer] = await db.select().from(customers).where(eq14(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    const [existing] = await db.select().from(subscriptions).where(and12(eq14(subscriptions.id, subscriptionId), eq14(subscriptions.customerId, customer.id))).limit(1);
    if (!existing) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    await db.delete(subscriptions).where(eq14(subscriptions.id, subscriptionId));
    res.json({ message: "Subscription deleted" });
  } catch (error) {
    console.error("Delete subscription error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
var subscriptionRoutes_default = router12;

// server/middleware/auth.ts
init_db();
init_schema();
import jwt5 from "jsonwebtoken";
import { eq as eq15 } from "drizzle-orm";
var JWT_SECRET5 = process.env.JWT_SECRET;
if (!JWT_SECRET5) {
  throw new Error("JWT_SECRET is not defined in environment variables");
}
var authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }
  try {
    const decoded = jwt5.verify(token, JWT_SECRET5);
    const [user] = await db.select().from(users).where(eq15(users.id, decoded.id)).limit(1);
    if (!user) {
      return res.status(403).json({ message: "User not found or access denied" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};
var authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: User not authenticated" });
    }
    const userType = req.user.userType;
    if (!userType || !allowedRoles.includes(userType)) {
      return res.status(403).json({
        message: `Forbidden: Requires one of these roles: ${allowedRoles.join(", ")}`
      });
    }
    next();
  };
};

// server/userRoutes.ts
import { Router as Router13 } from "express";

// server/multer.ts
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "demo",
  // Fallback for safety, but env required for prod
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
var storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    return {
      folder: "doodhwala-uploads",
      format: "jpeg",
      // Force format or remove to keep original
      public_id: `file-${uniqueSuffix}`,
      allowed_formats: ["jpg", "png", "jpeg", "webp"]
      // Restrict formats
    };
  }
});
var upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
    // 5MB limit
  }
});
var multer_default = upload;

// server/userRoutes.ts
init_db();
init_schema();
import { eq as eq16 } from "drizzle-orm";
var router13 = Router13();
router13.post("/profile-image", authenticateToken, multer_default.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }
    const userId = req.user.id;
    const imageUrl = req.file.path;
    await db.update(users).set({ profileImageUrl: imageUrl }).where(eq16(users.id, userId));
    res.json({ success: true, imageUrl });
  } catch (error) {
    console.error("Profile image upload error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router13.patch("/profile", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, email, name } = req.body;
    const updateData = {};
    if (email !== void 0) updateData.email = email;
    if (name && (!firstName || !lastName)) {
      const parts = name.trim().split(/\s+/);
      updateData.firstName = parts[0] || "";
      updateData.lastName = parts.slice(1).join(" ") || "";
    } else {
      if (firstName !== void 0) updateData.firstName = firstName;
      if (lastName !== void 0) updateData.lastName = lastName;
    }
    updateData.updatedAt = /* @__PURE__ */ new Date();
    await db.update(users).set(updateData).where(eq16(users.id, userId));
    res.json({ success: true, message: "Basic profile updated successfully" });
  } catch (error) {
    console.error("Basic profile update error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router13.patch("/fcm-token", authenticateToken, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user.id;
    if (!fcmToken) {
      return res.status(400).json({ message: "fcmToken is required" });
    }
    await db.update(users).set({ fcmToken }).where(eq16(users.id, userId));
    res.json({ success: true, message: "FCM token updated successfully" });
  } catch (error) {
    console.error("FCM token update error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
var userRoutes_default = router13;

// server/adminRoutes.ts
init_db();
init_schema();
import { Router as Router14 } from "express";
import { count, eq as eq17, sql as sql2, desc as desc7, sum } from "drizzle-orm";
var router14 = Router14();
router14.get("/stats", async (req, res) => {
  try {
    const [{ count: totalUsers }] = await db.select({ count: count() }).from(users);
    const [{ count: totalMilkmen }] = await db.select({ count: count() }).from(milkmen);
    const [{ count: totalOrders }] = await db.select({ count: count() }).from(orders);
    const [{ totalRevenue }] = await db.select({ totalRevenue: sum(payments.amount) }).from(payments).where(eq17(payments.status, "completed"));
    const todayStart = /* @__PURE__ */ new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [{ count: dailyOrders }] = await db.select({ count: count() }).from(orders).where(sql2`${orders.createdAt} >= ${todayStart.toISOString()}`);
    const lastWeekStart = /* @__PURE__ */ new Date();
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const [{ weeklyRevenue }] = await db.select({ weeklyRevenue: sum(payments.amount) }).from(payments).where(
      sql2`${payments.status} = 'completed' AND ${payments.createdAt} >= ${lastWeekStart.toISOString()}`
    );
    const [{ count: activeUsers }] = await db.select({ count: count() }).from(users).where(sql2`${users.lastActiveAt} >= ${lastWeekStart.toISOString()}`);
    res.json({
      totalUsers,
      totalMilkmen,
      totalOrders,
      totalRevenue: totalRevenue || 0,
      dailyOrders,
      weeklyRevenue: weeklyRevenue || 0,
      pendingOrders: 0,
      // Simplified for this view
      activeUsers
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ success: false, message: "Error fetching admin stats", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
router14.get("/users", async (req, res) => {
  try {
    const allUsers = await db.select().from(users).orderBy(desc7(users.createdAt));
    res.json(allUsers);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
router14.get("/milkmen", async (req, res) => {
  try {
    const allMilkmen = await db.select().from(milkmen).orderBy(desc7(milkmen.createdAt));
    res.json(allMilkmen);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
router14.get("/orders", async (req, res) => {
  try {
    const allOrders = await db.select().from(orders).orderBy(desc7(orders.createdAt)).limit(100);
    res.json(allOrders);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
router14.get("/payments", async (req, res) => {
  try {
    const allPayments = await db.select().from(payments).orderBy(desc7(payments.createdAt)).limit(100);
    res.json(allPayments);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
router14.patch("/milkmen/:id/verify", async (req, res) => {
  try {
    const milkmanId = parseInt(req.params.id);
    const { verified } = req.body;
    const [updatedMilkman] = await db.update(milkmen).set({ verified, updatedAt: /* @__PURE__ */ new Date() }).where(eq17(milkmen.id, milkmanId)).returning();
    if (!updatedMilkman) return res.status(404).json({ success: false, message: "Milkman not found" });
    res.json({ success: true, milkman: updatedMilkman });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
router14.patch("/orders/:id/status", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;
    const [updatedOrder] = await db.update(orders).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(eq17(orders.id, orderId)).returning();
    if (!updatedOrder) return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
router14.post("/generate-monthly-bills", async (req, res) => {
  try {
    await BillingService.generateAllMonthlyBills();
    const generatedBills = await db.select().from(bills).orderBy(desc7(bills.createdAt)).limit(50);
    res.json({ success: true, bills: generatedBills });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
router14.get("/earnings", async (req, res) => {
  try {
    const earningsData = await db.select({
      milkmanId: milkmen.id,
      businessName: milkmen.businessName,
      contactName: milkmen.contactName,
      commissionPercentage: milkmen.commissionPercentage,
      totalRevenue: sql2`COALESCE(SUM(CASE WHEN ${payments.status} = 'completed' THEN ${payments.amount} ELSE 0 END), 0)`
    }).from(milkmen).leftJoin(payments, eq17(milkmen.id, payments.milkmanId)).where(sql2`${milkmen.commissionPercentage} IS NOT NULL`).groupBy(milkmen.id, milkmen.businessName, milkmen.contactName, milkmen.commissionPercentage);
    const formattedEarnings = earningsData.map((item) => {
      const revenue = parseFloat(item.totalRevenue || "0");
      const sharePercentage = parseFloat(item.commissionPercentage || "0");
      const adminEarnings = revenue * sharePercentage / 100;
      return {
        ...item,
        totalRevenue: revenue,
        sharePercentage,
        adminEarnings
      };
    });
    res.json(formattedEarnings);
  } catch (error) {
    console.error("Admin earnings error:", error);
    res.status(500).json({ success: false, message: "Error fetching admin earnings", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
router14.get("/milkmen/pending-commission", async (req, res) => {
  try {
    const pendingMilkmen = await db.select().from(milkmen).where(sql2`${milkmen.commissionPercentage} IS NULL`).orderBy(desc7(milkmen.createdAt));
    res.json(pendingMilkmen);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
router14.patch("/milkmen/:id/commission", async (req, res) => {
  try {
    const milkmanId = parseInt(req.params.id);
    const { percentage } = req.body;
    if (percentage === void 0 || isNaN(parseFloat(percentage))) {
      return res.status(400).json({ success: false, message: "Valid percentage is required" });
    }
    const [updatedMilkman] = await db.update(milkmen).set({
      commissionPercentage: percentage.toString(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq17(milkmen.id, milkmanId)).returning();
    if (!updatedMilkman) return res.status(404).json({ success: false, message: "Milkman not found" });
    res.json({ success: true, milkman: updatedMilkman });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
var adminRoutes_default = router14;

// server/routes.ts
function registerRoutes(app2) {
  app2.use("/api/auth", authRoutes_default);
  app2.use("/api/users", userRoutes_default);
  app2.use("/api/gateway", gatewayRoutes_default);
  app2.use("/api/customers", authenticateToken, customerRoutes_default);
  app2.use("/api/milkmen", authenticateToken, milkmanRoutes_default);
  app2.use("/api/orders", authenticateToken, orderRoutes_default);
  app2.use("/api/service-requests", authenticateToken, serviceRequestRoutes_default);
  app2.use("/api/bills", authenticateToken, paymentRoutes_default);
  app2.use("/api/payments", authenticateToken, paymentRoutes_default);
  app2.use("/api/delivery", authenticateToken, deliveryRoutes_default);
  app2.use("/api/chat", authenticateToken, chatRoutes_default);
  app2.use("/api/subscriptions", authenticateToken, subscriptionRoutes_default);
  app2.use("/api/locations", authenticateToken, locationRoutes_default);
  app2.use("/api/admin", authenticateToken, authorizeRole(["admin"]), adminRoutes_default);
  app2.use("/api/products", productRoutes_default);
  const httpServer = createServer(app2);
  setupWebSocket(httpServer);
  return httpServer;
}

// server/index.ts
import cron from "node-cron";
import path3 from "path";
var app = express2();
app.set("trust proxy", 1);
app.use(helmet({
  contentSecurityPolicy: false
  // typically disabled for Vite dev server / dynamic apps unless configured carefully
}));
var allowedOrigins = [
  "https://dooodhwala-production-0667.up.railway.app",
  "https://dooodhwala.com",
  "http://localhost:5001",
  "http://localhost:5173",
  "http://localhost:19006",
  "http://127.0.0.1:19006"
];
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = "The CORS policy for this site does not allow access from the specified Origin.";
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));
var limiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: process.env.NODE_ENV === "development" || !process.env.NODE_ENV ? 1e5 : 200,
  // Limit each IP to 200 requests per `window` (here, per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false
});
app.use("/api", limiter);
app.use("/api/payments/stripe/webhook", express2.raw({ type: "application/json" }));
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use("/uploads", express2.static(path3.join(process.cwd(), "uploads")));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const requiredEnvVars = [
    "JWT_SECRET",
    "DATABASE_URL"
  ];
  const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);
  if (missingEnvVars.length > 0) {
    console.error("Critical Error: Missing required environment variables:", missingEnvVars.join(", "));
    console.error("Please set these variables in your .env file or environment.");
    process.exit(1);
  }
  const server = registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const errorResponse = {
      success: false,
      message
    };
    if (process.env.NODE_ENV !== "production") {
      errorResponse.error = err.stack;
    }
    res.status(status).json(errorResponse);
    console.error(`[Error Handler] ${status} - ${message}`, err);
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  cron.schedule("0 0 1 * *", async () => {
    console.log("Running monthly billing cron job...");
    try {
      await BillingService.generateAllMonthlyBills();
    } catch (error) {
      console.error("Error in monthly billing cron job:", error);
    }
  });
  cron.schedule("*/15 * * * *", async () => {
    console.log("Running SMS retry job...");
    try {
      const { retryFailedMessages: retryFailedMessages2 } = await Promise.resolve().then(() => (init_gatewayRoutes(), gatewayRoutes_exports));
      await retryFailedMessages2();
    } catch (error) {
      console.error("Error in SMS retry job:", error);
    }
  });
  cron.schedule("0 * * * *", async () => {
    const hour = (/* @__PURE__ */ new Date()).getHours();
    const timeString = `${hour.toString().padStart(2, "0")}:00`;
    console.log(`Running Daily Order job for ${timeString}...`);
    try {
      const { customers: customers3, orders: orders2, chatMessages: chatMessages3, milkmen: milkmen2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { eq: eq18, and: and13, sql: sql3 } = await import("drizzle-orm");
      const allCustomers = await db2.select().from(customers3);
      const dueCustomers = allCustomers.filter((c) => {
        const preset = c.presetOrder;
        return preset && preset.autoSend === true && preset.scheduleTime === timeString;
      });
      console.log(`Found ${dueCustomers.length} due daily orders.`);
      for (const customer of dueCustomers) {
        const preset = customer.presetOrder;
        if (!preset?.items?.length) continue;
        const item = preset.items[0];
        const todayStart = /* @__PURE__ */ new Date();
        todayStart.setHours(0, 0, 0, 0);
        const existingOrder = await db2.select().from(orders2).where(
          and13(
            eq18(orders2.customerId, customer.id),
            sql3`${orders2.createdAt} >= ${todayStart.toISOString()}`
          )
        ).limit(1);
        if (existingOrder.length > 0) {
          console.log(`Skipping ${customer.name}: Order already exists for today.`);
          continue;
        }
        const [milkman] = await db2.select().from(milkmen2).where(eq18(milkmen2.id, customer.assignedMilkmanId)).limit(1);
        if (!milkman) continue;
        const dairyItems = milkman.dairyItems || [];
        const product = dairyItems.find((p) => p.name === item.product);
        const pricePerLiter = product ? parseFloat(product.price) : parseFloat(milkman.pricePerLiter);
        const totalAmount = (parseFloat(item.quantity) * pricePerLiter).toFixed(2);
        const [newOrder] = await db2.insert(orders2).values({
          customerId: customer.id,
          milkmanId: milkman.id,
          quantity: item.quantity,
          pricePerLiter: pricePerLiter.toString(),
          totalAmount,
          status: "pending",
          deliveryDate: /* @__PURE__ */ new Date(),
          orderedBy: customer.userId
          // Assuming customer ordered it
        }).returning();
        const orderMessage = `Daily Order: ${item.quantity} ${item.unit} of ${item.product}`;
        await db2.insert(chatMessages3).values({
          customerId: customer.id,
          milkmanId: milkman.id,
          senderId: customer.userId,
          senderType: "customer",
          message: orderMessage,
          messageType: "order",
          orderQuantity: item.quantity,
          orderProduct: item.product,
          orderTotal: totalAmount
        });
        console.log(`Placed daily order for ${customer.name}`);
      }
    } catch (error) {
      console.error("Error in Daily Order job:", error);
    }
  });
  cron.schedule("30 23 * * *", async () => {
    console.log("Running Subscription Order Processing...");
    try {
      const { subscriptions: subscriptions2, customers: customers3, orders: orders2, chatMessages: chatMessages3, milkmen: milkmen2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { eq: eq18, and: and13, sql: sql3 } = await import("drizzle-orm");
      const now = /* @__PURE__ */ new Date();
      const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1e3);
      const today = istNow.getDay();
      const todayDate = istNow.getDate();
      const activeSubscriptions = await db2.select().from(subscriptions2).where(
        eq18(subscriptions2.isActive, true)
      );
      console.log(`Found ${activeSubscriptions.length} active subscriptions.`);
      for (const sub of activeSubscriptions) {
        if (new Date(sub.startDate) > istNow) continue;
        if (sub.endDate && new Date(sub.endDate) < istNow) continue;
        let isDue = false;
        if (sub.frequencyType === "daily") {
          isDue = true;
        } else if (sub.frequencyType === "weekly") {
          const days = sub.daysOfWeek || [];
          isDue = days.includes(today);
        } else if (sub.frequencyType === "monthly") {
          const days = sub.daysOfWeek || [1];
          isDue = days.includes(todayDate);
        }
        if (!isDue) continue;
        const todayStart = new Date(istNow);
        todayStart.setHours(0, 0, 0, 0);
        const existingOrder = await db2.select().from(chatMessages3).where(
          and13(
            eq18(chatMessages3.customerId, sub.customerId),
            eq18(chatMessages3.milkmanId, sub.milkmanId),
            sql3`${chatMessages3.message} LIKE ${"\u{1F504} Subscription:%"}`,
            sql3`${chatMessages3.createdAt} >= ${todayStart.toISOString()}`
          )
        ).limit(1);
        if (existingOrder.length > 0) {
          console.log(`Skipping subscription #${sub.id}: already processed today.`);
          continue;
        }
        const [customer] = await db2.select().from(customers3).where(eq18(customers3.id, sub.customerId)).limit(1);
        const [milkman] = await db2.select().from(milkmen2).where(eq18(milkmen2.id, sub.milkmanId)).limit(1);
        if (!customer || !milkman) continue;
        const dairyItems = milkman.dairyItems || [];
        const product = dairyItems.find((p) => p.name === sub.productName);
        const price = sub.priceSnapshot ? parseFloat(sub.priceSnapshot) : product ? parseFloat(product.price) : parseFloat(milkman.pricePerLiter);
        const totalAmount = (parseFloat(sub.quantity) * price).toFixed(2);
        await db2.insert(orders2).values({
          customerId: sub.customerId,
          milkmanId: sub.milkmanId,
          quantity: sub.quantity,
          pricePerLiter: price.toString(),
          totalAmount,
          status: "pending",
          deliveryDate: /* @__PURE__ */ new Date(),
          orderedBy: customer.userId
        }).returning();
        const orderMessage = `\u{1F504} Subscription: ${sub.quantity} ${sub.unit || "liter"} of ${sub.productName}${sub.specialInstructions ? ` (${sub.specialInstructions})` : ""}`;
        await db2.insert(chatMessages3).values({
          customerId: sub.customerId,
          milkmanId: sub.milkmanId,
          senderId: customer.userId,
          senderType: "customer",
          message: orderMessage,
          messageType: "order",
          orderQuantity: sub.quantity,
          orderProduct: sub.productName,
          orderTotal: totalAmount
        });
        console.log(`Subscription order placed for customer ${customer.name} - ${sub.productName}`);
      }
      console.log("Subscription processing complete.");
    } catch (error) {
      console.error("Error in Subscription Order Processing:", error);
    }
  });
  const PORT = process.env.PORT || 5001;
  server.listen(Number(PORT), "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
    log(`serving on port ${PORT}`);
    console.log("Server restarted and routes registered - Forcing Update");
  });
})();
