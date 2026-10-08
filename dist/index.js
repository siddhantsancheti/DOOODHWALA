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
  appConfig: () => appConfig,
  bills: () => bills,
  chatMessages: () => chatMessages,
  customerMilkmen: () => customerMilkmen,
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
  termsAcceptances: () => termsAcceptances,
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
var sessions, users, termsAcceptances, otpCodes, milkmen, customers, orders, payments, familyChats, familyChatMembers, bills, reviews, locations, customerPricings, chatMessages, serviceRequests, notifications, ads, adTracking, smsQueue, products, insertUserSchema, insertMilkmanSchema, insertCustomerSchema, insertOrderSchema, insertBillSchema, insertReviewSchema, insertLocationSchema, insertCustomerPricingSchema, insertOtpCodeSchema, insertFamilyChatSchema, insertFamilyChatMemberSchema, insertChatMessageSchema, insertServiceRequestSchema, insertNotificationSchema, insertPaymentSchema, insertAdSchema, insertAdTrackingSchema, insertSmsQueueSchema, insertProductSchema, settings, agentStatus, agentPrompts, insertSettingsSchema, insertAgentStatusSchema, insertAgentPromptsSchema, subscriptions, insertSubscriptionSchema, customerMilkmen, appConfig;
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
    termsAcceptances = pgTable("terms_acceptances", {
      id: serial("id").primaryKey(),
      userId: varchar("user_id").notNull().references(() => users.id),
      role: varchar("role").notNull(),
      // "customer" | "milkman"
      version: varchar("version").notNull(),
      // e.g. "customer-2026-08-07"
      acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
      ipAddress: varchar("ip_address"),
      userAgent: text("user_agent")
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
      // Verification. A milkman is paid real money, so the account and the PAN are
      // collected before he can be listed. The PAN image sits behind a signed URL,
      // never a public bucket, and only he and an admin can fetch it.
      panNumber: varchar("pan_number"),
      panImageUrl: text("pan_image_url"),
      verificationStatus: varchar("verification_status").default("pending"),
      // pending | verified | rejected
      verifiedAt: timestamp("verified_at"),
      verificationNote: text("verification_note"),
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
      // What the deliveries themselves came to, before any platform charge.
      // Nullable because bills raised before the fee existed have no separate
      // subtotal — for those, subtotal and totalAmount are the same number.
      subtotal: decimal("subtotal", { precision: 10, scale: 2 }),
      // The customer-side platform fee, added on top of the subtotal. Clause 8.7 of
      // the customer terms requires it to appear as its own line before payment, so
      // it is stored separately rather than folded into the total.
      customerFeePercent: decimal("customer_fee_percent", { precision: 5, scale: 2 }),
      customerFeeAmount: decimal("customer_fee_amount", { precision: 10, scale: 2 }),
      // What the platform takes from the milkman, calculated on the subtotal — not
      // on the customer's total, which would mean charging him commission on our
      // own fee.
      vendorCommissionPercent: decimal("vendor_commission_percent", { precision: 5, scale: 2 }),
      vendorCommissionAmount: decimal("vendor_commission_amount", { precision: 10, scale: 2 }),
      // What the customer actually owes: subtotal + customerFeeAmount. Kept as the
      // amount payable so every existing payment path stays correct.
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
      // Which product this price applies to. NULL means the customer's blanket
      // per-litre rate, which is what every pre-existing row is.
      productName: varchar("product_name"),
      pricePerLiter: decimal("price_per_liter", { precision: 10, scale: 2 }).notNull(),
      isActive: boolean("is_active").default(true),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    }, (table) => [
      // One pricing rule per milkman-customer-product
      index("idx_milkman_customer_pricing").on(table.milkmanId, table.customerId, table.productName)
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
      // A problem reported against a delivered order. The report lives in the
      // conversation rather than in a ticket system, because the conversation is
      // where the two of them already talk — a complaint filed somewhere else is a
      // complaint nobody answers. Clause 7.3 of the customer terms requires this
      // route to exist ("within 24 hours of delivery, through the app").
      reportedMessageId: integer("reported_message_id"),
      reportReason: varchar("report_reason"),
      // didnt_arrive | quantity | quality | wrong_item | other
      reportPhotoUrl: text("report_photo_url"),
      reportResolvedAt: timestamp("report_resolved_at"),
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
    customerMilkmen = pgTable("customer_milkmen", {
      id: serial("id").primaryKey(),
      customerId: integer("customer_id").notNull().references(() => customers.id),
      milkmanId: integer("milkman_id").notNull().references(() => milkmen.id),
      isPrimary: boolean("is_primary").default(false),
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow()
    }, (table) => [
      index("idx_customer_milkmen").on(table.customerId, table.milkmanId)
    ]);
    appConfig = pgTable("app_config", {
      key: text("key").primaryKey(),
      value: text("value").notNull(),
      updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
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

// server/services/households.ts
var households_exports = {};
__export(households_exports, {
  ensureHouseholdChat: () => ensureHouseholdChat,
  retireOtherSoloHouseholds: () => retireOtherSoloHouseholds
});
import { eq as eq7, and as and6 } from "drizzle-orm";
function makeChatCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "GRP";
  for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
async function uniqueChatCode() {
  let code = makeChatCode();
  for (let i = 0; i < 5; i++) {
    const [clash] = await db.select({ id: familyChats.id }).from(familyChats).where(eq7(familyChats.chatCode, code)).limit(1);
    if (!clash) return code;
    code = makeChatCode();
  }
  return `GRP${Date.now().toString(36).toUpperCase().slice(-3)}`;
}
async function ensureHouseholdChat(customerId, milkmanId) {
  try {
    const [customer] = await db.select({ id: customers.id, userId: customers.userId, name: customers.name }).from(customers).where(eq7(customers.id, customerId)).limit(1);
    if (!customer?.userId) return null;
    const existing = await db.select({ chatId: familyChats.id }).from(familyChatMembers).innerJoin(familyChats, eq7(familyChatMembers.chatId, familyChats.id)).where(and6(
      eq7(familyChatMembers.userId, customer.userId),
      eq7(familyChats.milkmanId, milkmanId),
      eq7(familyChats.isActive, true)
    )).limit(1);
    if (existing.length > 0) return existing[0].chatId;
    const [chat] = await db.insert(familyChats).values({
      chatName: customer.name || "My household",
      milkmanId,
      createdBy: customer.userId,
      chatCode: await uniqueChatCode(),
      isActive: true
    }).returning();
    await db.insert(familyChatMembers).values({
      chatId: chat.id,
      userId: customer.userId,
      isAdmin: true
    });
    return chat.id;
  } catch (error) {
    console.error("ensureHouseholdChat failed:", error);
    return null;
  }
}
async function retireOtherSoloHouseholds(userId, milkmanId, keepChatId) {
  try {
    const mine = await db.select({ chatId: familyChats.id }).from(familyChatMembers).innerJoin(familyChats, eq7(familyChatMembers.chatId, familyChats.id)).where(and6(
      eq7(familyChatMembers.userId, userId),
      eq7(familyChats.milkmanId, milkmanId),
      eq7(familyChats.isActive, true)
    ));
    let closed = 0;
    for (const { chatId } of mine) {
      if (chatId === keepChatId) continue;
      const members = await db.select({ id: familyChatMembers.id }).from(familyChatMembers).where(eq7(familyChatMembers.chatId, chatId));
      if (members.length > 1) continue;
      await db.update(familyChats).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq7(familyChats.id, chatId));
      closed++;
    }
    return closed;
  } catch (error) {
    console.error("retireOtherSoloHouseholds failed:", error);
    return 0;
  }
}
var init_households = __esm({
  "server/services/households.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/gatewayRoutes.ts
var gatewayRoutes_exports = {};
__export(gatewayRoutes_exports, {
  default: () => gatewayRoutes_default,
  retryFailedMessages: () => retryFailedMessages
});
import { Router as Router11 } from "express";
import { eq as eq20, and as and14, lt as lt2 } from "drizzle-orm";
async function retryFailedMessages() {
  try {
    await db.update(smsQueue).set({
      status: "pending",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(
      and14(
        eq20(smsQueue.status, "failed"),
        lt2(smsQueue.attempts, 3)
      )
    );
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1e3);
    await db.update(smsQueue).set({
      status: "pending",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(
      and14(
        eq20(smsQueue.status, "processing"),
        lt2(smsQueue.updatedAt, fifteenMinutesAgo)
      )
    );
    console.log("Retry logic executed for SMS queue.");
  } catch (error) {
    console.error("Error retrying failed messages:", error);
  }
}
var router11, GATEWAY_SECRET, requireGatewayAuth, gatewayRoutes_default;
var init_gatewayRoutes = __esm({
  "server/gatewayRoutes.ts"() {
    "use strict";
    init_db();
    init_schema();
    router11 = Router11();
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
    router11.get("/pending", requireGatewayAuth, async (req, res) => {
      try {
        const pendingMessages = await db.select().from(smsQueue).where(
          and14(
            eq20(smsQueue.status, "pending"),
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
    router11.post("/status", requireGatewayAuth, async (req, res) => {
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
        }).where(eq20(smsQueue.id, id));
        res.json({ success: true });
      } catch (error) {
        console.error("[Gateway] Error updating status:", error);
        res.status(500).json({ message: "Server error" });
      }
    });
    gatewayRoutes_default = router11;
  }
});

// server/index.ts
import "dotenv/config";
import express2 from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit2 from "express-rate-limit";

// server/routes.ts
import { createServer } from "http";

// server/authRoutes.ts
init_db();
init_schema();
import { Router as Router3 } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { eq as eq6, and as and5 } from "drizzle-orm";

// server/legal/customerTerms.ts
var CUSTOMER_TERMS_VERSION = "customer-2026-09-04";
var CUSTOMER_TERMS_LAST_UPDATED = "4 September 2026";
var CUSTOMER_TERMS_MARKDOWN = `
# DOOODHWALA \u2014 Terms and Conditions (Customer)
Operated by: Sambhavshri Agro Processing LLP LLPIN: ACB - 4950, registered office at 11/D, Pagariya Residency, Vedant Nagar, Chhatrapati Sambhaji Nagar. ("DOOODHWALA", "Platform", "we", "us").
## 1. Acceptance and nature of this agreement
1.1 These Terms, together with the Privacy Policy, Refund & Cancellation Policy and any policy published on the Platform, constitute a legally binding electronic agreement between you ("Customer", "you") and DOOODHWALA.
1.2 This is an electronic record generated by a computer system and published in accordance with the Information Technology Act, 2000 and the rules made thereunder, including Rule 3(1)(a) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021. It does not require any physical, digital or electronic signature and is enforceable under Section 10A of the Information Technology Act, 2000.
1.3 By registering, clicking "I agree", or placing or receiving any order, you signify your unconditional acceptance of these Terms.
1.4 If you do not agree, you must not use the Platform.
## 2. Eligibility
2.1 You must be a person competent to contract under Section 11 of the Indian Contract Act, 1872 \u2014 i.e. at least 18 years of age, of sound mind, and not disqualified from contracting by any law.
2.2 If you are below 18, you may use the Platform only through a parent or lawful guardian who accepts these Terms on your behalf and is responsible for all activity on the account.
2.3 The Platform is intended for use within the territory of India only.
## 3. Role of the Platform \u2014 Intermediary and Marketplace
3.1 DOOODHWALA is a technology platform that connects Customers with independent milk suppliers, dairies, distributors and delivery persons ("Milkman" / "Supplier"). We do not own, produce, process, pack, store or sell milk or dairy products.
3.2 DOOODHWALA is an "intermediary" under Section 2(1)(w) of the Information Technology Act, 2000 and a "marketplace e-commerce entity" under the Consumer Protection (E-Commerce) Rules, 2020. We claim the exemption from liability available under Section 79 of the Information Technology Act, 2000.
3.3 The contract for sale and supply of milk and dairy products is directly between you and the Supplier. DOOODHWALA is not a party to that contract and does not give any warranty, express or implied, regarding the goods.
3.4 In compliance with Rule 5 of the Consumer Protection (E-Commerce) Rules, 2020, the Platform will make available to you, on request or through the app, the Supplier's legal name, principal geographic address and contact details. The Platform does not hold or verify Supplier food-safety licences; where you require a Supplier's FSSAI licence or registration number, you may request it from that Supplier directly, and they are obliged under Clause 7.2 to hold one.
3.5 We do not adopt any unfair trade practice, do not manipulate prices to gain unreasonable profit, and do not discriminate between Customers of the same class.
## 4. Registration and account security
4.1 You must provide information that is true, accurate, current and complete, and keep it updated.
4.2 You are solely responsible for maintaining the confidentiality of your login credentials, OTPs and device, and for all activity under your account.
4.3 Notify us immediately at sambhavshriagroprocessing@gmail.com of any unauthorised use. DOOODHWALA is not liable for loss arising from your failure to safeguard credentials.
4.4 We may verify your mobile number, address or identity, and may suspend or terminate accounts containing false, misleading or fraudulent information.
## 5. Orders, subscriptions and cutoff
5.1 Milk quantity, product type and delivery schedule may be created, modified or paused through the Platform.
5.2 All changes, pauses and cancellations must be submitted before the daily cutoff time displayed in the app for your Supplier. Requests received after cutoff will ordinarily take effect from the next delivery cycle.
5.3 A subscription is a standing instruction to deliver until you pause or cancel it. You remain liable for deliveries actually made against a subscription you did not pause before cutoff.
5.4 Prices are displayed inclusive of applicable taxes unless stated otherwise. GST, where applicable, will be charged and invoiced in accordance with the Central Goods and Services Tax Act, 2017 and rules thereunder.
5.5 Quantity and measurement of products shall comply with the Legal Metrology Act, 2009 and the Legal Metrology (Packaged Commodities) Rules, 2011. Declarations on pre-packaged products are the responsibility of the Supplier/packer.
## 6. Delivery
6.1 Delivery timings are indicative and may vary with the Supplier's route, traffic, weather, local restrictions and other conditions.
6.2 You must ensure safe and reasonable access for delivery and, where required, that a person is available to receive the delivery.
6.3 If you have instructed unattended delivery (e.g. at a doorstep, gate or milk box), risk in the goods passes to you upon such delivery, and neither DOOODHWALA nor the Supplier is responsible for theft, spoilage or tampering thereafter.
6.4 Repeated non-acceptance of delivery may result in suspension of the subscription and recovery of amounts due for goods actually delivered.
## 7. Product quality, food safety and complaints
7.1 Milk and dairy products supplied through the Platform are required to comply with the Food Safety and Standards Act, 2006, the Food Safety and Standards (Food Products Standards and Food Additives) Regulations, 2011, and the Food Safety and Standards (Licensing and Registration of Food Businesses) Regulations, 2011.
7.2 Every Supplier onboarded on the Platform is required to hold and maintain a valid FSSAI licence or registration. Responsibility for food safety, hygiene, adulteration, cold chain, standards of quality and statutory labelling rests solely with the Supplier as the Food Business Operator.
7.3 Report any quality complaint within 24 hours of delivery through the app, with the order details and, where possible, photographs and retention of the product/packaging. Complaints raised after 24 hours may not be capable of verification.
7.4 On a verified complaint, the Supplier will provide replacement or credit/refund in accordance with the Refund & Cancellation Policy. Refunds, where payable, will be processed to the original payment method within 7 business days of approval.
7.5 Nothing in these Terms restricts your statutory rights against the Supplier under the Consumer Protection Act, 2019, or the powers of authorities under the Food Safety and Standards Act, 2006.
## 8. Payments and billing
8.1 You agree to pay all amounts due on or before the due date shown in the app.
8.2 Payments are processed through third-party payment gateways/aggregators authorised by the Reserve Bank of India under the Payment and Settlement Systems Act, 2007. DOOODHWALA does not store your full card, CVV or banking credentials; card data handling follows RBI's tokenisation framework.
8.3 Payment gateway failures, network errors, refund timelines and chargebacks are governed by the policies of the relevant bank, aggregator and card network. Amounts debited without a successful order will be reversed as per those policies.
8.4 Any advance or wallet balance held is a prepaid deposit against future deliveries only. It is non-transferable, cannot be withdrawn as cash, and is not a deposit under the Banking Regulation Act, 1949.
8.5 Late payment may attract suspension of service after 3 days and late fee may charge @ 2% per month on overdue amounts, subject to applicable law.

8.6 GST-compliant invoices will be issued by the Supplier or by the Platform on the Supplier's behalf, as applicable.

8.7 Platform fee. In addition to the price of the products supplied by the Supplier, DOOODHWALA charges a platform fee of 1% (one per cent) of the order value for the use of the Platform. This fee is charged by DOOODHWALA, is not payable to or received by the Supplier, and is shown as a separate line on your bill before you make payment.

8.8 Applicable GST on the platform fee will be charged and invoiced in accordance with the Central Goods and Services Tax Act, 2017.

8.9 Where an order is cancelled or refunded in full, the platform fee charged on that order is refunded with it. Where a partial refund is made, the platform fee is reduced proportionately.

8.10 We may revise the platform fee. Any revision will be notified through the app at least 7 days before it takes effect, and will apply only to orders placed on or after the effective date.
## 9. Pause, cancellation and account closure
9.1 You may pause deliveries through the app before the daily cutoff time.
9.2 You may discontinue the service at any time by cancelling the subscription in the app and informing the Milkman.
9.3 All outstanding dues must be cleared before account closure. Closure does not extinguish liability for goods already delivered.
9.4 We may suspend or terminate your account, with notice were reasonably practicable, for non-payment, breach of these Terms, fraud, abuse of delivery personnel, or where required by law or a court/government order.
## 10. User conduct and prohibited content
10.1 You shall not:
- provide false, misleading or impersonating information;
- abuse, threaten, harass or endanger the Milkman or delivery personnel;
- misuse, reverse-engineer, scrape, overload or attempt unauthorised access to the Platform;
- use the Platform for any unlawful purpose, money laundering or resale/commercial redistribution without written consent;
- infringe any intellectual property or third-party right.
10.2 In accordance with Rule 3(1)(b) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, you shall not host, display, upload, publish or share any information which: belongs to another person and to which you do not have rights; is obscene, paedophilic, invasive of privacy, insulting or harassing on the basis of gender, racially or ethnically objectionable, or otherwise unlawful; harms a child; infringes intellectual property; deceives or misleads as to origin; impersonates another; threatens the unity, integrity, defence, security or sovereignty of India, friendly relations with foreign States, or public order; contains software viruses; or is patently false with the intent to mislead.
10.3 On becoming aware of non-compliance, we may remove or disable access to such information and terminate access rights, and we will comply with lawful orders of a court or authorised government agency.
## 11. Privacy and personal data
11.1 We process personal data in accordance with our Privacy Policy, the Digital Personal Data Protection Act, 2023, and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.
11.2 DOOODHWALA acts as a Data Fiduciary. We collect your name, mobile number, delivery address, geo-location (where enabled), order history and payment references for the purpose of providing dairy delivery services, billing, customer support and legal compliance.
11.3 Your data is shared with the Supplier and delivery personnel strictly to fulfil deliveries, and with payment processors to process transactions. We do not sell personal data to third parties.
11.4 As a Data Principal, you have the right to access a summary of your personal data, to correction and erasure, to grievance redressal, and to nominate another individual to exercise your rights in the event of death or incapacity. Requests may be made to the contact in Clause 13.
11.5 You may withdraw consent at any time, with the consequence that we may be unable to continue providing the service. Withdrawal does not affect processing carried out before withdrawal.
11.6 We retain personal data only as long as necessary for the stated purpose or as required by law, and apply reasonable security safeguards to prevent personal data breaches.
## 12. Intellectual property
The Platform, its software, trademarks, logos, designs, content and databases are owned by or licensed to DOOODHWALA and are protected under the Copyright Act, 1957, the Trade Marks Act, 1999 and other applicable laws. No right is granted to you except a limited, revocable, non-exclusive, non-transferable licence to use the app for personal use.
## 13. Grievance Redressal Officer
In compliance with Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, Rule 4 of the Consumer Protection (E-Commerce) Rules, 2020, and Section 13 of the Digital Personal Data Protection Act, 2023:
- Name: Sachin Sancheti
- Designation: Chief Executive Officer
- Address: 2, Costa Mapple, New Osmanpura, Ner SSC Board, Chhatrapati Sambhajinagar -431005.
- Email: sambhavshriagroprocessing@gmail.com
- Phone: 8308804099
- Hours: Mon\u2013Sat, 9:00\u201318:00 IST
13.1 Complaints will be acknowledged within 24 hours and disposed of within 15 days of receipt, in accordance with the IT Rules, 2021.
13.2 Consumer complaints under the Consumer Protection (E-Commerce) Rules, 2020 will be acknowledged within 48 hours and redressed within one month of receipt.
13.3 Requests to remove unlawful content covered by Rule 3(2)(b) of the IT Rules, 2021 will be acted upon within 24 hours.
13.4 You may also register a complaint on the National Consumer Helpline (1915) or the INGRAM portal, or with the appropriate Consumer Commission.
## 14. Force majeure
Neither party shall be liable for failure or delay in performance caused by events beyond reasonable control, including acts of God, flood, fire, epidemic or pandemic, government orders or lockdowns, strikes, riots, curfew, war, failure of transport or telecommunications, power failure, or cattle/livestock disease outbreaks affecting supply.
## 15. Limitation of liability
15.1 DOOODHWALA is not responsible for: the quality, quantity, safety, or legality of products supplied by the Supplier; delivery delays caused by circumstances beyond its control; disputes or transactions concluded outside the Platform; or the conduct of any Supplier, Milkman or Customer.
15.2 Subject to Clause 15.3, and to the extent permitted by law, DOOODHWALA's aggregate liability arising out of or in connection with these Terms shall not exceed the total Platform charges/commission actually received by DOOODHWALA in respect of your orders in the three (3) months preceding the event giving rise to the claim.
15.3 Nothing in these Terms excludes or limits liability which cannot lawfully be excluded, including liability for death or personal injury caused by negligence, for fraud, or any liability arising under the Consumer Protection Act, 2019 or the Food Safety and Standards Act, 2006.
15.4 Neither party shall be liable for indirect, incidental, special, punitive or consequential loss, or loss of profit, goodwill or data.
## 16. Indemnity
You agree to indemnify and hold harmless DOOODHWALA, its directors, officers and employees from any claim, demand, loss, penalty or expense (including reasonable legal fees) arising from your breach of these Terms, your violation of any law, or your infringement of any third-party right.
## 17. Governing law, dispute resolution and jurisdiction
17.1 These Terms are governed by and construed in accordance with the laws of India.
17.2 The parties shall first attempt to resolve any dispute amicably through the Grievance Redressal Officer within 30 days.
17.3 Failing amicable resolution, the dispute shall be referred to arbitration by a sole arbitrator appointed by mutual consent, under the Arbitration and Conciliation Act, 1996. The seat and venue of arbitration shall be Chhatrapati Sambhaji Nagar, Maharashtra, and the language shall be English. The award shall be final and binding.
17.4 Subject to the above, the courts at Chhatrapati Sambhaji Nagar, Maharashtra shall have exclusive jurisdiction.
17.5 **Consumer rights preserved: ** Nothing in Clauses 17.3 and 17.4 restricts your right as a consumer to approach the District, State or National Consumer Disputes Redressal Commission having jurisdiction, including the Commission where you ordinarily reside or work, under Section 34(2)(d) of the Consumer Protection Act, 2019.
## 18. Amendments, notices and general:
18.1 We may amend these Terms at any time. Material changes will be notified through the app, email or SMS at least 7 days in advance. Continued use after the effective date constitutes acceptance.
18.2 Notices to you may be sent by in-app notification, SMS or email to your registered details.
18.3 If any provision is held invalid or unenforceable, the remaining provisions continue in full force.
18.4 Our failure to enforce any right is not a waiver of that right.
18.5 You may not assign your rights under these Terms. We may assign to an affiliate or successor on notice.
18.6 These Terms, with the policies referred to in Clause 1.1, constitute the entire agreement between you and DOOODHWALA regarding the Platform.
18.7 In case of conflict between the English version and any translation, the English version prevails.
`.trim();

// server/legal/milkmanTerms.ts
var MILKMAN_TERMS_VERSION = "milkman-2026-08-29";
var MILKMAN_TERMS_LAST_UPDATED = "29 August 2026";
var MILKMAN_TERMS_MARKDOWN = `
# DOOODHWALA \u2014 Terms and Conditions (Milkman / Supplier)
Operated by: Sambhavshri Agro Processing LLP LLPIN: ACB - 4950, registered office at 11/D, Pagariya Residency, Vedant Nagar, Chhatrapati Sambhaji Nagar. ("DOOODHWALA", "Platform", "we", "us").
## 1. Acceptance and nature of this agreement
1.1 These Terms constitute a legally binding electronic agreement between you ("Milkman", "Supplier", "you") and DOOODHWALA, and govern your use of the Platform to manage and fulfil dairy supply to Customers.
1.2 This is an electronic record under the Information Technology Act, 2000, published in accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021. It requires no physical signature and is enforceable under Section 10A of that Act.
1.3 By registering, clicking "I agree", or listing any product or accepting any order, you unconditionally accept these Terms.
1.4 This document also serves as the prior written contract between the marketplace entity and the seller required by Rule 6(2) of the Consumer Protection (E-Commerce) Rules, 2020.
## 2. Relationship of the parties \u2014 independent contractor
2.1 You are an independent business operating on a principal-to-principal basis. Nothing in these Terms creates a relationship of employer and employee, master and servant, partnership, joint venture, or agency between you and DOOODHWALA.
2.2 You retain full control over your route, timings, pricing, staff, vehicles, sourcing and business methods. DOOODHWALA does not supervise or direct the manner in which you perform your work.
2.3 You are solely responsible for your own statutory registrations, taxes, insurance, and for the wages, welfare and statutory dues of any person you engage.
2.4 **Aggregator obligations: ** to the extent the Code on Social Security, 2020 and rules notified thereunder apply to DOOODHWALA as an aggregator in respect of gig or platform workers, DOOODHWALA will comply with those obligations. This does not alter the independent-contractor characterisation in Clause 2.1.
2.5 You shall not hold yourself out as an employee, agent or representative of DOOODHWALA, or give any warranty or commitment on our behalf.
## 3. Registration, verification and records
3.1 You must provide genuine, accurate and complete personal and business information, including: legal name, trade name, principal place of business, mobile number, PAN, Aadhaar (where you consent to Aadhaar-based verification), GSTIN (if registered), FSSAI licence/registration number, and bank account details.
3.2 You authorise DOOODHWALA to verify these details, including through third-party verification agencies and public databases, and to conduct background or criminal-record checks on you and your delivery personnel.
3.3 You must keep all licences, registrations and documents current, and upload renewals before expiry. Lapse of an FSSAI licence will result in immediate suspension of your listing.
3.4 You must maintain accurate customer records, delivery records and books of account as required under applicable law, including Section 35 of the CGST Act, 2017 and the Income-tax Act, 1961, and retain them for the statutory retention periods.
3.5 In accordance with Rule 5(3) and Rule 6(5) of the Consumer Protection (E-Commerce) Rules, 2020, you consent to DOOODHWALA displaying to Customers your legal name, principal geographic address, customer care contact, FSSAI licence number and, where applicable, GSTIN.
## 4. Food safety, product quality and licensing
4.1 You are the Food Business Operator ("FBO") in respect of every product you supply. You are solely responsible for the safety, quality, wholesomeness and legality of those products.
4.2 You must hold and maintain a valid registration or licence under Section 31 of the Food Safety and Standards Act, 2006 and the Food Safety and Standards (Licensing and Registration of Food Businesses) Regulations, 2011, appropriate to your turnover and scale of operation, and display the licence number as required.
4.3 All milk and dairy products must conform to the standards prescribed under the Food Safety and Standards (Food Products Standards and Food Additives) Regulations, 2011, including the prescribed minimum fat and SNF content for the class of milk sold (e.g. full cream, toned, double toned, skimmed).
4.4 You must comply with the sanitary and hygienic requirements in Schedule 4 of the Food Safety and Standards (Licensing and Registration) Regulations, 2011, including requirements relating to premises, equipment, personal hygiene, water quality, cold chain and transport.
4.5 You must comply with the Food Safety and Standards (Packaging) Regulations, 2018 and the Food Safety and Standards (Labelling and Display) Regulations, 2020, and with the Legal Metrology Act, 2009 and the Legal Metrology (Packaged Commodities) Rules, 2011 in respect of weights, measures and declarations. Weighing and measuring instruments must be verified and stamped as required.
4.6 You must not supply milk that is adulterated, sub-standard, misbranded or unsafe. You acknowledge that adulteration attracts penalties under Sections 50 to 59 of the Food Safety and Standards Act, 2006, and criminal liability under Sections 274 and 275 of the Bharatiya Nyaya Sanhita, 2023 (adulteration of food or drink intended for sale, and sale of noxious food or drink).
4.7 You must cooperate fully with any inspection, sampling or audit by a Food Safety Officer or Designated Officer, and must inform DOOODHWALA within 24 hours of any notice, sample failure, improvement notice, prosecution or licence suspension.
4.8 DOOODHWALA may, at its discretion, arrange independent quality testing, and may suspend your listing pending the outcome where a credible safety concern arises.
4.9 You are responsible for product liability as a product seller and, where applicable, product manufacturer under Chapter VI (Sections 82 to 87) of the Consumer Protection Act, 2019.
## 5. Pricing and consumer fairness
5.1 Prices entered in the app must be accurate, must match the price actually charged, and must include or clearly disclose all applicable taxes and charges.
5.2 You must give Customers advance notice of at least 3 days before any price increase takes effect, through the app.
5.3 You shall not engage in unfair or restrictive trade practices under the Consumer Protection Act, 2019, including misleading descriptions, false claims about quality or origin, bait pricing, or refusing to honour a displayed price.
5.4 You shall not discriminate between Customers of the same class in relation to price, quality or service.
## 6. Delivery obligations
6.1 You are responsible for timely delivery in accordance with each Customer's agreed schedule, quantity and cutoff arrangement.
6.2 You must maintain the cold chain and product integrity until delivery, and must not deliver products past their date of expiry or best-before date.
6.3 Where you engage delivery personnel, you are responsible for their conduct, remuneration, statutory dues, and for ensuring they are lawfully entitled to work. You shall not engage any person below 14 years of age, or below 18 years in any hazardous process, in accordance with the Child and Adolescent Labour (Prohibition and Regulation) Act, 1986.
6.4 Any vehicle used must have valid registration, a valid driving licence for the operator, and third-party insurance as required by the Motor Vehicles Act, 1988.
6.5 Persistent delivery failure, unexplained non-delivery or falsified delivery records may result in reduced visibility, suspension or termination under Clause 12.
## 7. Billing, invoicing and record integrity
7.1 Bills generated through the app must accurately reflect the quantity and product actually delivered.
7.2 **False billing, back-dating, inflation of quantities, ghost deliveries or manipulation of records is strictly prohibited** and constitutes both a material breach of these Terms and a potential offence, including cheating under Section 318 of the Bharatiya Nyaya Sanhita, 2023.
7.3 Where you are registered under GST, you are responsible for issuing tax invoices compliant with Section 31 of the CGST Act, 2017 and Rule 46 of the CGST Rules, 2017, and for filing your own returns.
7.4 You authorise DOOODHWALA to generate invoices on your behalf where you have opted for self-billing, in which case you remain responsible for the accuracy of the underlying data.
7.5 You must promptly correct any billing error on becoming aware of it and refund or credit the Customer accordingly.
## 8. Taxes and statutory deductions
8.1 You are solely responsible for your own tax registrations, filings and liabilities, including GST and income tax.
8.2 You acknowledge that DOOODHWALA may be required to:
- collect Tax Collected at Source (TCS) under Section 52 of the CGST Act, 2017 on the net value of taxable supplies made through the Platform; and
- deduct TDS at 1% under Section 194-O of the Income-tax Act, 1961 on the gross amount of sales facilitated through the Platform.
8.3 You must furnish a valid PAN. Failure to do so may attract a higher rate of deduction under Section 206AA of the Income-tax Act, 1961.
8.4 You indemnify DOOODHWALA against any tax, interest or penalty arising from your misstatement of tax status, non-registration, or failure to file returns.
## 9. Payments and settlement
9.1 Where a Customer pays you directly in cash or otherwise offline, collection is your responsibility. DOOODHWALA is not a party to and bears no liability for unpaid Customer dues, bad debts or recovery.
9.2 Where online payment through the Platform is enabled, amounts collected from Customers will be settled to your registered bank account within T+2 business days of realisation, net of Platform fees, applicable taxes, refunds, chargebacks and any adjustments under Clause 9.4.
9.3 Payments are routed through payment aggregators authorised by the Reserve Bank of India under the Payment and Settlement Systems Act, 2007, and are subject to those aggregators' settlement cycles and nodal account arrangements.
9.4 DOOODHWALA may set off, withhold or recover from amounts due to you: verified Customer refunds, chargebacks, penalties for confirmed adulteration or false billing, and amounts paid to you in error. We will notify you with reasons before any deduction.
9.5 Platform fees, commission and any subscription charges are as published in the app and may be revised on 30 days' prior notice.
9.6 You shall not solicit Customers to transact off-Platform in order to avoid Platform fees for orders originating on the Platform. This restriction applies only during the term of this agreement.
## 10. Customer data and confidentiality
10.1 Customer names, addresses, phone numbers, geolocation and order history accessed through the Platform are confidential. You may use them only to fulfil dairy deliveries and provide related customer service.
10.2 You must not sell, rent, share, publish or otherwise disclose Customer data to any third party, or use it for marketing any other product or service, without the Customer's specific, informed consent.
10.3 In relation to Customer personal data made available through the Platform, you act as a Data Processor on behalf of DOOODHWALA under the Digital Personal Data Protection Act, 2023, and shall:
- process such data only on our documented instructions and for the stated purpose;
- implement reasonable security safeguards;
- not retain data longer than necessary, and delete or return it on termination;
- notify DOOODHWALA immediately and in any event within 6 hours of becoming aware of any personal data breach, so that we can meet reporting timelines to the Data Protection Board and to CERT-In under Section 70B(6) of the Information Technology Act, 2000 and the CERT-In Directions of 28 April 2022;
- cooperate with any Data Principal request for access, correction or erasure.
10.4 You acknowledge that a Data Processor's breach may expose DOOODHWALA to financial penalties under the Schedule to the Digital Personal Data Protection Act, 2023, and you indemnify us for penalties attributable to your breach.
10.5 Misuse of Customer data may also attract liability under Sections 43A, 66 and 72A of the Information Technology Act, 2000.
## 11. Prohibited activities
You shall not:
- supply adulterated, unsafe, sub-standard, misbranded or expired milk or dairy products;
- enter false, inflated or fabricated delivery or billing records;
- misuse, sell or disclose Customer information;
- abuse, threaten or harass any Customer, delivery person or DOOODHWALA personnel;
- operate without a valid FSSAI licence or with lapsed statutory registrations;
- use unverified or tampered weights and measures;
- create multiple or impersonating accounts, or transfer your account to another person;
- manipulate ratings or reviews, or post fake feedback;
- use the Platform for money laundering, tax evasion or any unlawful purpose;
- host or transmit content prohibited under Rule 3(1)(b) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021;
- reverse-engineer, scrape, or attempt unauthorised access to the Platform.
## 12. Suspension and termination
12.1 DOOODHWALA may suspend or terminate your account for: fraudulent activity, confirmed adulteration or a food safety failure, false billing, repeated substantiated Customer complaints, lapse of FSSAI or other statutory licence, misuse of Customer data, or material breach of these Terms.
12.2 Immediate suspension without notice may be applied where there is a credible risk to public health or food safety, an apparent fraud, or a direction from a court or competent authority.
12.3 In all other cases, we will give you written reasons and a reasonable opportunity of at least 7 days to respond before termination, and will consider your response in good faith.
12.4 You may terminate this agreement at any time on 30 days' written notice, provided you complete or properly hand over all active subscriptions and clear all dues.
12.5 On termination: your listing is removed; undisputed settlement amounts are released after 30 days net of adjustments; you must delete all Customer data obtained through the Platform; and Clauses 8, 10, 13, 14, 15 and 16 survive.
12.6 You may appeal a suspension or termination to the Grievance Redressal Officer under Clause 16, who will decide within 15 days.
## 13. Warranties and indemnity
13.1 You represent and warrant that: you have full legal capacity and authority to enter into this agreement; all information provided is true; you hold all licences required by law; the products you supply comply with the Food Safety and Standards Act, 2006 and rules thereunder; and you are not disqualified from contracting or debarred by any authority.
13.2 You shall indemnify, defend and hold harmless DOOODHWALA, its directors, officers and employees against all claims, demands, proceedings, penalties, fines, losses and reasonable legal costs arising from: the quality, safety or legality of your products; food-borne illness or adulteration; your breach of these Terms or of any law; product liability claims under the Consumer Protection Act, 2019; misuse of Customer data; tax defaults; and any claim by a person engaged by you relating to employment, wages or welfare.
13.3 You should maintain product liability and public liability insurance appropriate to your scale of operation.
## 14. Force majeure
Neither party shall be liable for failure or delay caused by events beyond reasonable control, including acts of God, flood, fire, epidemic or pandemic, cattle or livestock disease outbreak, government orders, lockdowns, curfew, strikes, riots, failure of transport, power or telecommunications.
## 15. Limitation of liability
15.1 DOOODHWALA provides a digital platform for dairy business management. We are not responsible for losses arising from business disputes with Customers, Customer payment defaults, product spoilage, loss of business or profit, or events beyond our reasonable control.
15.2 We do not guarantee any minimum number of Customers, orders, volume or income.
15.3 To the extent permitted by law, our aggregate liability arising out of or in connection with these Terms shall not exceed the total Platform fees actually received by us from you in the three 3 months preceding the event giving rise to the claim.
15.4 Nothing in this Clause excludes liability that cannot lawfully be excluded, including liability for fraud or for death or personal injury caused by negligence.
15.5 The Platform is provided on an "as is" and "as available" basis. We do not warrant uninterrupted or error-free operation, and may carry out maintenance, updates or changes to features.
## 16. Grievance Redressal Officer
- Name: Sachin Sancheti
- Designation: Chief Executive Officer
- Address: 2, Costa Mapple, New Osmanpura, Ner SSC Board, Chhatrapati Sambhajinagar -431005.
- Email: sambhavshriagroprocessing@gmail.com
- Phone: 8308804099
- Hours: Mon\u2013Sat, 9:00\u201318:00 IST
16.1 Complaints will be acknowledged within 24 hours and disposed of within 15 days, in accordance with Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.
16.2 You must also appoint and disclose a customer care contact for Customer complaints relating to your products, as required by Rule 6(5) of the Consumer Protection (E-Commerce) Rules, 2020, and respond to Customer complaints within 48 hours.
## 17. Governing law, dispute resolution and jurisdiction
17.1 These Terms are governed by the laws of India.
17.2 The parties shall first attempt amicable resolution through the Grievance Redressal Officer within 30 days.
17.3 Failing resolution, disputes shall be referred to arbitration by a sole arbitrator appointed by mutual consent, under the Arbitration and Conciliation Act, 1996. The seat and venue shall be Chhatrapati Sambhaji Nagar, Maharashtra; the language shall be English; the award shall be final and binding.
17.4 Subject to the above, the courts at Chharapati Sambhaji Nagar, Maharashtra shall have exclusive jurisdiction.
## 18. General
18.1 We may amend these Terms on 15 days' notice through the app, SMS or email. Continued use after the effective date constitutes acceptance.
18.2 You may not assign or transfer your rights or obligations. We may assign to an affiliate or successor on notice.
18.3 If any provision is held invalid or unenforceable, the remainder continues in full force.
18.4 Failure to enforce any right is not a waiver of that right.
18.5 These Terms, with the policies referred to in them, constitute the entire agreement between the parties in respect of the Platform.
18.6 In case of conflict between the English version and any translation, the English version prevails.
`.trim();

// server/legal/index.ts
var TERMS = {
  customer: {
    role: "customer",
    version: CUSTOMER_TERMS_VERSION,
    lastUpdated: CUSTOMER_TERMS_LAST_UPDATED,
    title: "Customer Terms & Conditions",
    markdown: CUSTOMER_TERMS_MARKDOWN
  },
  milkman: {
    role: "milkman",
    version: MILKMAN_TERMS_VERSION,
    lastUpdated: MILKMAN_TERMS_LAST_UPDATED,
    title: "Milkman Terms & Conditions",
    markdown: MILKMAN_TERMS_MARKDOWN
  }
};
function isTermsRole(value) {
  return value === "customer" || value === "milkman";
}
function currentTermsVersion(role) {
  return TERMS[role].version;
}

// server/authRoutes.ts
import jwt from "jsonwebtoken";

// server/services/otpService.ts
init_db();
init_schema();
import { eq, and, gt } from "drizzle-orm";
var devOtpStore = /* @__PURE__ */ new Map();
var normalizePhone = (p) => (p || "").replace(/\D/g, "").slice(-10);
var REVIEW_PHONE = process.env.REVIEW_TEST_PHONE ? normalizePhone(process.env.REVIEW_TEST_PHONE) : null;
var REVIEW_OTP = (process.env.REVIEW_TEST_OTP || "123456").trim();
function isReviewPhone(phone) {
  return !!REVIEW_PHONE && REVIEW_PHONE.length === 10 && normalizePhone(phone) === REVIEW_PHONE;
}
var OTPService = class {
  static generateCode() {
    if (process.env.NODE_ENV === "development") {
      return "123456";
    }
    return Math.floor(1e5 + Math.random() * 9e5).toString();
  }
  static async sendOTP(phone) {
    try {
      if (isReviewPhone(phone)) {
        console.log("[OTPService] Review test phone \u2014 skipping real SMS; fixed OTP in effect.");
        return { success: true, message: "OTP sent successfully" };
      }
      const code = this.generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1e3);
      if (process.env.NODE_ENV === "development") {
        devOtpStore.set(phone, { code, expiresAt, isUsed: false });
        console.log(`[OTPService] DEV OTP for ${phone}: ${code}`);
        return { success: true, message: "OTP sent successfully", debugCode: code };
      }
      await db.update(otpCodes).set({ isUsed: true }).where(and(eq(otpCodes.phone, phone), eq(otpCodes.isUsed, false)));
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
      if (isReviewPhone(phone)) {
        const ok = codeStr === REVIEW_OTP;
        console.log(`[OTPService] Review test phone verify: ${ok ? "accepted" : "rejected"}`);
        return ok;
      }
      if (process.env.NODE_ENV === "development") {
        if (codeStr === "123456") return true;
        const devOtp = devOtpStore.get(phone);
        if (devOtp && devOtp.code === codeStr && !devOtp.isUsed && devOtp.expiresAt > /* @__PURE__ */ new Date()) {
          devOtp.isUsed = true;
          return true;
        }
        return false;
      }
      const claimed = await db.update(otpCodes).set({ isUsed: true }).where(
        and(
          eq(otpCodes.phone, phone),
          eq(otpCodes.code, codeStr),
          eq(otpCodes.isUsed, false),
          gt(otpCodes.expiresAt, /* @__PURE__ */ new Date())
        )
      ).returning({ id: otpCodes.id });
      if (claimed.length > 0) {
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

// server/adminRoutes.ts
init_db();
init_schema();
import { Router as Router2 } from "express";
import { count, eq as eq5, sql as sql2, desc as desc2, sum, and as and4, inArray as inArray3, or as or2 } from "drizzle-orm";

// server/services/billingService.ts
init_db();

// server/services/ops.ts
var WEBHOOK = () => process.env.ALERT_WEBHOOK?.trim() || "";
var Ops = {
  login: "\u{1F464}",
  signup: "\u{1F195}",
  order: "\u{1F95B}",
  delivered: "\u2705",
  money: "\u{1F4B0}",
  bill: "\u{1F9FE}",
  household: "\u{1F3E0}",
  problem: "\u26A0\uFE0F",
  kyc: "\u{1FAAA}"
};
var SPACING_MS = 1200;
var DEDUP_MS = 1e4;
var MAX_QUEUE = 25;
var queue = [];
var recent = /* @__PURE__ */ new Map();
var draining = false;
var dropped = 0;
function alreadySaidRecently(text2) {
  const now = Date.now();
  for (const [k, at] of recent) if (now - at > DEDUP_MS) recent.delete(k);
  if (recent.has(text2)) return true;
  recent.set(text2, now);
  return false;
}
async function send(text2) {
  const hook = WEBHOOK();
  if (!hook) return;
  try {
    const isTelegram = hook.includes("api.telegram.org");
    const res = isTelegram ? await fetch(telegramUrl(hook, text2), { signal: AbortSignal.timeout(8e3) }) : await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text2, content: text2 }),
      signal: AbortSignal.timeout(8e3)
    });
    if (!res.ok) console.warn(`[ops] webhook returned ${res.status}`);
  } catch (err) {
    console.warn("[ops] could not send:", err);
  }
}
async function drain() {
  if (draining) return;
  draining = true;
  try {
    while (queue.length > 0) {
      const text2 = queue.shift();
      await send(text2);
      if (queue.length > 0) await new Promise((r) => setTimeout(r, SPACING_MS));
    }
    if (dropped > 0) {
      const n = dropped;
      dropped = 0;
      await send(`\u2026 and ${n} more event(s) in that burst`);
    }
  } finally {
    draining = false;
  }
}
function telegramUrl(base, text2) {
  let url = base.replace(/text=$/, "").replace(/[?&]$/, "");
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}text=${encodeURIComponent(text2)}`;
}
function notifyOps(kind, message) {
  if (!WEBHOOK()) return;
  const text2 = `${Ops[kind]} ${message}`;
  if (alreadySaidRecently(text2)) return;
  if (queue.length >= MAX_QUEUE) {
    dropped += 1;
    return;
  }
  queue.push(text2);
  void drain();
}
function rs(amount) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount ?? 0;
  return `Rs ${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
}

// server/services/billingService.ts
init_schema();
import { eq as eq3, and as and2, inArray, isNull } from "drizzle-orm";

// server/services/platformFees.ts
init_db();
init_schema();
import { eq as eq2 } from "drizzle-orm";
var FEE_KEY = "customer_fee_percent";
var DEFAULT_FEE_PERCENT = 1;
var COMMISSION_KEY = "vendor_commission_percent";
var DEFAULT_COMMISSION_PERCENT = 0.5;
var cache = /* @__PURE__ */ new Map();
var CACHE_MS = 6e4;
async function rate(key, fallback) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.readAt < CACHE_MS) return hit.percent;
  let percent = fallback;
  try {
    const [row] = await db.select({ value: appConfig.value }).from(appConfig).where(eq2(appConfig.key, key)).limit(1);
    const parsed = parseFloat(row?.value ?? "");
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
      percent = parsed;
    } else if (row) {
      console.warn(`[Fees] ${key} is "${row.value}" \u2014 not a usable rate, using ${fallback}%`);
    }
  } catch (err) {
    console.error(`[Fees] Could not read ${key}, using default:`, err);
  }
  cache.set(key, { percent, readAt: Date.now() });
  return percent;
}
async function customerFeePercent() {
  return rate(FEE_KEY, DEFAULT_FEE_PERCENT);
}
async function vendorCommissionPercent() {
  return rate(COMMISSION_KEY, DEFAULT_COMMISSION_PERCENT);
}
function money(n) {
  return (Math.round(n * 100) / 100).toFixed(2);
}
function splitBill(subtotal, feePercent, commissionPercent) {
  const customerFeeAmount = subtotal * feePercent / 100;
  const vendorCommissionAmount = subtotal * commissionPercent / 100;
  return {
    subtotal: money(subtotal),
    customerFeePercent: money(feePercent),
    customerFeeAmount: money(customerFeeAmount),
    vendorCommissionPercent: money(commissionPercent),
    vendorCommissionAmount: money(vendorCommissionAmount),
    totalAmount: money(subtotal + customerFeeAmount),
    // what the customer owes
    milkmanPayout: money(subtotal - vendorCommissionAmount)
    // what he keeps
  };
}

// server/services/billingService.ts
function currentMonthKey() {
  const now = /* @__PURE__ */ new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
var BillingService = class {
  // Aggregate every member's order messages for a household group into ONE
  // combined bill (familyChatId set, customerId null). Any member may pay it.
  // Returns the pending group bill (existing or freshly created), or null if
  // there is nothing to bill.
  static async generateGroupBill(familyChatId) {
    const [group] = await db.select().from(familyChats).where(eq3(familyChats.id, familyChatId)).limit(1);
    if (!group) return null;
    const milkmanId = group.milkmanId;
    const members = await db.select().from(familyChatMembers).where(eq3(familyChatMembers.chatId, familyChatId));
    const memberUserIds = members.map((m) => m.userId);
    if (memberUserIds.length === 0) return null;
    const memberCustomers = await db.select().from(customers).where(inArray(customers.userId, memberUserIds));
    const customerIds = memberCustomers.map((c) => c.id);
    if (customerIds.length === 0) return null;
    const orderMessages = await db.select().from(chatMessages).where(
      and2(
        eq3(chatMessages.milkmanId, milkmanId),
        eq3(chatMessages.messageType, "order"),
        isNull(chatMessages.billId)
      )
    );
    let total = 0;
    const items = [];
    const billedMsgIds = [];
    for (const msg of orderMessages) {
      const belongs = msg.familyChatId === familyChatId || msg.customerId != null && customerIds.includes(msg.customerId);
      if (!belongs) continue;
      const amount = msg.orderTotal ? parseFloat(msg.orderTotal) : 0;
      total += amount;
      billedMsgIds.push(msg.id);
      const oi = Array.isArray(msg.orderItems) ? msg.orderItems : [];
      const qty = parseFloat(msg.orderQuantity?.toString() || "0") || oi.reduce((s, it) => s + (parseFloat(it.quantity) || 0), 0);
      const orderedOn = msg.createdAt ?? /* @__PURE__ */ new Date();
      if (oi.length > 0) {
        for (const line of oi) {
          const lineQty = parseFloat(String(line.quantity ?? "0")) || 0;
          const linePrice = parseFloat(String(line.price ?? "0")) || 0;
          const lineAmount = linePrice > 0 ? lineQty * linePrice : 0;
          items.push({
            date: orderedOn,
            product: line.product || line.name || "Order",
            quantity: lineQty,
            price: linePrice || (lineQty > 0 ? amount / qty : amount),
            amount: lineAmount || (qty > 0 ? amount * lineQty / qty : amount),
            customerId: msg.customerId
          });
        }
      } else {
        items.push({
          date: orderedOn,
          product: msg.orderProduct || "Order",
          quantity: qty,
          price: qty > 0 ? amount / qty : amount,
          amount,
          customerId: msg.customerId
        });
      }
    }
    const currentMonth = currentMonthKey();
    const existing = await db.select().from(bills).where(
      and2(
        eq3(bills.familyChatId, familyChatId),
        eq3(bills.billMonth, currentMonth),
        eq3(bills.status, "pending")
      )
    );
    if (existing.length > 0) {
      if (items.length === 0) return existing[0];
      const ex = existing[0];
      const prevItems = Array.isArray(ex.items) ? ex.items : [];
      const newItems = [...prevItems, ...items];
      const newSubtotal = (parseFloat(ex.subtotal ?? ex.totalAmount) || 0) + total;
      const split2 = splitBill(
        newSubtotal,
        // The rates this bill was raised under, not today's. A bill the
        // customer has already been shown must not change amount because
        // a rate moved after it was issued.
        parseFloat(ex.customerFeePercent ?? "0") || 0,
        parseFloat(ex.vendorCommissionPercent ?? "0") || 0
      );
      const [updated] = await db.update(bills).set({
        subtotal: split2.subtotal,
        customerFeeAmount: split2.customerFeeAmount,
        vendorCommissionAmount: split2.vendorCommissionAmount,
        totalAmount: split2.totalAmount,
        totalOrders: newItems.length,
        items: newItems,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq3(bills.id, ex.id)).returning();
      if (billedMsgIds.length > 0) {
        await db.update(chatMessages).set({ billId: ex.id }).where(inArray(chatMessages.id, billedMsgIds));
      }
      return updated;
    }
    if (total <= 0 || items.length === 0) return null;
    const feePercent = await customerFeePercent();
    const [milkmanForRates] = await db.select({ commission: milkmen.commissionPercentage }).from(milkmen).where(eq3(milkmen.id, milkmanId)).limit(1);
    const override = milkmanForRates?.commission;
    const commissionPercent = override != null && override !== "" ? parseFloat(override) || 0 : await vendorCommissionPercent();
    const split = splitBill(total, feePercent, commissionPercent);
    const [newBill] = await db.insert(bills).values({
      familyChatId,
      milkmanId,
      billMonth: currentMonth,
      subtotal: split.subtotal,
      customerFeePercent: split.customerFeePercent,
      customerFeeAmount: split.customerFeeAmount,
      vendorCommissionPercent: split.vendorCommissionPercent,
      vendorCommissionAmount: split.vendorCommissionAmount,
      totalAmount: split.totalAmount,
      totalOrders: items.length,
      items,
      status: "pending",
      dueDate: new Date((/* @__PURE__ */ new Date()).setDate((/* @__PURE__ */ new Date()).getDate() + 7))
    }).returning();
    if (billedMsgIds.length > 0) {
      await db.update(chatMessages).set({ billId: newBill.id }).where(inArray(chatMessages.id, billedMsgIds));
    }
    const [milkmanData] = await db.select().from(milkmen).where(eq3(milkmen.id, milkmanId)).limit(1);
    const dueDate = new Date((/* @__PURE__ */ new Date()).setDate((/* @__PURE__ */ new Date()).getDate() + 7));
    for (const memberCustomer of memberCustomers) {
      await db.insert(chatMessages).values({
        milkmanId,
        customerId: memberCustomer.id,
        familyChatId,
        senderId: milkmanData?.userId || "system",
        senderType: "milkman",
        // The platform fee is shown on its own line, and only when one
        // was actually charged. Clause 8.7 of the customer terms is a
        // promise that it appears separately before payment — a bill
        // that folded it into the total would put us in breach of our
        // own terms.
        message: `\u{1F4C4} Bill Generated for ${currentMonth}
Milk & products: \u20B9${split.subtotal}
` + (parseFloat(split.customerFeeAmount) > 0 ? `Platform fee (${split.customerFeePercent}%): \u20B9${split.customerFeeAmount}
` : "") + `Total Amount: \u20B9${split.totalAmount}
Due Date: ${dueDate.toLocaleDateString()}`,
        messageType: "bill",
        orderTotal: split.totalAmount,
        billId: newBill.id
      });
    }
    return newBill;
  }
  /**
   * Bill every household, once.
   *
   * This used to iterate milkmen and call generateMonthlyBill, which grouped
   * by customerId — so a family of three received three bills, while the
   * household bill was only ever produced on demand by
   * GET /api/groups/:id/bill. Both paths claim orders via `billId IS NULL`,
   * so whichever ran first won and the other came back empty.
   *
   * One path now: one household, one bill. Every assigned customer has a
   * household (see docs/HOUSEHOLD_MODEL.md), so nobody is missed.
   */
  /** Bill every household belonging to one milkman. */
  static async generateBillsForMilkman(milkmanId) {
    const households = await db.select({ id: familyChats.id }).from(familyChats).where(and2(eq3(familyChats.milkmanId, milkmanId), eq3(familyChats.isActive, true)));
    let billed = 0;
    for (const household of households) {
      try {
        if (await this.generateGroupBill(household.id)) billed++;
      } catch (err) {
        console.error(`Failed to bill household ${household.id}`, err);
      }
    }
    return billed;
  }
  static async generateAllMonthlyBills() {
    try {
      const households = await db.select({ id: familyChats.id, name: familyChats.chatName }).from(familyChats).where(eq3(familyChats.isActive, true));
      console.log(`Starting monthly billing for ${households.length} household(s)...`);
      let billed = 0;
      for (const household of households) {
        try {
          const bill = await this.generateGroupBill(household.id);
          if (bill) {
            billed++;
            console.log(`Billed household ${household.id} (${household.name})`);
          }
        } catch (err) {
          console.error(`Failed to bill household ${household.id}`, err);
        }
      }
      console.log(`Monthly billing completed: ${billed} bill(s) across ${households.length} household(s).`);
      notifyOps(
        "bill",
        `Monthly billing run: ${billed} bill(s) from ${households.length} household(s)`
      );
    } catch (error) {
      console.error("Critical error in generateAllMonthlyBills:", error);
    }
  }
};

// server/adRoutes.ts
init_db();
init_schema();
import { Router } from "express";
import multer from "multer";
import { getStorage } from "firebase-admin/storage";
import { and as and3, desc, eq as eq4, gte, inArray as inArray2, lte, sql } from "drizzle-orm";

// server/services/fcmService.ts
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import path from "path";
import fs from "fs";
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
    const serviceAccountPath = path.resolve(process.cwd(), "firebase-service-account.json");
    if (fs.existsSync(serviceAccountPath)) {
      const raw = fs.readFileSync(serviceAccountPath, "utf-8");
      serviceAccount = JSON.parse(raw);
      console.log("[FCM] Loading credentials from firebase-service-account.json file.");
    }
  }
  if (serviceAccount) {
    if (getApps().length === 0) {
      initializeApp({ credential: cert(serviceAccount) });
    }
    isFcmInitialized = true;
    console.log("[FCM] Firebase Admin initialized successfully for project:", serviceAccount.project_id);
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
    const response = await getMessaging().send(message);
    console.log(`[FCM] Successfully sent message to ${token.substring(0, 10)}... Response:`, response);
    return true;
  } catch (error) {
    console.error(`[FCM] Error sending message to ${token.substring(0, 10)}... :`, error);
    return false;
  }
}

// server/services/firebaseStorage.ts
var STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || "dooodhwala-7dce6.firebasestorage.app";

// server/adRoutes.ts
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024 }
});
var IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"];
var VIDEO = ["video/mp4", "video/webm", "video/quicktime"];
var POSITIONS = ["top", "bottom", "inline"];
var AUDIENCES = ["all", "customers", "milkmen"];
var adminAdRouter = Router();
adminAdRouter.post("/media", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const mime = req.file.mimetype;
    if (![...IMAGE, ...VIDEO].includes(mime)) {
      return res.status(400).json({ message: `Unsupported file type: ${mime}` });
    }
    const ext = mime.split("/")[1].replace("quicktime", "mov");
    const path4 = `ads/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const bucket = getStorage().bucket(STORAGE_BUCKET);
    const fileRef = bucket.file(path4);
    await fileRef.save(req.file.buffer, { metadata: { contentType: mime } });
    const [url] = await fileRef.getSignedUrl({ action: "read", expires: "03-09-2491" });
    res.json({ url, kind: VIDEO.includes(mime) ? "video" : "image" });
  } catch (error) {
    console.error("Ad media upload failed:", error);
    res.status(500).json({ message: "Could not upload the file" });
  }
});
adminAdRouter.get("/", async (_req, res) => {
  try {
    res.json(await db.select().from(ads).orderBy(desc(ads.createdAt)));
  } catch (error) {
    console.error("List ads error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
adminAdRouter.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      imageUrl,
      ctaText,
      ctaUrl,
      advertiserName,
      advertiserEmail,
      position,
      targetAudience,
      startDate,
      endDate,
      priority
    } = req.body;
    if (!title || !advertiserName || !startDate || !endDate) {
      return res.status(400).json({
        message: "Title, advertiser and both dates are required"
      });
    }
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: "The end date must be after the start date" });
    }
    if (position && !POSITIONS.includes(position)) {
      return res.status(400).json({ message: "Unknown position" });
    }
    if (targetAudience && !AUDIENCES.includes(targetAudience)) {
      return res.status(400).json({ message: "Unknown audience" });
    }
    const [created] = await db.insert(ads).values({
      title,
      description: description || "",
      imageUrl: imageUrl || null,
      ctaText: ctaText || "Learn more",
      ctaUrl: ctaUrl || "",
      advertiserName,
      advertiserEmail: advertiserEmail || null,
      adType: "banner",
      position: position || "bottom",
      targetAudience: targetAudience || "all",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      priority: Number(priority) || 1,
      isActive: true
    }).returning();
    res.json(created);
  } catch (error) {
    console.error("Create ad error:", error);
    res.status(500).json({ message: "Could not create the ad" });
  }
});
adminAdRouter.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ad ID" });
    const allowed = [
      "title",
      "description",
      "imageUrl",
      "ctaText",
      "ctaUrl",
      "advertiserName",
      "advertiserEmail",
      "position",
      "targetAudience",
      "priority",
      "isActive"
    ];
    const patch = { updatedAt: /* @__PURE__ */ new Date() };
    for (const key of allowed) {
      if (req.body[key] !== void 0) patch[key] = req.body[key];
    }
    if (req.body.startDate) patch.startDate = new Date(req.body.startDate);
    if (req.body.endDate) patch.endDate = new Date(req.body.endDate);
    const [updated] = await db.update(ads).set(patch).where(eq4(ads.id, id)).returning();
    if (!updated) return res.status(404).json({ message: "Ad not found" });
    res.json(updated);
  } catch (error) {
    console.error("Update ad error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
adminAdRouter.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ad ID" });
    await db.delete(adTracking).where(eq4(adTracking.adId, id));
    await db.delete(ads).where(eq4(ads.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Delete ad error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
var router = Router();
router.get("/active", async (req, res) => {
  try {
    const audience = req.user?.userType === "milkman" ? "milkmen" : "customers";
    const now = /* @__PURE__ */ new Date();
    const live = await db.select().from(ads).where(and3(
      eq4(ads.isActive, true),
      lte(ads.startDate, now),
      gte(ads.endDate, now),
      inArray2(ads.targetAudience, ["all", audience])
    )).orderBy(desc(ads.priority), desc(ads.createdAt));
    res.json(live);
  } catch (error) {
    console.error("Active ads error:", error);
    res.json([]);
  }
});
router.post("/:id/track", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const event = String(req.body?.event || "");
    if (isNaN(id) || !["impression", "click", "dismiss"].includes(event)) {
      return res.status(400).json({ message: "Invalid tracking event" });
    }
    if (event === "impression") {
      await db.update(ads).set({ impressions: sql`${ads.impressions} + 1` }).where(eq4(ads.id, id));
    } else if (event === "click") {
      await db.update(ads).set({ clicks: sql`${ads.clicks} + 1` }).where(eq4(ads.id, id));
    }
    await db.insert(adTracking).values({
      adId: id,
      userId: req.user?.id ?? null,
      event,
      timestamp: /* @__PURE__ */ new Date(),
      deviceType: "mobile"
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Ad tracking error:", error);
    res.json({ success: false });
  }
});
var adRoutes_default = router;

// server/adminRoutes.ts
var router2 = Router2();
router2.use("/ads", adminAdRouter);
router2.get("/stats", async (req, res) => {
  try {
    const [{ count: totalUsers }] = await db.select({ count: count() }).from(users);
    const [{ count: totalMilkmen }] = await db.select({ count: count() }).from(milkmen);
    const [{ count: totalOrders }] = await db.select({ count: count() }).from(orders);
    const [{ totalRevenue }] = await db.select({ totalRevenue: sum(payments.amount) }).from(payments).where(eq5(payments.status, "completed"));
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
router2.get("/users", async (req, res) => {
  try {
    const allUsers = await db.select().from(users).orderBy(desc2(users.createdAt));
    const custRows = await db.select({ userId: customers.userId, name: customers.name }).from(customers);
    const milkRows = await db.select({ userId: milkmen.userId, id: milkmen.id, name: milkmen.contactName }).from(milkmen);
    const nameByUser = /* @__PURE__ */ new Map();
    const milkmanIdByUser = /* @__PURE__ */ new Map();
    for (const c of custRows) if (c.userId && c.name) nameByUser.set(c.userId, c.name);
    for (const m of milkRows) {
      if (m.userId && m.name) nameByUser.set(m.userId, m.name);
      if (m.userId) milkmanIdByUser.set(m.userId, m.id);
    }
    const enriched = allUsers.map((u) => ({
      ...u,
      name: nameByUser.get(u.id) || [u.firstName, u.lastName].filter(Boolean).join(" ") || null,
      milkmanId: milkmanIdByUser.get(u.id) ?? null
    }));
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
router2.get("/customers/:userId/details", async (req, res) => {
  try {
    const userId = req.params.userId;
    const [customer] = await db.select().from(customers).where(eq5(customers.userId, userId)).limit(1);
    if (!customer) return res.status(404).json({ success: false, message: "Customer profile not found" });
    let assignedMilkman = null;
    if (customer.assignedMilkmanId) {
      [assignedMilkman] = await db.select().from(milkmen).where(eq5(milkmen.id, customer.assignedMilkmanId)).limit(1);
    }
    const [{ c: chatOrders }] = await db.select({ c: count() }).from(chatMessages).where(and4(eq5(chatMessages.customerId, customer.id), eq5(chatMessages.messageType, "order")));
    const [{ c: tableOrders }] = await db.select({ c: count() }).from(orders).where(eq5(orders.customerId, customer.id));
    res.json({
      customer,
      assignedMilkman,
      totalOrders: Number(chatOrders || 0) + Number(tableOrders || 0)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
router2.get("/milkmen/:id/details", async (req, res) => {
  try {
    const milkmanId = parseInt(req.params.id);
    const [milkman] = await db.select().from(milkmen).where(eq5(milkmen.id, milkmanId)).limit(1);
    if (!milkman) return res.status(404).json({ success: false, message: "Milkman not found" });
    const [{ c: totalCustomers }] = await db.select({ c: count() }).from(customers).where(eq5(customers.assignedMilkmanId, milkmanId));
    const [{ c: totalGroups }] = await db.select({ c: count() }).from(familyChats).where(and4(eq5(familyChats.milkmanId, milkmanId), eq5(familyChats.isActive, true)));
    res.json({
      milkman,
      // includes bank details + full profile
      totalCustomers: Number(totalCustomers || 0),
      totalGroups: Number(totalGroups || 0)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
async function deleteUserAndData(userId) {
  const [user] = await db.select().from(users).where(eq5(users.id, userId)).limit(1);
  if (!user) return false;
  const custRows = await db.select({ id: customers.id }).from(customers).where(eq5(customers.userId, userId));
  const milkRows = await db.select({ id: milkmen.id }).from(milkmen).where(eq5(milkmen.userId, userId));
  const custIds = custRows.map((c) => c.id);
  const milkIds = milkRows.map((m) => m.id);
  const byCustOrMilk = (custCol, milkCol) => {
    const conds = [];
    if (custIds.length) conds.push(inArray3(custCol, custIds));
    if (milkIds.length) conds.push(inArray3(milkCol, milkIds));
    return conds.length ? or2(...conds) : null;
  };
  await db.delete(chatMessages).where(
    or2(
      eq5(chatMessages.senderId, userId),
      ...custIds.length ? [inArray3(chatMessages.customerId, custIds)] : [],
      ...milkIds.length ? [inArray3(chatMessages.milkmanId, milkIds)] : []
    )
  );
  const srWhere = byCustOrMilk(serviceRequests.customerId, serviceRequests.milkmanId);
  if (srWhere) await db.delete(serviceRequests).where(srWhere);
  const revWhere = byCustOrMilk(reviews.customerId, reviews.milkmanId);
  if (revWhere) await db.delete(reviews).where(revWhere);
  const cpWhere = byCustOrMilk(customerPricings.customerId, customerPricings.milkmanId);
  if (cpWhere) await db.delete(customerPricings).where(cpWhere);
  await db.delete(orders).where(
    or2(
      eq5(orders.orderedBy, userId),
      ...custIds.length ? [inArray3(orders.customerId, custIds)] : [],
      ...milkIds.length ? [inArray3(orders.milkmanId, milkIds)] : []
    )
  );
  await db.delete(payments).where(
    or2(
      eq5(payments.userId, userId),
      ...custIds.length ? [inArray3(payments.customerId, custIds)] : [],
      ...milkIds.length ? [inArray3(payments.milkmanId, milkIds)] : []
    )
  );
  const billWhere = byCustOrMilk(bills.customerId, bills.milkmanId);
  if (billWhere) await db.delete(bills).where(billWhere);
  await db.update(bills).set({ paidBy: null }).where(eq5(bills.paidBy, userId));
  if (milkIds.length) await db.delete(products).where(inArray3(products.milkmanId, milkIds));
  const subWhere = byCustOrMilk(subscriptions.customerId, subscriptions.milkmanId);
  if (subWhere) await db.delete(subscriptions).where(subWhere);
  await db.delete(adTracking).where(eq5(adTracking.userId, userId));
  await db.delete(locations).where(
    or2(
      eq5(locations.userId, userId),
      ...milkIds.length ? [inArray3(locations.milkmanId, milkIds)] : []
    )
  );
  await db.delete(notifications).where(eq5(notifications.userId, userId));
  await db.delete(termsAcceptances).where(eq5(termsAcceptances.userId, userId));
  const chatRows = await db.select({ id: familyChats.id }).from(familyChats).where(or2(
    eq5(familyChats.createdBy, userId),
    ...milkIds.length ? [inArray3(familyChats.milkmanId, milkIds)] : []
  ));
  const chatIds = chatRows.map((c) => c.id);
  await db.delete(familyChatMembers).where(or2(
    eq5(familyChatMembers.userId, userId),
    ...chatIds.length ? [inArray3(familyChatMembers.chatId, chatIds)] : []
  ));
  if (chatIds.length) await db.delete(familyChats).where(inArray3(familyChats.id, chatIds));
  if (milkIds.length) {
    await db.update(customers).set({ assignedMilkmanId: null }).where(inArray3(customers.assignedMilkmanId, milkIds));
  }
  if (custIds.length) await db.delete(customers).where(eq5(customers.userId, userId));
  if (milkIds.length) await db.delete(milkmen).where(eq5(milkmen.userId, userId));
  await db.delete(users).where(eq5(users.id, userId));
  return true;
}
router2.delete("/users/:id", async (req, res) => {
  try {
    const ok = await deleteUserAndData(req.params.id);
    if (!ok) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "User and all related data deleted" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, message: "Failed to delete user", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
router2.get("/milkmen", async (req, res) => {
  try {
    const allMilkmen = await db.select().from(milkmen).orderBy(desc2(milkmen.createdAt));
    res.json(allMilkmen);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
router2.get("/orders", async (req, res) => {
  try {
    const allOrders = await db.select().from(orders).orderBy(desc2(orders.createdAt)).limit(100);
    res.json(allOrders);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
router2.get("/payments", async (req, res) => {
  try {
    const allPayments = await db.select().from(payments).orderBy(desc2(payments.createdAt)).limit(100);
    res.json(allPayments);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
router2.patch("/milkmen/:id/verify", async (req, res) => {
  try {
    const milkmanId = parseInt(req.params.id);
    const { verified } = req.body;
    const [updatedMilkman] = await db.update(milkmen).set({ verified, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(milkmen.id, milkmanId)).returning();
    if (!updatedMilkman) return res.status(404).json({ success: false, message: "Milkman not found" });
    res.json({ success: true, milkman: updatedMilkman });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
router2.patch("/orders/:id/status", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;
    const [updatedOrder] = await db.update(orders).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(eq5(orders.id, orderId)).returning();
    if (!updatedOrder) return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
router2.post("/generate-monthly-bills", async (req, res) => {
  try {
    await BillingService.generateAllMonthlyBills();
    const generatedBills = await db.select().from(bills).orderBy(desc2(bills.createdAt)).limit(50);
    res.json({ success: true, bills: generatedBills });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
router2.get("/earnings", async (req, res) => {
  try {
    const earningsData = await db.select({
      milkmanId: milkmen.id,
      businessName: milkmen.businessName,
      contactName: milkmen.contactName,
      commissionPercentage: milkmen.commissionPercentage,
      billedSubtotal: sql2`COALESCE(SUM(${bills.subtotal}), 0)`,
      customerFees: sql2`COALESCE(SUM(${bills.customerFeeAmount}), 0)`,
      vendorCommission: sql2`COALESCE(SUM(${bills.vendorCommissionAmount}), 0)`,
      billCount: sql2`COUNT(${bills.id})`
    }).from(milkmen).leftJoin(bills, eq5(milkmen.id, bills.milkmanId)).groupBy(milkmen.id, milkmen.businessName, milkmen.contactName, milkmen.commissionPercentage);
    const formattedEarnings = earningsData.map((item) => {
      const billedSubtotal = parseFloat(item.billedSubtotal || "0");
      const customerFees = parseFloat(item.customerFees || "0");
      const vendorCommission = parseFloat(item.vendorCommission || "0");
      return {
        ...item,
        billCount: Number(item.billCount || 0),
        billedSubtotal,
        customerFees,
        vendorCommission,
        // What this dairyman's business earned the platform, both sides.
        adminEarnings: Math.round((customerFees + vendorCommission) * 100) / 100,
        // Kept for the existing screen, which reads totalRevenue.
        totalRevenue: billedSubtotal,
        sharePercentage: parseFloat(item.commissionPercentage || "0.5")
      };
    });
    res.json(formattedEarnings);
  } catch (error) {
    console.error("Admin earnings error:", error);
    res.status(500).json({ success: false, message: "Error fetching admin earnings", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
router2.get("/milkmen/pending-commission", async (req, res) => {
  try {
    const pendingMilkmen = await db.select().from(milkmen).where(sql2`${milkmen.commissionPercentage} IS NULL`).orderBy(desc2(milkmen.createdAt));
    res.json(pendingMilkmen);
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
router2.patch("/milkmen/:id/commission", async (req, res) => {
  try {
    const milkmanId = parseInt(req.params.id);
    const { percentage } = req.body;
    if (percentage === void 0 || isNaN(parseFloat(percentage))) {
      return res.status(400).json({ success: false, message: "Valid percentage is required" });
    }
    const [updatedMilkman] = await db.update(milkmen).set({
      commissionPercentage: percentage.toString(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq5(milkmen.id, milkmanId)).returning();
    if (!updatedMilkman) return res.status(404).json({ success: false, message: "Milkman not found" });
    res.json({ success: true, milkman: updatedMilkman });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : void 0 });
  }
});
var adminRoutes_default = router2;

// server/authRoutes.ts
import { getApps as getApps2 } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
var router3 = Router3();
var JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET is required");
var SESSION_TTL = process.env.SESSION_TTL || "365d";
async function issueSessionForPhone(phone, res) {
  const normalize = (p) => (p || "").replace(/\D/g, "").slice(-10);
  const adminPhone = process.env.ADMIN_PHONE || "8087906174";
  const isAdmin = normalize(phone) === normalize(adminPhone) && normalize(phone).length === 10;
  if (isAdmin) console.log(`[Auth] Admin phone matched: ${normalize(phone)}`);
  let [user] = await db.select().from(users).where(eq6(users.phone, phone)).limit(1);
  const isNewUser = !user;
  if (!user) {
    const userId = crypto.randomUUID();
    const digits = phone.replace(/\D/g, "").slice(-6);
    const suffix = Math.random().toString(36).slice(2, 6);
    const username = `user_${digits}_${suffix}`;
    [user] = await db.insert(users).values({ id: userId, phone, username, userType: isAdmin ? "admin" : null, isVerified: true }).returning();
  } else if (isAdmin && user.userType !== "admin" || !user.isVerified) {
    [user] = await db.update(users).set({
      userType: isAdmin ? "admin" : user.userType,
      isVerified: true,
      lastActiveAt: /* @__PURE__ */ new Date()
    }).where(eq6(users.id, user.id)).returning();
  }
  notifyOps(
    isNewUser ? "signup" : "login",
    isNewUser ? `First login: ${phone}` : `Login: ${phone}${user.userType ? ` (${user.userType})` : " \u2014 still no role picked"}`
  );
  const token = jwt.sign({ id: user.id, phone: user.phone }, JWT_SECRET, { expiresIn: SESSION_TTL });
  return res.json({ success: true, message: "Login successful", accessToken: token, user });
}
router3.post("/firebase-login", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: "idToken is required" });
    if (getApps2().length === 0) {
      console.error("[Auth] Firebase Admin not initialized \u2014 check FIREBASE_SERVICE_ACCOUNT on the server.");
      return res.status(500).json({ message: "Server auth not configured (Firebase Admin not initialized)." });
    }
    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(idToken);
    } catch (err) {
      console.error("[Auth] Firebase token verify failed:", err?.code, err?.message);
      return res.status(401).json({ message: "Invalid or expired Firebase token" });
    }
    const phone = decoded.phone_number;
    if (!phone) return res.status(400).json({ message: "Token has no phone number" });
    return await issueSessionForPhone(phone, res);
  } catch (error) {
    console.error("Firebase login error:", error);
    return res.status(500).json({ message: "Server error during Firebase login" });
  }
});
var otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1e3,
  max: 5,
  message: { message: "Too many OTP requests. Please try again after 10 minutes." },
  standardHeaders: true,
  legacyHeaders: false
});
var verifyOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1e3,
  max: 5,
  keyGenerator: (req) => String(req.body?.phone || ipKeyGenerator(req.ip ?? "")),
  skipSuccessfulRequests: true,
  message: { message: "Too many incorrect OTP attempts. Please request a new code." },
  standardHeaders: true,
  legacyHeaders: false
});
router3.post("/send-otp", otpRateLimiter, async (req, res) => {
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
router3.post("/verify-otp", otpRateLimiter, verifyOtpLimiter, async (req, res) => {
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
      let [user] = await db.select().from(users).where(eq6(users.phone, phone)).limit(1);
      const normalize = (p) => (p || "").replace(/\D/g, "").slice(-10);
      const adminPhone = process.env.ADMIN_PHONE || "8087906174";
      const isAdmin = normalize(phone) === normalize(adminPhone) && normalize(phone).length === 10;
      if (isAdmin) console.log(`[Auth] Admin phone matched: ${normalize(phone)}`);
      if (!user) {
        const userId = crypto.randomUUID();
        const digits = phone.replace(/\D/g, "").slice(-6);
        const suffix = Math.random().toString(36).slice(2, 6);
        const username = `user_${digits}_${suffix}`;
        [user] = await db.insert(users).values({
          id: userId,
          phone,
          username,
          userType: isAdmin ? "admin" : null
        }).returning();
      } else if (isAdmin && user.userType !== "admin") {
        [user] = await db.update(users).set({ userType: "admin" }).where(eq6(users.id, user.id)).returning();
      }
      const token = jwt.sign({ id: user.id, phone: user.phone }, JWT_SECRET, {
        expiresIn: SESSION_TTL
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
router3.get("/terms-status", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    const role = String(req.query.role || "");
    if (!isTermsRole(role)) {
      return res.status(400).json({ message: "role must be customer or milkman" });
    }
    const version = currentTermsVersion(role);
    const [row] = await db.select({ id: termsAcceptances.id, acceptedAt: termsAcceptances.acceptedAt }).from(termsAcceptances).where(and5(
      eq6(termsAcceptances.userId, decoded.id),
      eq6(termsAcceptances.role, role),
      eq6(termsAcceptances.version, version)
    )).limit(1);
    res.json({ accepted: !!row, version, acceptedAt: row?.acceptedAt ?? null });
  } catch (error) {
    console.error("Terms status error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router3.put("/user-type", async (req, res) => {
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
    const { userType, termsVersion } = req.body;
    if (!isTermsRole(userType)) {
      return res.status(400).json({ message: "Invalid user type" });
    }
    const expectedVersion = currentTermsVersion(userType);
    if (termsVersion !== expectedVersion) {
      return res.status(409).json({
        message: "Terms version out of date. Please review the latest terms.",
        expectedVersion
      });
    }
    const updatedUser = await db.transaction(async (tx) => {
      const [user] = await tx.update(users).set({ userType, updatedAt: /* @__PURE__ */ new Date() }).where(eq6(users.id, decoded.id)).returning();
      if (!user) return null;
      await tx.insert(termsAcceptances).values({
        userId: user.id,
        role: userType,
        version: expectedVersion,
        ipAddress: req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress || null,
        userAgent: req.headers["user-agent"] || null
      });
      return user;
    });
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    notifyOps("signup", `New ${userType}: ${updatedUser.username || updatedUser.phone || updatedUser.id}`);
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Update user type error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router3.get("/user", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const [user] = await db.select().from(users).where(eq6(users.id, decoded.id)).limit(1);
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
router3.post("/profile", async (req, res) => {
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
    const [updatedUser] = await db.update(users).set(updateData).where(eq6(users.id, userId)).returning();
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router3.delete("/account", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token provided" });
    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }
    const ok = await deleteUserAndData(decoded.id);
    if (!ok) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, message: "Your account and all related data have been deleted." });
  } catch (error) {
    console.error("Account deletion error:", error);
    res.status(500).json({ success: false, message: "Failed to delete account" });
  }
});
router3.post("/logout", (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});
var authRoutes_default = router3;

// server/customerRoutes.ts
init_db();
init_schema();
import { Router as Router4 } from "express";
import { eq as eq10, and as and8, desc as desc3, or as or3, inArray as inArray5 } from "drizzle-orm";
init_households();

// server/services/access.ts
init_db();
init_schema();
import { eq as eq8 } from "drizzle-orm";
async function callerIdentities(req) {
  const userId = req.user?.id;
  if (!userId) return { milkmanId: null, customerId: null, isAdmin: false };
  const [milkmanRows, customerRows] = await Promise.all([
    db.select({ id: milkmen.id }).from(milkmen).where(eq8(milkmen.userId, userId)).limit(1),
    db.select({ id: customers.id }).from(customers).where(eq8(customers.userId, userId)).limit(1)
  ]);
  return {
    milkmanId: milkmanRows[0]?.id ?? null,
    customerId: customerRows[0]?.id ?? null,
    isAdmin: req.user?.userType === "admin"
  };
}
async function canAccessCustomer(req, customerId) {
  const me = await callerIdentities(req);
  if (me.isAdmin) return true;
  if (me.customerId === customerId) return true;
  if (me.milkmanId == null) return false;
  const [row] = await db.select({ assigned: customers.assignedMilkmanId }).from(customers).where(eq8(customers.id, customerId)).limit(1);
  return row?.assigned === me.milkmanId;
}
async function canTrackMilkman(req, milkmanId) {
  const me = await callerIdentities(req);
  if (me.isAdmin) return true;
  if (me.milkmanId === milkmanId) return true;
  if (me.customerId == null) return false;
  const [row] = await db.select({ assigned: customers.assignedMilkmanId }).from(customers).where(eq8(customers.id, me.customerId)).limit(1);
  return row?.assigned === milkmanId;
}
async function isSelfMilkman(req, milkmanId) {
  const me = await callerIdentities(req);
  return me.isAdmin || me.milkmanId === milkmanId;
}
async function isPartyToChat(req, milkmanId, customerId) {
  const me = await callerIdentities(req);
  if (me.isAdmin) return true;
  return me.milkmanId === milkmanId || me.customerId === customerId;
}

// server/services/dairymen.ts
init_db();
init_schema();
init_households();
import { and as and7, eq as eq9, ne } from "drizzle-orm";
async function listDairymen(customerId) {
  const rows = await db.select({
    linkId: customerMilkmen.id,
    milkmanId: customerMilkmen.milkmanId,
    isPrimary: customerMilkmen.isPrimary,
    since: customerMilkmen.createdAt,
    businessName: milkmen.businessName,
    contactName: milkmen.contactName,
    phone: milkmen.phone,
    address: milkmen.address,
    pricePerLiter: milkmen.pricePerLiter,
    deliveryTimeStart: milkmen.deliveryTimeStart,
    deliveryTimeEnd: milkmen.deliveryTimeEnd
  }).from(customerMilkmen).innerJoin(milkmen, eq9(customerMilkmen.milkmanId, milkmen.id)).where(and7(eq9(customerMilkmen.customerId, customerId), eq9(customerMilkmen.isActive, true)));
  return rows.sort((a, b) => {
    const ta = a.since ? new Date(a.since).getTime() : 0;
    const tb = b.since ? new Date(b.since).getTime() : 0;
    return ta - tb;
  });
}
async function addDairyman(customerId, milkmanId) {
  const [existing] = await db.select().from(customerMilkmen).where(and7(
    eq9(customerMilkmen.customerId, customerId),
    eq9(customerMilkmen.milkmanId, milkmanId)
  )).limit(1);
  const [customer] = await db.select().from(customers).where(eq9(customers.id, customerId)).limit(1);
  const isFirst = !customer?.assignedMilkmanId;
  if (existing) {
    if (!existing.isActive) {
      await db.update(customerMilkmen).set({ isActive: true }).where(eq9(customerMilkmen.id, existing.id));
    }
  } else {
    await db.insert(customerMilkmen).values({
      customerId,
      milkmanId,
      isPrimary: isFirst,
      isActive: true
    });
  }
  if (isFirst) {
    await db.update(customers).set({ assignedMilkmanId: milkmanId, updatedAt: /* @__PURE__ */ new Date() }).where(eq9(customers.id, customerId));
  }
  await ensureHouseholdChat(customerId, milkmanId);
}
async function removeDairyman(customerId, milkmanId) {
  const pending = await db.select({ id: bills.id }).from(bills).where(and7(
    eq9(bills.customerId, customerId),
    eq9(bills.milkmanId, milkmanId),
    eq9(bills.status, "pending")
  ));
  if (pending.length > 0) {
    return "Clear your pending bills with this dairyman first.";
  }
  await db.update(customerMilkmen).set({ isActive: false, isPrimary: false }).where(and7(
    eq9(customerMilkmen.customerId, customerId),
    eq9(customerMilkmen.milkmanId, milkmanId)
  ));
  const [customer] = await db.select().from(customers).where(eq9(customers.id, customerId)).limit(1);
  if (customer?.assignedMilkmanId === milkmanId) {
    const [next] = await db.select({ milkmanId: customerMilkmen.milkmanId, id: customerMilkmen.id }).from(customerMilkmen).where(and7(
      eq9(customerMilkmen.customerId, customerId),
      eq9(customerMilkmen.isActive, true),
      ne(customerMilkmen.milkmanId, milkmanId)
    )).limit(1);
    await db.update(customers).set({ assignedMilkmanId: next?.milkmanId ?? null, updatedAt: /* @__PURE__ */ new Date() }).where(eq9(customers.id, customerId));
    if (next) {
      await db.update(customerMilkmen).set({ isPrimary: true }).where(eq9(customerMilkmen.id, next.id));
    }
  }
  return null;
}

// server/customerRoutes.ts
var router4 = Router4();
router4.get("/profile", async (req, res) => {
  try {
    const userId = req.user.id;
    const [customer] = await db.select().from(customers).where(eq10(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    res.json(customer);
  } catch (error) {
    console.error("Get customer profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router4.patch("/profile", async (req, res) => {
  try {
    const userId = req.user.id;
    const phone = req.user.phone;
    const { name, email, address, latitude, longitude, settings: settings2 } = req.body;
    const [existingCustomer] = await db.select().from(customers).where(eq10(customers.userId, userId)).limit(1);
    let updatedCustomer;
    if (existingCustomer) {
      [updatedCustomer] = await db.update(customers).set({
        name,
        phone,
        address,
        settings: settings2,
        latitude: latitude?.toString(),
        longitude: longitude?.toString(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq10(customers.id, existingCustomer.id)).returning();
    } else {
      [updatedCustomer] = await db.insert(customers).values({
        userId,
        name,
        phone,
        address,
        settings: settings2,
        latitude: latitude?.toString(),
        longitude: longitude?.toString()
      }).returning();
    }
    if (email) {
      await db.update(users).set({ email }).where(eq10(users.id, userId));
    }
    await db.update(users).set({ userType: "customer" }).where(eq10(users.id, userId));
    res.json(updatedCustomer);
  } catch (error) {
    console.error("Update customer profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router4.patch("/profile/preset-order", async (req, res) => {
  try {
    const userId = req.user.id;
    const { presetOrder } = req.body;
    const [customer] = await db.select().from(customers).where(eq10(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    const [updatedCustomer] = await db.update(customers).set({
      presetOrder,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq10(customers.id, customer.id)).returning();
    res.json(updatedCustomer);
  } catch (error) {
    console.error("Update preset order error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router4.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, address, latitude, longitude } = req.body;
    const [existingCustomer] = await db.select().from(customers).where(eq10(customers.userId, userId)).limit(1);
    if (existingCustomer) {
      const [updatedCustomer] = await db.update(customers).set({
        name,
        address,
        latitude: latitude?.toString(),
        longitude: longitude?.toString(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq10(customers.id, existingCustomer.id)).returning();
      return res.json(updatedCustomer);
    }
    const [newCustomer] = await db.insert(customers).values({
      userId,
      name,
      address,
      latitude: latitude?.toString(),
      longitude: longitude?.toString()
    }).returning();
    await db.update(users).set({ userType: "customer" }).where(eq10(users.id, userId));
    res.json(newCustomer);
  } catch (error) {
    console.error("Create/Update customer error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router4.get("/dairymen", async (req, res) => {
  try {
    const me = await callerIdentities(req);
    if (me.customerId == null) return res.json([]);
    res.json(await listDairymen(me.customerId));
  } catch (error) {
    console.error("List dairymen error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router4.post("/dairymen", async (req, res) => {
  try {
    const me = await callerIdentities(req);
    if (me.customerId == null) {
      return res.status(400).json({ message: "Complete your profile first" });
    }
    const milkmanId = parseInt(req.body?.milkmanId);
    if (isNaN(milkmanId)) return res.status(400).json({ message: "milkmanId is required" });
    await addDairyman(me.customerId, milkmanId);
    res.json({ success: true, dairymen: await listDairymen(me.customerId) });
  } catch (error) {
    console.error("Add dairyman error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router4.delete("/dairymen/:milkmanId", async (req, res) => {
  try {
    const me = await callerIdentities(req);
    if (me.customerId == null) return res.status(400).json({ message: "No customer profile" });
    const milkmanId = parseInt(req.params.milkmanId);
    if (isNaN(milkmanId)) return res.status(400).json({ message: "Invalid dairyman id" });
    const refusal = await removeDairyman(me.customerId, milkmanId);
    if (refusal) return res.status(409).json({ message: refusal });
    res.json({ success: true, dairymen: await listDairymen(me.customerId) });
  } catch (error) {
    console.error("Remove dairyman error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router4.get("/group/:milkmanId", async (req, res) => {
  try {
    const milkmanId = parseInt(req.params.milkmanId);
    if (isNaN(milkmanId)) {
      return res.status(400).json({ message: "Invalid milkman ID" });
    }
    const me = await callerIdentities(req);
    const isTheMilkman = me.isAdmin || me.milkmanId === milkmanId;
    if (isTheMilkman) {
      const members2 = await db.select().from(customers).where(eq10(customers.assignedMilkmanId, milkmanId));
      return res.json(members2);
    }
    if (me.customerId == null) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const memberships = await db.select({ chatId: familyChatMembers.chatId }).from(familyChatMembers).where(eq10(familyChatMembers.userId, req.user.id));
    const chatIds = memberships.map((m) => m.chatId);
    if (chatIds.length === 0) {
      const solo = await db.select().from(customers).where(eq10(customers.id, me.customerId));
      return res.json(solo);
    }
    const householdUserIds = await db.select({ userId: familyChatMembers.userId }).from(familyChatMembers).where(inArray5(familyChatMembers.chatId, chatIds));
    const members = await db.select().from(customers).where(inArray5(customers.userId, householdUserIds.map((u) => u.userId)));
    res.json(members);
  } catch (error) {
    console.error("Get group members error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router4.get("/:id", async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    if (isNaN(customerId)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }
    if (!await canAccessCustomer(req, customerId)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const [customer] = await db.select().from(customers).where(eq10(customers.id, customerId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json(customer);
  } catch (error) {
    console.error("Get customer error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
var assignYdHandler = async (req, res) => {
  try {
    const userId = req.user.id;
    const { milkmanId } = req.body;
    if (!milkmanId) {
      return res.status(400).json({ message: "Milkman ID is required" });
    }
    const [customer] = await db.select().from(customers).where(eq10(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    await addDairyman(customer.id, milkmanId);
    const [updatedCustomer] = await db.select().from(customers).where(eq10(customers.id, customer.id)).limit(1);
    res.json({ ...updatedCustomer, dairymen: await listDairymen(customer.id) });
  } catch (error) {
    console.error("Assign milkman error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
router4.post("/assign-yd", assignYdHandler);
router4.patch("/assign-yd", assignYdHandler);
router4.post("/finalize-bill", async (req, res) => {
  try {
    const userId = req.user.id;
    const [customer] = await db.select().from(customers).where(eq10(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    if (!customer.assignedMilkmanId) {
      return res.status(400).json({ message: "No milkman assigned" });
    }
    const chatId = await ensureHouseholdChat(customer.id, customer.assignedMilkmanId);
    if (chatId) await BillingService.generateGroupBill(chatId);
    const [pendingBill] = await db.select().from(bills).where(
      and8(
        eq10(bills.milkmanId, customer.assignedMilkmanId),
        eq10(bills.status, "pending"),
        chatId ? eq10(bills.familyChatId, chatId) : eq10(bills.customerId, customer.id)
      )
    ).orderBy(desc3(bills.createdAt)).limit(1);
    if (!pendingBill || parseFloat(pendingBill.totalAmount) <= 0) {
      return res.json({ bill: null, amount: 0 });
    }
    res.json({ bill: pendingBill, amount: parseFloat(pendingBill.totalAmount) });
  } catch (error) {
    console.error("Finalize bill error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router4.post("/unassign-yd", async (req, res) => {
  try {
    const userId = req.user.id;
    const [customer] = await db.select().from(customers).where(eq10(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    if (!customer.assignedMilkmanId) {
      return res.status(400).json({ message: "No milkman assigned" });
    }
    const householdChatId = await ensureHouseholdChat(customer.id, customer.assignedMilkmanId);
    const pendingBills = await db.select().from(bills).where(
      and8(
        eq10(bills.milkmanId, customer.assignedMilkmanId),
        eq10(bills.status, "pending"),
        householdChatId ? or3(eq10(bills.customerId, customer.id), eq10(bills.familyChatId, householdChatId)) : eq10(bills.customerId, customer.id)
      )
    );
    if (pendingBills.length > 0) {
      return res.status(400).json({
        message: "Pending bills exist",
        pendingCount: pendingBills.length,
        totalAmount: pendingBills.reduce((sum2, bill) => sum2 + parseFloat(bill.totalAmount), 0)
      });
    }
    const refusal = await removeDairyman(customer.id, customer.assignedMilkmanId);
    if (refusal) return res.status(400).json({ message: refusal });
    const [updatedCustomer] = await db.select().from(customers).where(eq10(customers.id, customer.id)).limit(1);
    res.json({ ...updatedCustomer, dairymen: await listDairymen(customer.id) });
  } catch (error) {
    console.error("Unassign milkman error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
var customerRoutes_default = router4;

// server/milkmanRoutes.ts
init_db();
init_schema();
import { Router as Router5 } from "express";
import { eq as eq11, asc, and as and9, inArray as inArray6 } from "drizzle-orm";
import jwt2 from "jsonwebtoken";
import multer2 from "multer";
import { getStorage as getStorage2 } from "firebase-admin/storage";
var JWT_SECRET2 = process.env.JWT_SECRET;
if (!JWT_SECRET2) throw new Error("JWT_SECRET is required");
var router5 = Router5();
router5.get("/", async (req, res) => {
  try {
    const allMilkmen = await db.select().from(milkmen);
    res.json(allMilkmen);
  } catch (error) {
    console.error("Get milkmen error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router5.get("/customers", async (req, res) => {
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
    const [milkman] = await db.select().from(milkmen).where(eq11(milkmen.userId, userId)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    const assignedCustomers = await db.select().from(customers).where(eq11(customers.assignedMilkmanId, milkman.id)).orderBy(asc(customers.routeOrder));
    res.json(assignedCustomers);
  } catch (error) {
    console.error("Get assigned customers error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router5.get("/profile", async (req, res) => {
  try {
    const userId = req.user.id;
    const [milkman] = await db.select().from(milkmen).where(eq11(milkmen.userId, userId)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    res.json(milkman);
  } catch (error) {
    console.error("Get milkman profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
async function currentMilkman(req) {
  const [milkman] = await db.select().from(milkmen).where(eq11(milkmen.userId, req.user.id)).limit(1);
  return milkman ?? null;
}
var kycUpload = multer2({
  storage: multer2.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, /^image\/(jpe?g|png|heic|heif|webp)$/i.test(file.mimetype));
  }
});
router5.post("/pan-image", kycUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Attach a photo of your PAN card" });
    const userId = req.user.id;
    const ext = (req.file.mimetype.split("/")[1] || "jpg").replace("jpeg", "jpg");
    const path4 = `kyc/milkmen/user-${userId}/pan-${Date.now()}.${ext}`;
    await getStorage2().bucket(STORAGE_BUCKET).file(path4).save(req.file.buffer, {
      contentType: req.file.mimetype,
      resumable: false,
      metadata: { contentType: req.file.mimetype, cacheControl: "private, max-age=0" }
    });
    const milkman = await currentMilkman(req);
    if (milkman) {
      await db.update(milkmen).set({ panImageUrl: path4, verificationStatus: "pending", updatedAt: /* @__PURE__ */ new Date() }).where(eq11(milkmen.id, milkman.id));
    }
    res.json({ success: true, uploaded: true, path: path4 });
  } catch (error) {
    console.error("PAN upload error:", error);
    res.status(500).json({ message: "Could not upload the photo. Please try again." });
  }
});
function ownsPanPath(userId, path4) {
  return typeof path4 === "string" && path4.startsWith(`kyc/milkmen/user-${userId}/`);
}
router5.get("/pan-image", async (req, res) => {
  try {
    const me = await callerIdentities(req);
    const requested = req.query.milkmanId ? parseInt(req.query.milkmanId) : null;
    const targetId = me.isAdmin && requested ? requested : me.milkmanId;
    if (targetId == null) return res.status(403).json({ message: "Not authorized" });
    if (!me.isAdmin && requested != null && requested !== me.milkmanId) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const [milkman] = await db.select().from(milkmen).where(eq11(milkmen.id, targetId)).limit(1);
    if (!milkman?.panImageUrl) return res.status(404).json({ message: "No PAN photo on file" });
    const [url] = await getStorage2().bucket(STORAGE_BUCKET).file(milkman.panImageUrl).getSignedUrl({ action: "read", expires: Date.now() + 15 * 60 * 1e3 });
    res.json({ url, expiresInMinutes: 15 });
  } catch (error) {
    console.error("PAN fetch error:", error);
    res.status(500).json({ message: "Could not open the photo" });
  }
});
router5.get("/households", async (req, res) => {
  try {
    const milkman = await currentMilkman(req);
    if (!milkman) return res.status(404).json({ message: "Milkman profile not found" });
    const chats = await db.select().from(familyChats).where(and9(eq11(familyChats.milkmanId, milkman.id), eq11(familyChats.isActive, true))).orderBy(asc(familyChats.chatName));
    if (chats.length === 0) return res.json([]);
    const chatIds = chats.map((c) => c.id);
    const members = await db.select().from(familyChatMembers).where(inArray6(familyChatMembers.chatId, chatIds));
    const memberUserIds = [...new Set(members.map((m) => m.userId))];
    const memberCustomers = memberUserIds.length ? await db.select().from(customers).where(inArray6(customers.userId, memberUserIds)) : [];
    const customerByUser = new Map(memberCustomers.map((c) => [c.userId, c]));
    const households = chats.map((chat) => {
      const mine = members.filter((m) => m.chatId === chat.id);
      const primary = customerByUser.get(chat.createdBy) ?? mine.map((m) => customerByUser.get(m.userId)).find(Boolean);
      return {
        chatId: chat.id,
        name: chat.chatName,
        chatCode: chat.chatCode,
        memberCount: mine.length,
        primaryCustomerId: primary?.id ?? null,
        address: primary?.address ?? null,
        phone: primary?.phone ?? null,
        routeOrder: primary?.routeOrder ?? 0
      };
    });
    households.sort((a, b) => (a.routeOrder ?? 0) - (b.routeOrder ?? 0));
    res.json(households);
  } catch (error) {
    console.error("Get households error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router5.patch("/households/:chatId", async (req, res) => {
  try {
    const milkman = await currentMilkman(req);
    if (!milkman) return res.status(404).json({ message: "Milkman profile not found" });
    const chatId = parseInt(req.params.chatId);
    if (isNaN(chatId)) return res.status(400).json({ message: "Invalid household id" });
    const [chat] = await db.select().from(familyChats).where(eq11(familyChats.id, chatId)).limit(1);
    if (!chat || chat.milkmanId !== milkman.id) {
      return res.status(403).json({ message: "Not your household" });
    }
    const { address, routeOrder } = req.body;
    if (address === void 0 && routeOrder === void 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }
    const [primary] = await db.select().from(customers).where(eq11(customers.userId, chat.createdBy)).limit(1);
    if (!primary) {
      return res.status(404).json({ message: "Household has no primary customer" });
    }
    const update = { updatedAt: /* @__PURE__ */ new Date() };
    if (address !== void 0) update.address = String(address).trim();
    if (routeOrder !== void 0) update.routeOrder = Number(routeOrder);
    const [updated] = await db.update(customers).set(update).where(eq11(customers.id, primary.id)).returning();
    res.json({ chatId, address: updated.address, routeOrder: updated.routeOrder });
  } catch (error) {
    console.error("Update household error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router5.get("/hisaab", async (req, res) => {
  try {
    const milkman = await currentMilkman(req);
    if (!milkman) return res.status(404).json({ message: "Milkman profile not found" });
    const override = milkman.commissionPercentage;
    const commissionPercent = override != null && override !== "" ? parseFloat(override) || 0 : await vendorCommissionPercent();
    const deliveredOrders = await db.select({ totalAmount: orders.totalAmount }).from(orders).where(and9(eq11(orders.milkmanId, milkman.id), eq11(orders.status, "delivered")));
    const grossRevenue = deliveredOrders.reduce(
      (sum2, o) => sum2 + (parseFloat(o.totalAmount || "0") || 0),
      0
    );
    const commissionRows = await db.select({ amount: bills.vendorCommissionAmount }).from(bills).where(eq11(bills.milkmanId, milkman.id));
    const commissionAmount = commissionRows.reduce(
      (sum2, r) => sum2 + (parseFloat(r.amount || "0") || 0),
      0
    );
    const billRows = await db.select({
      customerId: bills.customerId,
      familyChatId: bills.familyChatId,
      customerName: customers.name,
      householdName: familyChats.chatName,
      totalAmount: bills.totalAmount,
      status: bills.status
    }).from(bills).leftJoin(customers, eq11(bills.customerId, customers.id)).leftJoin(familyChats, eq11(bills.familyChatId, familyChats.id)).where(eq11(bills.milkmanId, milkman.id));
    const byPayer = /* @__PURE__ */ new Map();
    for (const row of billRows) {
      const key = row.familyChatId != null ? `chat:${row.familyChatId}` : row.customerId != null ? `cust:${row.customerId}` : null;
      if (key == null) continue;
      const entry = byPayer.get(key) ?? {
        key,
        customerId: row.customerId ?? null,
        familyChatId: row.familyChatId ?? null,
        customerName: row.householdName || row.customerName || "Customer",
        pending: 0,
        paid: 0
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
      customerBills
    });
  } catch (error) {
    console.error("Get hisaab error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router5.get("/delivered-summary", async (req, res) => {
  try {
    const milkman = await currentMilkman(req);
    if (!milkman) return res.status(404).json({ message: "Milkman profile not found" });
    const deliveredOrders = await db.select({
      quantity: chatMessages.orderQuantity,
      totalAmount: chatMessages.orderTotal,
      items: chatMessages.orderItems,
      productName: chatMessages.orderProduct
    }).from(chatMessages).where(and9(
      eq11(chatMessages.milkmanId, milkman.id),
      eq11(chatMessages.isDelivered, true)
    ));
    const tally = /* @__PURE__ */ new Map();
    const add = (product, quantity, amount) => {
      const key = product || "Milk";
      const entry = tally.get(key) ?? { product: key, quantity: 0, amount: 0, orders: 0 };
      entry.quantity += quantity;
      entry.amount += amount;
      entry.orders += 1;
      tally.set(key, entry);
    };
    for (const order of deliveredOrders) {
      const items = Array.isArray(order.items) ? order.items : [];
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
          parseFloat(order.totalAmount || "0") || 0
        );
      }
    }
    const productTotals = [...tally.values()].sort((a, b) => b.amount - a.amount);
    res.json({
      products: productTotals,
      totalOrders: deliveredOrders.length,
      totalAmount: productTotals.reduce((sum2, p) => sum2 + p.amount, 0)
    });
  } catch (error) {
    console.error("Get delivered summary error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router5.patch("/profile", async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      businessName,
      pricePerLiter,
      deliveryTimeStart,
      deliveryTimeEnd,
      address,
      phone
    } = req.body;
    const [milkman] = await db.select().from(milkmen).where(eq11(milkmen.userId, userId)).limit(1);
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
    }).where(eq11(milkmen.id, milkman.id)).returning();
    res.json(updatedMilkman);
  } catch (error) {
    console.error("Update milkman profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router5.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const phone = req.user.phone;
    const {
      contactName,
      businessName,
      // phone, // Remove from body destructuring
      address,
      pricePerLiter,
      deliveryTimeStart,
      deliveryTimeEnd,
      dairyItems,
      deliverySlots,
      // Bank and PAN. These were sent by the setup screen and silently
      // dropped here, so a milkman could fill the whole form, save it,
      // and be bounced straight back — the navigator gates on these being
      // present, and they never were.
      bankAccountHolderName,
      bankAccountNumber,
      bankIfscCode,
      bankName,
      upiId,
      panNumber,
      panImagePath
    } = req.body;
    const [existingMilkman] = await db.select().from(milkmen).where(eq11(milkmen.userId, userId)).limit(1);
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
        // Only overwrite when a value was sent, so a later edit that
        // omits these does not wipe details he has already given.
        ...bankAccountHolderName !== void 0 ? { bankAccountHolderName } : {},
        ...bankAccountNumber !== void 0 ? { bankAccountNumber } : {},
        ...bankIfscCode !== void 0 ? { bankIfscCode } : {},
        ...bankName !== void 0 ? { bankName } : {},
        ...upiId !== void 0 ? { upiId } : {},
        ...panNumber !== void 0 ? { panNumber } : {},
        ...ownsPanPath(userId, panImagePath) ? { panImageUrl: panImagePath, verificationStatus: "pending" } : {},
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq11(milkmen.id, existingMilkman.id)).returning();
      if (dairyItems && Array.isArray(dairyItems)) {
        await db.delete(products).where(eq11(products.milkmanId, existingMilkman.id));
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
      bankAccountHolderName,
      bankAccountNumber,
      bankIfscCode,
      bankName,
      upiId,
      panNumber,
      ...ownsPanPath(userId, panImagePath) ? { panImageUrl: panImagePath } : {},
      deliverySlots: deliverySlots || [
        { id: 1, name: "Morning", startTime: "06:00", endTime: "09:00", isActive: true },
        { id: 2, name: "Evening", startTime: "17:00", endTime: "20:00", isActive: true }
      ]
    }).returning();
    if (dairyItems && Array.isArray(dairyItems)) {
      await db.delete(products).where(eq11(products.milkmanId, newMilkman.id));
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
    await db.update(users).set({ userType: "milkman" }).where(eq11(users.id, userId));
    res.json(newMilkman);
  } catch (error) {
    console.error("Create/Update milkman error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router5.patch("/products", async (req, res) => {
  try {
    const userId = req.user.id;
    const { dairyItems } = req.body;
    if (!dairyItems || !Array.isArray(dairyItems)) {
      return res.status(400).json({ message: "Invalid dairy items" });
    }
    const [milkman] = await db.select().from(milkmen).where(eq11(milkmen.userId, userId)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    await db.update(milkmen).set({
      dairyItems,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq11(milkmen.id, milkman.id));
    await db.delete(products).where(eq11(products.milkmanId, milkman.id));
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
router5.patch("/availability", async (req, res) => {
  try {
    const userId = req.user.id;
    const { isAvailable } = req.body;
    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({ message: "Invalid availability status" });
    }
    const [milkman] = await db.select().from(milkmen).where(eq11(milkmen.userId, userId)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    await db.update(milkmen).set({
      isAvailable,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq11(milkmen.id, milkman.id));
    res.json({ message: "Availability updated successfully", isAvailable });
  } catch (error) {
    console.error("Update availability error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router5.get("/:id", async (req, res) => {
  try {
    const milkmanId = parseInt(req.params.id);
    if (isNaN(milkmanId)) {
      return res.status(400).json({ message: "Invalid milkman ID" });
    }
    const [milkman] = await db.select().from(milkmen).where(eq11(milkmen.id, milkmanId)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman not found" });
    }
    res.json(milkman);
  } catch (error) {
    console.error("Get milkman error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router5.patch("/routes", async (req, res) => {
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
    const [milkman] = await db.select().from(milkmen).where(eq11(milkmen.userId, userId)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    await db.transaction(async (tx) => {
      for (let i = 0; i < orderedCustomerIds.length; i++) {
        const customerId = orderedCustomerIds[i];
        await tx.update(customers).set({ routeOrder: i + 1 }).where(and9(eq11(customers.id, customerId), eq11(customers.assignedMilkmanId, milkman.id)));
      }
    });
    res.json({ message: "Route updated successfully" });
  } catch (error) {
    console.error("Update route error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
var milkmanRoutes_default = router5;

// server/orderRoutes.ts
init_db();
init_schema();
import { Router as Router6 } from "express";
import { eq as eq13, desc as desc4 } from "drizzle-orm";

// server/websocket.ts
import { WebSocketServer, WebSocket } from "ws";
import jwt3 from "jsonwebtoken";

// server/vite.ts
import express from "express";
import fs2 from "fs";
import path2, { dirname } from "path";
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
      const clientTemplate = path2.resolve(
        __dirname,
        "..",
        "client",
        "index.html"
      );
      const template = fs2.readFileSync(clientTemplate, "utf-8");
      const page2 = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page2);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname, "public");
  if (!fs2.existsSync(distPath)) {
    console.log(`[express] No frontend build found at ${distPath} \u2014 running in API-only mode`);
    app2.use("*", (_req, res, next) => {
      if (_req.originalUrl.startsWith("/api")) return next();
      res.status(200).json({ status: "DOOODHWALA API running", mode: "api-only" });
    });
    return;
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/websocket.ts
var JWT_SECRET3 = process.env.JWT_SECRET;
var wss;
function setupWebSocket(server) {
  wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (ws) => {
    ws.isAlive = true;
    ws.isAuthenticated = false;
    ws.on("pong", () => {
      ws.isAlive = true;
    });
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === "authenticate") {
          if (!message.token || !JWT_SECRET3) {
            ws.send(JSON.stringify({ type: "auth_error", message: "Token required" }));
            return;
          }
          try {
            const decoded = jwt3.verify(message.token, JWT_SECRET3);
            ws.userId = decoded.id;
            ws.userType = message.userType;
            ws.isAuthenticated = true;
            log(`WebSocket authenticated: User ${ws.userId} (${ws.userType})`);
            ws.send(JSON.stringify({ type: "authenticated" }));
          } catch (jwtError) {
            ws.send(JSON.stringify({ type: "auth_error", message: "Invalid token" }));
            ws.close(4001, "Invalid token");
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
    setTimeout(() => {
      if (!ws.isAuthenticated && ws.readyState === WebSocket.OPEN) {
        ws.close(4e3, "Authentication timeout");
      }
    }, 1e4);
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
function broadcast(message, targetUserIds) {
  if (!wss) return;
  const targets = targetUserIds ? new Set(targetUserIds.filter((id) => !!id)) : null;
  wss.clients.forEach((client) => {
    const ws = client;
    if (client.readyState !== WebSocket.OPEN || !ws.isAuthenticated) return;
    if (targets && (!ws.userId || !targets.has(ws.userId))) return;
    client.send(JSON.stringify(message));
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

// server/services/wsParties.ts
init_db();
init_schema();
import { eq as eq12 } from "drizzle-orm";
async function partyUserIds(opts) {
  const ids = /* @__PURE__ */ new Set();
  if (opts.customerId) {
    const c = await db.query.customers.findFirst({ where: eq12(customers.id, opts.customerId) });
    if (c?.userId) ids.add(c.userId);
  }
  if (opts.milkmanId) {
    const m = await db.query.milkmen.findFirst({ where: eq12(milkmen.id, opts.milkmanId) });
    if (m?.userId) ids.add(m.userId);
  }
  if (opts.familyChatId) {
    const members = await db.select().from(familyChatMembers).where(eq12(familyChatMembers.chatId, opts.familyChatId));
    members.forEach((mm) => mm.userId && ids.add(mm.userId));
    const [grp] = await db.select().from(familyChats).where(eq12(familyChats.id, opts.familyChatId)).limit(1);
    if (grp?.milkmanId) {
      const gm = await db.query.milkmen.findFirst({ where: eq12(milkmen.id, grp.milkmanId) });
      if (gm?.userId) ids.add(gm.userId);
    }
  }
  return [...ids];
}

// server/orderRoutes.ts
init_households();
var router6 = Router6();
router6.get("/customer", async (req, res) => {
  try {
    const userId = req.user.id;
    const [customer] = await db.select().from(customers).where(eq13(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    const customerOrders = await db.select().from(orders).where(eq13(orders.customerId, customer.id)).orderBy(desc4(orders.createdAt));
    res.json(customerOrders);
  } catch (error) {
    console.error("Get customer orders error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router6.get("/customer/:customerId", async (req, res) => {
  try {
    const userId = req.user.id;
    const customerId = parseInt(req.params.customerId);
    if (isNaN(customerId)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }
    const [milkman] = await db.select().from(milkmen).where(eq13(milkmen.userId, userId)).limit(1);
    if (milkman) {
      const [customer] = await db.select().from(customers).where(eq13(customers.id, customerId)).limit(1);
      if (customer && customer.assignedMilkmanId !== milkman.id) {
        return res.status(403).json({ message: "Not authorized to view this customer's orders" });
      }
    }
    const customerOrders = await db.select().from(orders).where(eq13(orders.customerId, customerId)).orderBy(desc4(orders.createdAt));
    res.json(customerOrders);
  } catch (error) {
    console.error("Get specific customer orders error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router6.get("/milkman", async (req, res) => {
  try {
    const userId = req.user.id;
    const [milkman] = await db.select().from(milkmen).where(eq13(milkmen.userId, userId)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    const milkmanOrders = await db.select().from(orders).where(eq13(orders.milkmanId, milkman.id)).orderBy(desc4(orders.createdAt));
    res.json(milkmanOrders);
  } catch (error) {
    console.error("Get milkman orders error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router6.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { milkmanId, quantity, pricePerLiter, deliveryDate, deliveryTime, specialInstructions, itemName } = req.body;
    const [customer] = await db.select().from(customers).where(eq13(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(400).json({ message: "Complete your profile before ordering" });
    }
    const totalAmount = (parseFloat(quantity) * parseFloat(pricePerLiter)).toString();
    const householdChatId = await ensureHouseholdChat(customer.id, Number(milkmanId));
    const [orderMessage] = await db.insert(chatMessages).values({
      customerId: customer.id,
      milkmanId,
      familyChatId: householdChatId,
      senderId: userId,
      senderType: "customer",
      message: `${quantity} ${itemName ? `\xD7 ${itemName}` : "L"}` + (specialInstructions ? ` (${specialInstructions})` : ""),
      messageType: "order",
      orderQuantity: quantity.toString(),
      orderProduct: itemName || null,
      orderTotal: totalAmount
    }).returning();
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
      // Tag links this order to the message, so marking the message
      // delivered updates exactly this order. The customer's own note
      // is kept on the message above rather than lost.
      specialInstructions: `chatMsg:${orderMessage.id}`
    }).returning();
    res.json(newOrder);
    broadcast({
      type: "new_message",
      message: orderMessage,
      customerId: customer.id,
      milkmanId
    }, await partyUserIds({ customerId: customer.id, milkmanId }));
    try {
      const [milkman] = await db.select().from(milkmen).where(eq13(milkmen.id, milkmanId)).limit(1);
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
router6.patch("/:id/status", async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status } = req.body;
    if (isNaN(orderId) || !status) {
      return res.status(400).json({ message: "Invalid request parameters" });
    }
    const userId = req.user.id;
    const [milkman] = await db.select().from(milkmen).where(eq13(milkmen.userId, userId)).limit(1);
    if (!milkman) {
      return res.status(403).json({ message: "Only milkmen can update order status" });
    }
    const [existingOrder] = await db.select().from(orders).where(eq13(orders.id, orderId)).limit(1);
    if (!existingOrder || existingOrder.milkmanId !== milkman.id) {
      return res.status(404).json({ message: "Order not found or unauthorized" });
    }
    const [updatedOrder] = await db.update(orders).set({
      status,
      deliveredAt: status === "delivered" ? /* @__PURE__ */ new Date() : existingOrder.deliveredAt,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq13(orders.id, orderId)).returning();
    notifyOps(
      status === "delivered" ? "delivered" : "order",
      `Order #${orderId} ${status} by ${milkman.businessName || `dairyman #${milkman.id}`} \u2014 ${rs(updatedOrder.totalAmount)}`
    );
    try {
      const [customer] = await db.select().from(customers).where(eq13(customers.id, updatedOrder.customerId ?? -1)).limit(1);
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
var orderRoutes_default = router6;

// server/serviceRequestRoutes.ts
init_db();
init_schema();
import { Router as Router7 } from "express";
import { eq as eq14, desc as desc5, ne as ne2, and as and10 } from "drizzle-orm";
var router7 = Router7();
async function broadcastServiceRequest(event, request) {
  try {
    const targets = await partyUserIds({ customerId: request.customerId, milkmanId: request.milkmanId });
    broadcast({
      type: "service_request_update",
      event,
      requestId: request.id,
      customerId: request.customerId,
      milkmanId: request.milkmanId
    }, targets);
  } catch (e) {
    console.error("broadcastServiceRequest failed:", e);
  }
}
async function notifyUser(userId, title, message, relatedId) {
  try {
    await db.insert(notifications).values({
      userId,
      title,
      message,
      type: "service_request",
      relatedId,
      isRead: false
    });
    const user = await db.query.users.findFirst({ where: eq14(users.id, userId) });
    if (user?.fcmToken) {
      await sendPushNotification(user.fcmToken, title, message, {
        type: "service_request",
        requestId: String(relatedId)
      });
    }
  } catch (err) {
    console.error("Service request notification failed:", err);
  }
}
router7.get("/test", (req, res) => res.json({ message: "Service requests route working" }));
router7.get("/customer", async (req, res) => {
  try {
    const userId = req.user.id;
    const [customer] = await db.select().from(customers).where(eq14(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    const requests = await db.select().from(serviceRequests).where(eq14(serviceRequests.customerId, customer.id)).orderBy(desc5(serviceRequests.createdAt));
    res.json(requests);
  } catch (error) {
    console.error("Get service requests error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router7.get("/milkman", async (req, res) => {
  try {
    const userId = req.user.id;
    const [milkman] = await db.select().from(milkmen).where(eq14(milkmen.userId, userId)).limit(1);
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
    }).from(serviceRequests).leftJoin(customers, eq14(serviceRequests.customerId, customers.id)).where(
      and10(
        eq14(serviceRequests.milkmanId, milkman.id),
        ne2(serviceRequests.status, "rejected"),
        ne2(serviceRequests.status, "accepted")
      )
    ).orderBy(desc5(serviceRequests.createdAt));
    res.json(requests);
  } catch (error) {
    console.error("Get milkman requests error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router7.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { milkmanId, services, customerNotes } = req.body;
    if (!milkmanId || !services) {
      return res.status(400).json({ message: "milkmanId and services are required" });
    }
    const [customer] = await db.select().from(customers).where(eq14(customers.userId, userId)).limit(1);
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
    broadcastServiceRequest("created", newRequest);
    const milkman = await db.query.milkmen.findFirst({ where: eq14(milkmen.id, milkmanId) });
    if (milkman) {
      await notifyUser(
        milkman.userId,
        "New Service Request",
        `${customer.name || "A customer"} sent you a new service request.`,
        newRequest.id
      );
    }
  } catch (error) {
    console.error("Create service request error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error" });
    }
  }
});
router7.patch("/:id/quote", async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    if (isNaN(requestId)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }
    const { services, notes } = req.body;
    const [milkman] = await db.select().from(milkmen).where(eq14(milkmen.userId, req.user.id)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    const [request] = await db.select().from(serviceRequests).where(eq14(serviceRequests.id, requestId)).limit(1);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (request.milkmanId !== milkman.id) {
      return res.status(403).json({ message: "Not authorized for this request" });
    }
    const [updated] = await db.update(serviceRequests).set({
      status: "quoted",
      services: services || request.services,
      milkmanNotes: notes ?? request.milkmanNotes,
      quotedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq14(serviceRequests.id, requestId)).returning();
    res.json(updated);
    broadcastServiceRequest("quoted", updated);
    const [customer] = await db.select().from(customers).where(eq14(customers.id, updated.customerId)).limit(1);
    if (customer) {
      await notifyUser(
        customer.userId,
        "Quote Received",
        "Your milkman sent a quote for your service request.",
        requestId
      );
    }
  } catch (error) {
    console.error("Quote service request error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error" });
    }
  }
});
router7.post("/:id/approve", async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const { services } = req.body;
    const [request] = await db.select().from(serviceRequests).where(eq14(serviceRequests.id, requestId)).limit(1);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    const [updatedRequest] = await db.update(serviceRequests).set({
      status: "accepted",
      services: services || request.services,
      respondedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq14(serviceRequests.id, requestId)).returning();
    await addDairyman(request.customerId, request.milkmanId);
    res.json(updatedRequest);
    broadcastServiceRequest("accepted", updatedRequest);
    const [customer] = await db.select().from(customers).where(eq14(customers.id, updatedRequest.customerId)).limit(1);
    if (customer) {
      await notifyUser(
        customer.userId,
        "Service Request Accepted",
        "Your milkman accepted your service request.",
        requestId
      );
    }
    notifyOps("signup", `Service accepted \u2014 dairyman #${updatedRequest.milkmanId} took on ${customer?.name || `customer #${updatedRequest.customerId}`}`);
  } catch (error) {
    console.error("Approve request error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error" });
    }
  }
});
router7.post("/:id/reject", async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const [updatedRequest] = await db.update(serviceRequests).set({
      status: "rejected",
      respondedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq14(serviceRequests.id, requestId)).returning();
    if (!updatedRequest) {
      return res.status(404).json({ message: "Request not found" });
    }
    res.json(updatedRequest);
    broadcastServiceRequest("rejected", updatedRequest);
    const [customer] = await db.select().from(customers).where(eq14(customers.id, updatedRequest.customerId)).limit(1);
    if (customer) {
      await notifyUser(
        customer.userId,
        "Service Request Declined",
        "Your milkman declined your service request.",
        requestId
      );
    }
  } catch (error) {
    console.error("Reject request error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error" });
    }
  }
});
router7.patch("/:id/status", async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const { status } = req.body;
    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const [updatedRequest] = await db.update(serviceRequests).set({
      status,
      respondedAt: /* @__PURE__ */ new Date()
    }).where(eq14(serviceRequests.id, requestId)).returning();
    if (!updatedRequest) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (status === "accepted") {
      await addDairyman(updatedRequest.customerId, updatedRequest.milkmanId);
    }
    res.json(updatedRequest);
    broadcastServiceRequest(status === "accepted" ? "accepted" : "rejected", updatedRequest);
    const milkman = await db.query.milkmen.findFirst({ where: eq14(milkmen.id, updatedRequest.milkmanId) });
    if (milkman) {
      await notifyUser(
        milkman.userId,
        status === "accepted" ? "Quote Accepted" : "Quote Declined",
        status === "accepted" ? "The customer accepted your quote." : "The customer declined your quote.",
        requestId
      );
    }
    notifyOps("signup", `Quote ${status} \u2014 customer #${updatedRequest.customerId} / ${milkman?.businessName || `dairyman #${updatedRequest.milkmanId}`}`);
  } catch (error) {
    console.error("Update request status error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error" });
    }
  }
});
router7.patch("/:id", async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    if (isNaN(requestId)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }
    const { services, customerNotes } = req.body;
    const [customer] = await db.select().from(customers).where(eq14(customers.userId, req.user.id)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    const [request] = await db.select().from(serviceRequests).where(eq14(serviceRequests.id, requestId)).limit(1);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (request.customerId !== customer.id) {
      return res.status(403).json({ message: "Not authorized for this request" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ message: "Only pending requests can be edited" });
    }
    const [updated] = await db.update(serviceRequests).set({
      services: services || request.services,
      customerNotes: customerNotes ?? request.customerNotes,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq14(serviceRequests.id, requestId)).returning();
    res.json(updated);
    broadcastServiceRequest("edited", updated);
  } catch (error) {
    console.error("Update service request error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error" });
    }
  }
});
var serviceRequestRoutes_default = router7;

// server/paymentRoutes.ts
init_db();
init_schema();
import { Router as Router8 } from "express";
import { eq as eq16, desc as desc6, and as and11, inArray as inArray7, or as or4 } from "drizzle-orm";
import Razorpay from "razorpay";
import Stripe from "stripe";
import crypto2 from "crypto";

// server/services/notify.ts
init_db();
init_schema();
import { eq as eq15 } from "drizzle-orm";
async function notifyUser2(userId, title, message, opts = {}) {
  if (!userId) return;
  try {
    await db.insert(notifications).values({
      userId,
      title,
      message,
      type: opts.type || "general",
      relatedId: opts.relatedId ?? null,
      isRead: false
    });
    const user = await db.query.users.findFirst({ where: eq15(users.id, userId) });
    if (user?.fcmToken) {
      await sendPushNotification(user.fcmToken, title, message, {
        type: opts.type || "general",
        ...opts.relatedId != null ? { relatedId: String(opts.relatedId) } : {},
        ...opts.data || {}
      });
    }
  } catch (err) {
    console.error(`notifyUser failed for ${userId}:`, err);
  }
}
async function notifyUsers(userIds, title, message, opts = {}) {
  const unique = [...new Set(userIds.filter(Boolean))];
  await Promise.all(unique.map((id) => notifyUser2(id, title, message, opts)));
}
function describeMessage(msg) {
  switch (msg.messageType) {
    case "order":
      return {
        title: "New order",
        body: msg.orderQuantity ? `${msg.orderQuantity}${msg.orderProduct ? ` \xD7 ${msg.orderProduct}` : " L"}` : msg.message || "New order placed"
      };
    case "bill":
      return {
        title: "Bill ready",
        body: msg.orderTotal ? `Your bill of \u20B9${msg.orderTotal} is ready` : "Your bill is ready"
      };
    case "voice":
      return { title: "Voice message", body: "Sent you a voice message" };
    case "notification":
      return { title: "Update", body: msg.message || "You have an update" };
    default:
      const text2 = (msg.message || "Sent you a message").trim();
      return { title: "New message", body: text2.length > 80 ? `${text2.slice(0, 77)}\u2026` : text2 };
  }
}

// server/services/invoiceHtml.ts
var OPERATOR = {
  name: "Sambhavshri Agro Processing LLP",
  llpin: "ACB-4950",
  // City only. The full registered office stays in the terms, where it has to
  // be; on a bill it is noise beside the customer's own address, and it is a
  // home address printed on a document that gets shared around.
  address: "Chhatrapati Sambhajinagar",
  grievance: "Sachin Sancheti \xB7 sambhavshriagroprocessing@gmail.com \xB7 8308804099"
};
function esc(v) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function inr(v) {
  const n = parseFloat(String(v ?? "0")) || 0;
  return "\u20B9" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function monthName(billMonth) {
  const [y, m] = String(billMonth || "").split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return isNaN(d.getTime()) ? billMonth : d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}
function dateStr(d) {
  const dt = d ? new Date(d) : null;
  return dt && !isNaN(dt.getTime()) ? dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "\u2014";
}
function renderInvoiceHtml(input) {
  const { bill } = input;
  const items = Array.isArray(bill.items) ? bill.items : [];
  const subtotal = bill.subtotal ?? bill.totalAmount;
  const feeAmount = parseFloat(bill.customerFeeAmount ?? "0") || 0;
  const feePercent = bill.customerFeePercent ?? "0";
  const paid = bill.status === "paid";
  const rows = items.length ? items.map((it) => `
            <tr>
              <td>${esc(it.product || "Order")}</td>
              <td class="num">${esc(it.quantity ?? "")}</td>
              <td class="num">${it.price != null ? inr(it.price) : "\u2014"}</td>
              <td class="num">${inr(it.amount)}</td>
            </tr>`).join("") : `<tr><td colspan="4" class="muted">No itemised entries recorded for this period.</td></tr>`;
  return `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bill ${esc(bill.id)} \u2014 ${esc(monthName(bill.billMonth))}</title>
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
        ${esc(OPERATOR.name)} \xB7 LLPIN ${esc(OPERATOR.llpin)}<br>
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
    ${feeAmount > 0 ? `<div class="row"><span class="lbl fee">Platform fee (${esc(feePercent)}%)</span><span>${inr(feeAmount)}</span></div>` : ""}
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
function renderOrderHistoryHtml(input) {
  const { bill } = input;
  const items = Array.isArray(bill.items) ? bill.items : [];
  const byDay = /* @__PURE__ */ new Map();
  for (const it of items) {
    const key = it.date ? new Date(it.date).toDateString() : "Undated";
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(it);
  }
  const days = [...byDay.entries()].sort((a, b) => {
    const ta = a[0] === "Undated" ? 0 : new Date(a[0]).getTime();
    const tb = b[0] === "Undated" ? 0 : new Date(b[0]).getTime();
    return ta - tb;
  });
  const totalQty = items.reduce((s, it) => s + (parseFloat(String(it.quantity ?? 0)) || 0), 0);
  const totalAmt = items.reduce((s, it) => s + (parseFloat(String(it.amount ?? 0)) || 0), 0);
  const dayBlocks = days.length ? days.map(([day, rows]) => {
    const dayTotal = rows.reduce((s, r) => s + (parseFloat(String(r.amount ?? 0)) || 0), 0);
    const label = day === "Undated" ? "Date not recorded" : new Date(day).toLocaleDateString(
      "en-IN",
      { weekday: "short", day: "numeric", month: "short", year: "numeric" }
    );
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
                        <td class="num">${r.price != null ? inr(r.price) : "\u2014"}</td>
                        <td class="num">${inr(r.amount)}</td>
                      </tr>`).join("")}
                  </tbody>
                </table>
              </section>`;
  }).join("") : `<p class="empty">No deliveries recorded for this period.</p>`;
  return `<!doctype html>
<html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Order history \u2014 ${esc(monthName(bill.billMonth))}</title>
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
      <div class="brand-sub">${esc(OPERATOR.name)} \xB7 LLPIN ${esc(OPERATOR.llpin)}</div>
    </div>
    <div class="docmeta">
      <div class="kind">ORDER HISTORY</div>
      <div>${esc(monthName(bill.billMonth))}</div>
      <div>Against bill no. ${esc(bill.id)}</div>
    </div>
  </div>

  <div class="who">
    <strong>${esc(input.customerName || "Customer")}</strong>${input.customerAddress ? ` \xB7 ${esc(input.customerAddress)}` : ""}<br>
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

// server/paymentRoutes.ts
var router8 = Router8();
function signatureMatches(expected, received) {
  if (!received || expected.length !== received.length) return false;
  return crypto2.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}
async function notifyBillPaid(bill, paidByUserId) {
  notifyOps(
    "money",
    `Bill #${bill.id} paid \u2014 ${rs(bill.totalAmount)} (fee ${rs(bill.customerFeeAmount)}, commission ${rs(bill.vendorCommissionAmount)})`
  );
  try {
    const targets = await partyUserIds({
      customerId: bill.customerId,
      milkmanId: bill.milkmanId,
      familyChatId: bill.familyChatId
    });
    broadcast({
      type: "bill_paid",
      billId: bill.id,
      customerId: bill.customerId ?? null,
      milkmanId: bill.milkmanId ?? null,
      familyChatId: bill.familyChatId ?? null,
      amount: bill.totalAmount,
      paidBy: paidByUserId
    }, targets);
    if (bill.milkmanId) {
      const mk = await db.query.milkmen.findFirst({ where: eq16(milkmen.id, bill.milkmanId) });
      if (mk?.userId) {
        await db.insert(notifications).values({
          userId: mk.userId,
          title: "Payment Received",
          message: `A bill of \u20B9${bill.totalAmount} has been paid.`,
          type: "payment",
          relatedId: bill.id,
          isRead: false
        });
        const mkUser = await db.query.users.findFirst({ where: eq16(users.id, mk.userId) });
        if (mkUser?.fcmToken) {
          await sendPushNotification(
            mkUser.fcmToken,
            "Payment Received \u{1F4B0}",
            `A bill of \u20B9${bill.totalAmount} has been paid.`,
            { type: "bill_paid", billId: String(bill.id) }
          );
        }
      }
      const payerIds = [];
      if (bill.familyChatId) {
        const members = await db.select({ userId: familyChatMembers.userId }).from(familyChatMembers).where(eq16(familyChatMembers.chatId, bill.familyChatId));
        payerIds.push(...members.map((m) => m.userId));
      } else if (bill.customerId) {
        const cust = await db.query.customers.findFirst({
          where: eq16(customers.id, bill.customerId)
        });
        payerIds.push(cust?.userId);
      }
      await notifyUsers(
        payerIds,
        "Payment successful",
        `Your bill of \u20B9${bill.totalAmount} is paid. Thank you!`,
        { type: "bill_paid", relatedId: bill.id }
      );
    }
  } catch (e) {
    console.error("notifyBillPaid failed:", e);
  }
}
var razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
} else {
  console.warn("Razorpay keys missing \u2014 payment endpoints will return 503.");
}
var stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn("Stripe key missing \u2014 Stripe endpoints will return 503.");
}
router8.get("/milkman", async (req, res) => {
  try {
    const me = await callerIdentities(req);
    const milkmanId = me.milkmanId;
    if (!milkmanId) return res.status(403).json({ message: "Not a milkman account" });
    const milkmanBills = await db.select().from(bills).where(eq16(bills.milkmanId, milkmanId)).orderBy(desc6(bills.createdAt));
    res.json(milkmanBills);
  } catch (error) {
    console.error("Get milkman bills error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router8.post("/generate", async (req, res) => {
  try {
    const me = await callerIdentities(req);
    const milkmanId = me.milkmanId;
    if (!milkmanId) return res.status(403).json({ message: "Not a milkman account" });
    await BillingService.generateBillsForMilkman(milkmanId);
    res.json({ success: true, message: "Bills generated successfully" });
  } catch (error) {
    console.error("Generate bills error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router8.get("/:id/history", async (req, res) => {
  return renderBillDocument(req, res, "history");
});
router8.get("/:id/invoice", async (req, res) => {
  return renderBillDocument(req, res, "invoice");
});
async function renderBillDocument(req, res, kind) {
  try {
    const billId = parseInt(req.params.id);
    if (isNaN(billId)) return res.status(400).json({ message: "Invalid bill id" });
    const [bill] = await db.select().from(bills).where(eq16(bills.id, billId)).limit(1);
    if (!bill) return res.status(404).json({ message: "Bill not found" });
    const parties = await partyUserIds({
      customerId: bill.customerId,
      milkmanId: bill.milkmanId,
      familyChatId: bill.familyChatId
    });
    const me = await callerIdentities(req);
    if (!me.isAdmin && !(req.user?.id && parties.includes(req.user.id))) {
      return res.status(403).json({ message: "Not your bill" });
    }
    let customer = null;
    if (bill.customerId != null) {
      customer = await db.query.customers.findFirst({ where: eq16(customers.id, bill.customerId) });
    } else if (bill.familyChatId != null) {
      const [member] = await db.select({ userId: familyChatMembers.userId }).from(familyChatMembers).where(eq16(familyChatMembers.chatId, bill.familyChatId)).limit(1);
      if (member?.userId) {
        customer = await db.query.customers.findFirst({ where: eq16(customers.userId, member.userId) });
      }
    }
    const supplier = await db.query.milkmen.findFirst({ where: eq16(milkmen.id, bill.milkmanId) });
    const html = kind === "history" ? renderOrderHistoryHtml({
      bill,
      customerName: customer?.name,
      customerAddress: customer?.address,
      supplierName: supplier?.businessName
    }) : renderInvoiceHtml({
      bill,
      customerName: customer?.name,
      customerAddress: customer?.address,
      customerPhone: customer?.phone,
      supplierName: supplier?.businessName,
      supplierAddress: supplier?.address,
      supplierPhone: supplier?.phone
    });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (error) {
    console.error(`Bill ${kind} render error:`, error);
    res.status(500).json({ message: "Could not build the document" });
  }
}
router8.get("/cod/pending", async (req, res) => {
  try {
    const me = await callerIdentities(req);
    if (me.milkmanId == null) return res.json([]);
    const rows = await db.select({
      id: payments.id,
      orderId: payments.orderId,
      amount: payments.amount,
      customerId: payments.customerId,
      customerName: customers.name,
      customerPhone: customers.phone,
      createdAt: payments.createdAt
    }).from(payments).leftJoin(customers, eq16(payments.customerId, customers.id)).where(and11(
      eq16(payments.milkmanId, me.milkmanId),
      eq16(payments.paymentMethod, "cod"),
      eq16(payments.status, "pending")
    )).orderBy(desc6(payments.createdAt));
    const seen = /* @__PURE__ */ new Set();
    const unique = rows.filter((r) => {
      if (seen.has(r.orderId)) return false;
      seen.add(r.orderId);
      return true;
    });
    res.json(unique);
  } catch (error) {
    console.error("Get COD pending error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router8.post("/cod/verify-otp", async (req, res) => {
  try {
    const { otp, orderId } = req.body;
    const user = req.user;
    if (!otp || !orderId) return res.status(400).json({ message: "OTP and Order ID required" });
    if (!orderId.startsWith("BILL_")) {
      return res.status(400).json({ message: "Invalid order ID format" });
    }
    const billId = parseInt(orderId.replace("BILL_", ""));
    const [pending] = await db.select().from(payments).where(and11(
      eq16(payments.orderId, orderId),
      eq16(payments.paymentMethod, "cod"),
      eq16(payments.status, "pending")
    )).orderBy(desc6(payments.createdAt)).limit(1);
    if (!pending) {
      return res.status(400).json({ message: "No pending COD payment found for this bill." });
    }
    const details = pending.paymentDetails || {};
    if (!details.codOtp || String(details.codOtp) !== String(otp).trim()) {
      return res.status(400).json({ success: false, message: "Incorrect OTP." });
    }
    if (details.expiresAt && new Date(details.expiresAt) < /* @__PURE__ */ new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired. Please regenerate." });
    }
    const [paidBill] = await db.select().from(bills).where(eq16(bills.id, billId)).limit(1);
    if (paidBill) {
      const parties = await partyUserIds({ customerId: paidBill.customerId, milkmanId: paidBill.milkmanId, familyChatId: paidBill.familyChatId });
      if (user?.id && parties.length && !parties.includes(user.id)) {
        return res.status(403).json({ success: false, message: "Not authorized for this bill." });
      }
    }
    const settledAmount = paidBill?.totalAmount || pending.amount || "0.00";
    await db.update(bills).set({ status: "paid", paidAt: /* @__PURE__ */ new Date(), paidBy: user.id }).where(eq16(bills.id, billId));
    await db.update(payments).set({
      status: "completed",
      amount: settledAmount,
      paymentDetails: { ...details, verified: true, verifiedAt: (/* @__PURE__ */ new Date()).toISOString() }
    }).where(eq16(payments.id, pending.id));
    if (paidBill) await notifyBillPaid(paidBill, user.id);
    return res.json({ success: true, message: "COD payment verified and Bill updated." });
  } catch (error) {
    console.error("Verify COD OTP error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router8.get("/consolidated/:milkmanId", async (req, res) => {
  try {
    const milkmanId = parseInt(req.params.milkmanId);
    if (isNaN(milkmanId)) {
      return res.status(400).json({ message: "Invalid milkman ID" });
    }
    if (!await isSelfMilkman(req, milkmanId)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const results = await db.select().from(bills).leftJoin(customers, eq16(bills.customerId, customers.id)).where(
      and11(
        eq16(bills.milkmanId, milkmanId),
        eq16(bills.status, "pending")
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
router8.post("/consolidated/:milkmanId/generate", async (req, res) => {
  try {
    const milkmanId = parseInt(req.params.milkmanId);
    const [mk] = await db.select().from(milkmen).where(eq16(milkmen.userId, req.user.id)).limit(1);
    if (!mk || mk.id !== milkmanId) {
      return res.status(403).json({ message: "Not authorized." });
    }
    await BillingService.generateBillsForMilkman(milkmanId);
    res.redirect(307, `/api/bills/consolidated/${milkmanId}`);
  } catch (error) {
    console.error("Generate consolidated bill error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router8.get("/list", async (req, res) => {
  try {
    const [customer] = await db.select().from(customers).where(eq16(customers.userId, req.user.id)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    const memberships = await db.select().from(familyChatMembers).where(eq16(familyChatMembers.userId, req.user.id));
    const groupIds = memberships.map((m) => m.chatId);
    const customerBills = await db.select().from(bills).where(
      groupIds.length > 0 ? or4(eq16(bills.customerId, customer.id), inArray7(bills.familyChatId, groupIds)) : eq16(bills.customerId, customer.id)
    ).orderBy(desc6(bills.createdAt));
    const monthNames = [
      "",
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ];
    const enriched = customerBills.map((b) => {
      const [year, month] = (b.billMonth || "").split("-");
      const items = Array.isArray(b.items) ? b.items : [];
      const totalQuantity = items.reduce((sum2, it) => sum2 + (parseFloat(it.quantity) || 0), 0);
      return {
        ...b,
        month: monthNames[parseInt(month)] || b.billMonth || "",
        year: year || "",
        totalQuantity,
        isGroupBill: b.familyChatId != null
      };
    });
    res.json(enriched);
  } catch (error) {
    console.error("Get customer bill list error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router8.get("/current", async (req, res) => {
  try {
    const userId = req.user.id;
    const [customer] = await db.select().from(customers).where(eq16(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    const [currentBill] = await db.select().from(bills).where(
      and11(
        eq16(bills.customerId, customer.id),
        eq16(bills.status, "pending")
      )
    ).orderBy(desc6(bills.createdAt)).limit(1);
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
router8.get("/customer/:customerId", async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);
    const [cust] = await db.select().from(customers).where(eq16(customers.id, customerId)).limit(1);
    const [callerMilkman] = await db.select().from(milkmen).where(eq16(milkmen.userId, req.user.id)).limit(1);
    const ownsCustomer = cust && cust.userId === req.user.id;
    if (!ownsCustomer && !callerMilkman) {
      return res.status(403).json({ message: "Not authorized." });
    }
    if (req.baseUrl.includes("bills")) {
      const customerBills = await db.select().from(bills).where(eq16(bills.customerId, customerId)).orderBy(desc6(bills.createdAt));
      return res.json(customerBills);
    }
    const customerPayments = await db.select().from(payments).where(eq16(payments.customerId, customerId)).orderBy(desc6(payments.createdAt));
    res.json(customerPayments);
  } catch (error) {
    console.error("Get customer payments/bills error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router8.post("/razorpay/create-order", async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(503).json({ message: "Razorpay is not configured. Contact support." });
    }
    const { amount, orderId, description } = req.body;
    const payerUserId = req.user?.id ?? "";
    const options = {
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: orderId?.toString() || `receipt_${Date.now()}`,
      notes: {
        description: description || "Dooodhwala Payment",
        internalOrderId: orderId?.toString() || "",
        payerUserId: String(payerUserId)
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
router8.post("/razorpay/verify", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error("RAZORPAY_KEY_SECRET is missing");
      return res.status(500).json({ message: "Server configuration error" });
    }
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto2.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(body.toString()).digest("hex");
    const isValid = signatureMatches(expectedSignature, razorpay_signature);
    if (isValid) {
      const existingPayment = await db.select().from(payments).where(eq16(payments.razorpayPaymentId, razorpay_payment_id));
      if (existingPayment.length > 0) {
        return res.json({ success: true, message: "Payment already verified" });
      }
      const user = req.user;
      const userId = user?.id ?? null;
      const internalOrderId = req.body.orderId;
      let verifiedAmount = "0.00";
      if (internalOrderId && internalOrderId.startsWith("BILL_")) {
        const billId = parseInt(internalOrderId.replace("BILL_", ""));
        const [bill] = await db.select().from(bills).where(eq16(bills.id, billId)).limit(1);
        if (bill) {
          const parties = await partyUserIds({ customerId: bill.customerId, milkmanId: bill.milkmanId, familyChatId: bill.familyChatId });
          if (userId && parties.length && !parties.includes(userId)) {
            return res.status(403).json({ success: false, message: "Not authorized for this bill." });
          }
          verifiedAmount = bill.totalAmount;
          await db.update(bills).set({ status: "paid", paidAt: /* @__PURE__ */ new Date(), paidBy: userId }).where(eq16(bills.id, billId));
          await notifyBillPaid(bill, userId);
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
async function settleBillFromRazorpay(internalOrderId, razorpayOrderId, razorpayPaymentId, payerUserId, paidAmount) {
  if (!internalOrderId || !internalOrderId.startsWith("BILL_")) return;
  const existing = await db.select().from(payments).where(eq16(payments.razorpayPaymentId, razorpayPaymentId)).limit(1);
  if (existing.length > 0) return;
  const billId = parseInt(internalOrderId.replace("BILL_", ""));
  const [bill] = await db.select().from(bills).where(eq16(bills.id, billId)).limit(1);
  if (!bill) return;
  const settledAmount = bill.totalAmount || paidAmount || "0.00";
  if (bill.status !== "paid") {
    await db.update(bills).set({ status: "paid", paidAt: /* @__PURE__ */ new Date(), paidBy: bill.paidBy ?? payerUserId }).where(eq16(bills.id, billId));
  }
  await db.insert(payments).values({
    userId: payerUserId || bill.paidBy || null,
    orderId: razorpayOrderId,
    amount: settledAmount,
    status: "completed",
    paymentMethod: "razorpay",
    razorpayOrderId,
    razorpayPaymentId,
    paymentDetails: { via: "webhook", verified: true, timestamp: /* @__PURE__ */ new Date() }
  });
  await notifyBillPaid({ ...bill, status: "paid" }, bill.paidBy ?? payerUserId);
  console.log(`[Webhook] Settled bill ${billId} from Razorpay payment ${razorpayPaymentId}`);
}
router8.post("/razorpay/webhook", async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return res.status(500).send("Webhook secret missing");
    const signature = req.headers["x-razorpay-signature"];
    if (!signature) return res.status(400).send("Missing signature");
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    const expectedSignature = crypto2.createHmac("sha256", secret).update(rawBody).digest("hex");
    if (!signatureMatches(expectedSignature, signature)) {
      return res.status(400).send("Invalid webhook signature");
    }
    const event = JSON.parse(rawBody.toString());
    if (event.event === "payment.captured" || event.event === "order.paid") {
      const paymentEntity = event.payload?.payment?.entity;
      const orderEntity = event.payload?.order?.entity;
      let notes = orderEntity?.notes || paymentEntity?.notes || {};
      let internalOrderId = notes.internalOrderId || orderEntity?.receipt;
      const razorpayOrderId = orderEntity?.id || paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id || `webhook_${razorpayOrderId}`;
      const paidAmount = paymentEntity?.amount ? (paymentEntity.amount / 100).toFixed(2) : "0.00";
      if (!internalOrderId && razorpayOrderId && razorpay) {
        try {
          const ord = await razorpay.orders.fetch(razorpayOrderId);
          notes = ord?.notes || {};
          internalOrderId = notes.internalOrderId || ord?.receipt;
        } catch (e) {
        }
      }
      await settleBillFromRazorpay(internalOrderId, razorpayOrderId, razorpayPaymentId, notes.payerUserId || null, paidAmount);
    }
    res.json({ status: "ok" });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    res.status(500).send("Webhook Error");
  }
});
router8.post("/stripe/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!endpointSecret || !sig) {
    return res.status(400).send(`Webhook Error: Missing secret or signature`);
  }
  if (!stripe) {
    console.warn("Stripe webhook received but Stripe is not configured (missing STRIPE_SECRET_KEY).");
    return res.status(503).send("Webhook Error: Stripe not configured");
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
router8.post("/cod/create-order", async (req, res) => {
  try {
    const { amount, orderId, customerId, milkmanId, description, customerPhone } = req.body;
    const requesterId = req.user?.id ?? null;
    let billCustomerId = customerId ?? null;
    let billMilkmanId = milkmanId ?? null;
    if (typeof orderId === "string" && orderId.startsWith("BILL_")) {
      const [bill] = await db.select().from(bills).where(eq16(bills.id, parseInt(orderId.replace("BILL_", "")))).limit(1);
      if (bill) {
        billCustomerId = bill.customerId ?? billCustomerId;
        billMilkmanId = bill.milkmanId ?? billMilkmanId;
      }
    }
    const [outstanding] = await db.select().from(payments).where(and11(
      eq16(payments.orderId, orderId),
      eq16(payments.paymentMethod, "cod"),
      eq16(payments.status, "pending")
    )).orderBy(desc6(payments.createdAt)).limit(1);
    const existingDetails = outstanding?.paymentDetails || {};
    const stillValid = existingDetails.codOtp && existingDetails.expiresAt && new Date(existingDetails.expiresAt) > /* @__PURE__ */ new Date();
    const otp = stillValid ? String(existingDetails.codOtp) : Math.floor(1e5 + Math.random() * 9e5).toString();
    if (!stillValid) {
      notifyOps("money", `Cash payment started: ${orderId} \u2014 ${rs(amount)}`);
    }
    if (!stillValid) {
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
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString()
        }
      });
    }
    const me = await callerIdentities(req);
    const callerIsPayer = me.customerId != null && billCustomerId != null && me.customerId === billCustomerId;
    const otpRecipients = [];
    if (billCustomerId != null) {
      const cust = await db.query.customers.findFirst({
        where: eq16(customers.id, billCustomerId)
      });
      if (cust?.userId) otpRecipients.push(cust.userId);
    }
    await notifyUsers(
      otpRecipients,
      "Payment code",
      `Share code ${otp} with your milkman to confirm \u20B9${amount}.`,
      { type: "cod_otp" }
    );
    if (billMilkmanId != null) {
      const mk = await db.query.milkmen.findFirst({ where: eq16(milkmen.id, billMilkmanId) });
      const payerName = billCustomerId != null ? (await db.query.customers.findFirst({ where: eq16(customers.id, billCustomerId) }))?.name : null;
      await notifyUsers(
        [mk?.userId],
        "Cash payment pending",
        `${payerName || "A customer"} will pay \u20B9${amount} in cash. Ask for their 6-digit code to confirm.`,
        { type: "cod_pending", data: { orderId: String(orderId) } }
      );
    }
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
      codOTP: callerIsPayer ? otp : void 0,
      pushOtpSent: otpRecipients.length > 0,
      smsOtpSent: !!customerPhone,
      reused: !!stillValid,
      message: callerIsPayer ? "Show this code to your milkman when you pay." : "The customer has been sent their payment code."
    });
  } catch (error) {
    console.error("COD create order error:", error);
    res.status(500).json({ message: "Failed to place COD order" });
  }
});
router8.post("/stripe/create-intent", async (req, res) => {
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
var paymentRoutes_default = router8;

// server/chatRoutes.ts
init_db();
init_schema();
import { Router as Router9 } from "express";
import multer3 from "multer";
import { getStorage as getStorage3 } from "firebase-admin/storage";
import { eq as eq18, or as or6, and as and13, asc as asc2, desc as desc7, gt as gt3, isNotNull, inArray as inArray9 } from "drizzle-orm";

// server/services/routeNotify.ts
init_db();
init_schema();
import { eq as eq17, and as and12, gte as gte2, or as or5, inArray as inArray8 } from "drizzle-orm";
var PROXIMITY_THRESHOLD_M = 150;
function minutesOfDay(t) {
  if (!t) return null;
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3]?.toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + min;
}
function currentSlotWindow(milkman) {
  const todayStart = /* @__PURE__ */ new Date();
  todayStart.setHours(0, 0, 0, 0);
  const now = /* @__PURE__ */ new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  let parsed = [];
  const slots = Array.isArray(milkman?.deliverySlots) ? milkman.deliverySlots : [];
  for (const s of slots) {
    if (s?.isActive === false) continue;
    const start = minutesOfDay(s?.startTime);
    if (start == null) continue;
    const end = minutesOfDay(s?.endTime) ?? start + 180;
    parsed.push({ name: s?.name || "Delivery", start, end });
  }
  if (parsed.length === 0) {
    const start = minutesOfDay(milkman?.deliveryTimeStart);
    if (start != null) parsed.push({ name: "Delivery", start, end: minutesOfDay(milkman?.deliveryTimeEnd) ?? start + 180 });
  }
  if (parsed.length === 0) return { name: "", start: todayStart };
  parsed.sort((a, b) => a.start - b.start);
  let idx = 0;
  for (let i = 0; i < parsed.length; i++) {
    if (nowMins >= parsed[i].start - 60) idx = i;
  }
  const lower = new Date(todayStart);
  if (idx > 0) lower.setMinutes(parsed[idx - 1].end);
  return { name: parsed[idx].name, start: lower };
}
function distanceMetres(lat1, lng1, lat2, lng2) {
  const R = 6371e3;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
async function nudgeCustomerToOrder(milkman, customer) {
  try {
    if (!milkman || !customer || !customer.id || !customer.userId) return false;
    const slot = currentSlotWindow(milkman);
    const slotStart = slot.start;
    let orderCustomerIds = [customer.id];
    let groupId = null;
    try {
      const memberships = await db.select().from(familyChatMembers).where(eq17(familyChatMembers.userId, customer.userId));
      if (memberships.length) {
        const chatIds = memberships.map((m) => m.chatId);
        const [group] = await db.select().from(familyChats).where(and12(inArray8(familyChats.id, chatIds), eq17(familyChats.isActive, true))).limit(1);
        if (group) {
          groupId = group.id;
          const members = await db.select().from(familyChatMembers).where(eq17(familyChatMembers.chatId, group.id));
          const memberUserIds = members.map((m) => m.userId);
          const memberCustomers = await db.select().from(customers).where(inArray8(customers.userId, memberUserIds));
          if (memberCustomers.length) orderCustomerIds = memberCustomers.map((c) => c.id);
        }
      }
    } catch (e) {
      console.error("[routeNotify] group lookup failed (falling back to single customer):", e);
    }
    const orderedTodayWhere = groupId ? or5(inArray8(chatMessages.customerId, orderCustomerIds), eq17(chatMessages.familyChatId, groupId)) : eq17(chatMessages.customerId, customer.id);
    const [existingOrder] = await db.select().from(chatMessages).where(
      and12(
        orderedTodayWhere,
        eq17(chatMessages.milkmanId, milkman.id),
        eq17(chatMessages.messageType, "order"),
        eq17(chatMessages.senderType, "customer"),
        gte2(chatMessages.createdAt, slotStart)
      )
    ).limit(1);
    if (existingOrder) return false;
    const [alreadyNudged] = await db.select().from(chatMessages).where(
      and12(
        eq17(chatMessages.customerId, customer.id),
        eq17(chatMessages.milkmanId, milkman.id),
        eq17(chatMessages.messageType, "notification"),
        eq17(chatMessages.senderType, "milkman"),
        gte2(chatMessages.createdAt, slotStart)
      )
    ).limit(1);
    if (alreadyNudged) return false;
    const slotLabel = slot.name ? `${slot.name.toLowerCase()} ` : "";
    const text2 = `\u{1F6F5} Your milkman is one stop away! Please place your ${slotLabel}order now if you haven't already.`;
    const [msg] = await db.insert(chatMessages).values({
      milkmanId: milkman.id,
      customerId: customer.id,
      senderId: milkman.userId,
      senderType: "milkman",
      message: text2,
      messageType: "notification",
      isRead: false
    }).returning();
    await db.insert(notifications).values({
      userId: customer.userId,
      title: "Milkman Almost There",
      message: `Your milkman is one stop away \u2014 place your ${slotLabel}order now!`,
      type: "proximity",
      isRead: false
    });
    const customerUser = await db.query.users.findFirst({
      where: eq17(users.id, customer.userId)
    });
    if (customerUser && customerUser.fcmToken) {
      await sendPushNotification(
        customerUser.fcmToken,
        "Milkman Almost There",
        "Your milkman is one stop away \u2014 place your order now!",
        { type: "order_status", status: "out_for_delivery" }
      );
    }
    broadcast({
      type: "new_message",
      message: msg,
      customerId: customer.id,
      milkmanId: milkman.id
    });
    return true;
  } catch (e) {
    console.error("[routeNotify] nudgeCustomerToOrder failed:", e);
    return false;
  }
}

// server/chatRoutes.ts
init_households();
var router9 = Router9();
var memUpload = multer3({ storage: multer3.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
router9.post("/upload", memUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file provided" });
    const bucket = getStorage3().bucket(STORAGE_BUCKET);
    const safeName = (req.file.originalname || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
    const path4 = `chat/${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;
    const fileRef = bucket.file(path4);
    await fileRef.save(req.file.buffer, {
      contentType: req.file.mimetype,
      resumable: false,
      metadata: { contentType: req.file.mimetype }
    });
    const [url] = await fileRef.getSignedUrl({ action: "read", expires: "03-09-2491" });
    res.json({ url, name: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size });
  } catch (error) {
    console.error("Chat upload error:", error?.message || error);
    res.status(500).json({ message: "Upload failed", error: process.env.NODE_ENV === "development" ? error?.message : void 0 });
  }
});
router9.get("/group/:milkmanId", async (req, res) => {
  try {
    const milkmanId = parseInt(req.params.milkmanId);
    if (isNaN(milkmanId)) {
      return res.status(400).json({ message: "Invalid milkman ID" });
    }
    const me = await callerIdentities(req);
    const isTheMilkman = me.isAdmin || me.milkmanId === milkmanId;
    let where = eq18(chatMessages.milkmanId, milkmanId);
    if (!isTheMilkman) {
      if (me.customerId == null) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const memberships = await db.select({ chatId: familyChatMembers.chatId }).from(familyChatMembers).where(eq18(familyChatMembers.userId, req.user.id));
      const chatIds = memberships.map((m) => m.chatId);
      where = and13(
        eq18(chatMessages.milkmanId, milkmanId),
        chatIds.length > 0 ? or6(
          eq18(chatMessages.customerId, me.customerId),
          inArray9(chatMessages.familyChatId, chatIds)
        ) : eq18(chatMessages.customerId, me.customerId)
      );
    } else if (req.query.customerId != null) {
      const forCustomerId = parseInt(String(req.query.customerId));
      if (isNaN(forCustomerId)) {
        return res.status(400).json({ message: "Invalid customer ID" });
      }
      const householdIds = (await db.select({ chatId: familyChats.id }).from(familyChats).innerJoin(familyChatMembers, eq18(familyChatMembers.chatId, familyChats.id)).innerJoin(customers, eq18(customers.userId, familyChatMembers.userId)).where(and13(eq18(familyChats.milkmanId, milkmanId), eq18(customers.id, forCustomerId)))).map((r) => r.chatId);
      where = and13(
        eq18(chatMessages.milkmanId, milkmanId),
        householdIds.length > 0 ? or6(
          eq18(chatMessages.customerId, forCustomerId),
          inArray9(chatMessages.familyChatId, householdIds)
        ) : eq18(chatMessages.customerId, forCustomerId)
      );
    }
    const messages = await db.select().from(chatMessages).where(where).orderBy(asc2(chatMessages.createdAt));
    res.json(messages);
  } catch (error) {
    console.error("Get group messages error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router9.get("/messages", async (req, res) => {
  try {
    const { milkmanId, customerId } = req.query;
    if (!milkmanId || !customerId) {
      return res.status(400).json({ message: "Milkman ID and Customer ID required" });
    }
    const mId = parseInt(milkmanId);
    const cId = parseInt(customerId);
    if (Number.isNaN(mId) || Number.isNaN(cId)) {
      return res.status(400).json({ message: "Milkman ID and Customer ID must be numbers" });
    }
    if (!await isPartyToChat(req, mId, cId)) {
      return res.status(403).json({ message: "Not your conversation" });
    }
    const messages = await db.select().from(chatMessages).where(
      and13(
        eq18(chatMessages.milkmanId, mId),
        eq18(chatMessages.customerId, cId)
      )
    ).orderBy(asc2(chatMessages.createdAt));
    res.json(messages);
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router9.post("/messages/:id/report", async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    if (isNaN(messageId)) return res.status(400).json({ message: "Invalid message id" });
    const { reason, note, photoUrl } = req.body || {};
    const allowed = ["didnt_arrive", "quantity", "quality", "wrong_item", "other"];
    if (!allowed.includes(reason)) {
      return res.status(400).json({ message: "Pick a reason for the report" });
    }
    notifyOps("problem", `Complaint (${reason}) on message #${messageId}${note ? `: ${String(note).slice(0, 120)}` : ""}`);
    const [order] = await db.select().from(chatMessages).where(eq18(chatMessages.id, messageId)).limit(1);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!await isPartyToChat(req, order.milkmanId, order.customerId ?? -1)) {
      return res.status(403).json({ message: "Not your order" });
    }
    if (!order.isDelivered) {
      return res.status(400).json({ message: "This order has not been delivered yet." });
    }
    const label = {
      didnt_arrive: "Did not arrive",
      quantity: "Wrong quantity",
      quality: "Quality problem",
      wrong_item: "Wrong item",
      other: "Problem reported"
    };
    const what = order.orderProduct || "the order";
    const body = `\u2691 ${label[reason]} \u2014 ${what}${note ? `
${String(note).trim()}` : ""}`;
    const [reportMsg] = await db.insert(chatMessages).values({
      milkmanId: order.milkmanId,
      customerId: order.customerId,
      familyChatId: order.familyChatId,
      senderId: req.user.id,
      senderType: "customer",
      message: body,
      messageType: "report",
      reportedMessageId: order.id,
      reportReason: reason,
      reportPhotoUrl: photoUrl || null
    }).returning();
    res.json(reportMsg);
    const targets = await partyUserIds({
      customerId: order.customerId,
      milkmanId: order.milkmanId,
      familyChatId: order.familyChatId
    });
    broadcast({ type: "new_message", message: reportMsg }, targets);
    const [mk] = await db.select({ userId: milkmen.userId }).from(milkmen).where(eq18(milkmen.id, order.milkmanId)).limit(1);
    await notifyUser2(
      mk?.userId,
      "Problem reported",
      `${label[reason]} \u2014 ${what}. Open the chat to sort it out.`,
      { type: "order_report", relatedId: order.id }
    );
  } catch (error) {
    console.error("Report order error:", error);
    res.status(500).json({ message: "Could not send the report" });
  }
});
router9.get("/orders", async (req, res) => {
  try {
    const [milkman] = await db.select({ id: milkmen.id }).from(milkmen).where(eq18(milkmen.userId, req.user.id)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    const startOfDay = /* @__PURE__ */ new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const rows = await db.select({
      id: chatMessages.id,
      customerId: chatMessages.customerId,
      familyChatId: chatMessages.familyChatId,
      householdName: familyChats.chatName,
      customerName: customers.name,
      customerAddress: customers.address,
      customerPhone: customers.phone,
      message: chatMessages.message,
      orderQuantity: chatMessages.orderQuantity,
      orderProduct: chatMessages.orderProduct,
      orderTotal: chatMessages.orderTotal,
      orderItems: chatMessages.orderItems,
      isAccepted: chatMessages.isAccepted,
      isDelivered: chatMessages.isDelivered,
      createdAt: chatMessages.createdAt
    }).from(chatMessages).leftJoin(customers, eq18(chatMessages.customerId, customers.id)).leftJoin(familyChats, eq18(chatMessages.familyChatId, familyChats.id)).where(
      and13(
        eq18(chatMessages.milkmanId, milkman.id),
        gt3(chatMessages.createdAt, startOfDay),
        // ChatScreen writes orderQuantity, ChatComponent writes
        // orderItems — either marks the message as an order.
        or6(
          eq18(chatMessages.messageType, "order"),
          isNotNull(chatMessages.orderQuantity)
        )
      )
    ).orderBy(asc2(chatMessages.createdAt));
    res.json(rows);
  } catch (error) {
    console.error("Get milkman order messages error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
var sendMessageHandler = async (req, res) => {
  try {
    const userId = req.user.id;
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
    const householdChatId = customerId ? await ensureHouseholdChat(Number(customerId), Number(milkmanId)) : null;
    const [newMessage] = await db.insert(chatMessages).values({
      milkmanId,
      customerId,
      familyChatId: householdChatId,
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
    broadcast({
      type: "new_message",
      message: newMessage,
      customerId: newMessage.customerId,
      milkmanId: newMessage.milkmanId
    }, await partyUserIds({
      customerId: newMessage.customerId,
      milkmanId: newMessage.milkmanId,
      familyChatId: newMessage.familyChatId
    }));
    if (newMessage.messageType === "order" && newMessage.senderType === "customer") {
      try {
        const items = Array.isArray(newMessage.orderItems) ? newMessage.orderItems : [];
        const qtyFromItems = items.reduce((s, it) => s + (parseFloat(it.quantity) || 0), 0);
        const qty = newMessage.orderQuantity ? parseFloat(newMessage.orderQuantity) : qtyFromItems;
        if (qty > 0 && newMessage.customerId) {
          const mk = await db.query.milkmen.findFirst({ where: eq18(milkmen.id, newMessage.milkmanId) });
          const ppl = mk?.pricePerLiter || "0";
          const total = newMessage.orderTotal && parseFloat(newMessage.orderTotal) > 0 ? String(newMessage.orderTotal) : (qty * parseFloat(ppl)).toString();
          await db.insert(orders).values({
            milkmanId: newMessage.milkmanId,
            customerId: newMessage.customerId,
            orderedBy: newMessage.senderId,
            quantity: qty.toString(),
            pricePerLiter: ppl,
            totalAmount: total,
            status: "pending",
            deliveryDate: /* @__PURE__ */ new Date(),
            specialInstructions: `chatMsg:${newMessage.id}`,
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          });
        }
      } catch (orderErr) {
        console.error("Failed to create order from chat message:", orderErr);
      }
    }
    if (newMessage.messageType === "order" && newMessage.senderType === "customer") {
      notifyOps(
        "order",
        `Order placed: ${newMessage.orderQuantity || ""} ${newMessage.orderProduct || "items"} to dairyman #${newMessage.milkmanId}` + (newMessage.orderTotal ? ` \u2014 Rs ${newMessage.orderTotal}` : "")
      );
      try {
        const milkmanRow = await db.query.milkmen.findFirst({
          where: eq18(milkmen.id, newMessage.milkmanId)
        });
        if (milkmanRow) {
          await notifyUser2(
            milkmanRow.userId,
            "New Order Request",
            `New order request for ${newMessage.orderProduct || "items"}.`,
            { type: "order", relatedId: newMessage.id, data: { messageId: String(newMessage.id) } }
          );
        }
      } catch (notifError) {
        console.error("Failed to notify milkman of new order:", notifError);
      }
    }
    try {
      const { title, body } = describeMessage(newMessage);
      if (newMessage.senderType === "customer") {
        if (newMessage.messageType !== "order") {
          const mk = await db.query.milkmen.findFirst({
            where: eq18(milkmen.id, newMessage.milkmanId)
          });
          await notifyUser2(mk?.userId, title, body, {
            type: "chat",
            relatedId: newMessage.id,
            data: { customerId: String(newMessage.customerId ?? "") }
          });
        }
      } else {
        const recipients = [];
        if (newMessage.familyChatId) {
          const members = await db.select({ userId: familyChatMembers.userId }).from(familyChatMembers).where(eq18(familyChatMembers.chatId, newMessage.familyChatId));
          recipients.push(...members.map((m) => m.userId));
        } else if (newMessage.customerId) {
          const cust = await db.query.customers.findFirst({
            where: eq18(customers.id, newMessage.customerId)
          });
          recipients.push(cust?.userId);
        }
        await notifyUsers(
          recipients.filter((id) => id !== userId),
          title,
          body,
          { type: "chat", relatedId: newMessage.id }
        );
      }
    } catch (chatNotifyErr) {
      console.error("Failed to notify chat participants:", chatNotifyErr);
    }
  } catch (error) {
    console.error("Send message error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error" });
    }
  }
};
router9.post("/messages", sendMessageHandler);
router9.post("/send", sendMessageHandler);
router9.post("/messages/:id/accepted", async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    if (isNaN(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }
    const [updatedMessage] = await db.update(chatMessages).set({
      isAccepted: true,
      acceptedAt: /* @__PURE__ */ new Date()
    }).where(eq18(chatMessages.id, messageId)).returning();
    if (!updatedMessage) {
      return res.status(404).json({ message: "Message not found" });
    }
    res.json(updatedMessage);
    broadcast({
      type: "order_accepted",
      messageId: updatedMessage.id,
      customerId: updatedMessage.customerId,
      milkmanId: updatedMessage.milkmanId
    }, await partyUserIds({
      customerId: updatedMessage.customerId,
      milkmanId: updatedMessage.milkmanId,
      familyChatId: updatedMessage.familyChatId
    }));
    const acceptedItems = Array.isArray(updatedMessage.orderItems) ? updatedMessage.orderItems : [];
    const qtyFromItems = acceptedItems.reduce(
      (sum2, it) => sum2 + (parseFloat(it.quantity) || 0),
      0
    );
    const acceptedQty = updatedMessage.orderQuantity ? parseFloat(updatedMessage.orderQuantity) : qtyFromItems;
    if (acceptedQty > 0) {
      const milkman = await db.query.milkmen.findFirst({
        where: eq18(milkmen.id, updatedMessage.milkmanId)
      });
      if (milkman) {
        const existingOrder = await db.query.orders.findFirst({
          where: eq18(orders.specialInstructions, `chatMsg:${updatedMessage.id}`)
        });
        if (existingOrder) {
          await db.update(orders).set({ status: "confirmed", updatedAt: /* @__PURE__ */ new Date() }).where(eq18(orders.id, existingOrder.id));
        } else {
          const pricePerLiter = parseFloat(milkman.pricePerLiter || "0");
          const totalAmount = updatedMessage.orderTotal && parseFloat(updatedMessage.orderTotal) > 0 ? String(updatedMessage.orderTotal) : (acceptedQty * pricePerLiter).toString();
          await db.insert(orders).values({
            milkmanId: updatedMessage.milkmanId,
            customerId: updatedMessage.customerId,
            orderedBy: updatedMessage.senderId,
            quantity: acceptedQty.toString(),
            pricePerLiter: milkman.pricePerLiter,
            totalAmount,
            status: "confirmed",
            deliveryDate: /* @__PURE__ */ new Date(),
            createdAt: /* @__PURE__ */ new Date(),
            updatedAt: /* @__PURE__ */ new Date()
          });
        }
      }
    }
    if (updatedMessage.orderProduct || acceptedItems.length > 0) {
      try {
        const milkman = await db.query.milkmen.findFirst({
          where: eq18(milkmen.id, updatedMessage.milkmanId)
        });
        if (milkman && milkman.dairyItems) {
          const dairyItems = milkman.dairyItems;
          const deduction = {};
          if (acceptedItems.length > 0) {
            for (const it of acceptedItems) {
              if (!it.product) continue;
              const key = String(it.product).toLowerCase();
              deduction[key] = (deduction[key] || 0) + (parseFloat(it.quantity) || 0);
            }
          } else if (updatedMessage.orderProduct && updatedMessage.orderQuantity) {
            deduction[updatedMessage.orderProduct.toLowerCase()] = parseFloat(updatedMessage.orderQuantity);
          }
          const updatedItems = dairyItems.map((item) => {
            const deduct = deduction[String(item.name).toLowerCase()];
            if (deduct) {
              const currentQty = parseFloat(item.quantity || "0");
              const newQty = Math.max(0, currentQty - deduct);
              return { ...item, quantity: newQty };
            }
            return item;
          });
          await db.update(milkmen).set({
            dairyItems: updatedItems,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq18(milkmen.id, updatedMessage.milkmanId));
          broadcast({
            type: "inventory_update",
            milkmanId: updatedMessage.milkmanId,
            data: {
              message: `Inventory updated: ${updatedMessage.orderProduct || Object.keys(deduction).join(", ") || "order"}`,
              dairyItems: updatedItems
            }
          }, await partyUserIds({ milkmanId: updatedMessage.milkmanId }));
        }
      } catch (invError) {
        console.error("Failed to update JSONB inventory:", invError);
      }
    }
    if (updatedMessage.senderType === "customer" && updatedMessage.customerId) {
      try {
        await db.insert(notifications).values({
          userId: updatedMessage.senderId,
          title: "Order Accepted",
          message: `Your order for ${updatedMessage.orderProduct || "items"} has been accepted.`,
          type: "order",
          relatedId: updatedMessage.id,
          isRead: false
        });
        const customerUser = await db.query.users.findFirst({
          where: eq18(users.id, updatedMessage.senderId)
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
  } catch (error) {
    console.error("Accept order error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error" });
    }
  }
});
router9.post("/messages/:id/delivered", async (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    if (isNaN(messageId)) {
      return res.status(400).json({ message: "Invalid message ID" });
    }
    const [updatedMessage] = await db.update(chatMessages).set({
      isDelivered: true,
      deliveredAt: /* @__PURE__ */ new Date(),
      isEditable: false
    }).where(and13(
      eq18(chatMessages.id, messageId),
      eq18(chatMessages.isDelivered, false)
    )).returning();
    if (!updatedMessage) {
      const [existing] = await db.select().from(chatMessages).where(eq18(chatMessages.id, messageId)).limit(1);
      if (!existing) {
        return res.status(404).json({ message: "Message not found" });
      }
      return res.json(existing);
    }
    res.json(updatedMessage);
    broadcast({
      type: "order_delivered",
      messageId: updatedMessage.id,
      customerId: updatedMessage.customerId,
      milkmanId: updatedMessage.milkmanId
    }, await partyUserIds({
      customerId: updatedMessage.customerId,
      milkmanId: updatedMessage.milkmanId,
      familyChatId: updatedMessage.familyChatId
    }));
    const deliveredItems = Array.isArray(updatedMessage.orderItems) ? updatedMessage.orderItems : [];
    const isOrderMessage = !!updatedMessage.orderQuantity || deliveredItems.length > 0;
    if (isOrderMessage && updatedMessage.customerId !== null) {
      let [pendingOrder] = await db.select().from(orders).where(eq18(orders.specialInstructions, `chatMsg:${updatedMessage.id}`)).limit(1);
      if (!pendingOrder) {
        [pendingOrder] = await db.select().from(orders).where(
          and13(
            eq18(orders.milkmanId, updatedMessage.milkmanId),
            eq18(orders.customerId, updatedMessage.customerId),
            eq18(orders.status, "pending")
          )
        ).orderBy(desc7(orders.createdAt)).limit(1);
      }
      if (pendingOrder) {
        await db.update(orders).set({
          status: "delivered",
          deliveredAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq18(orders.id, pendingOrder.id));
        console.log(`Order ${pendingOrder.id} confirmed as delivered from chat message ${messageId}`);
      }
      if (updatedMessage.customerId) {
        const customerUser = await db.query.users.findFirst({
          where: eq18(users.id, updatedMessage.senderId)
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
      const [currentCustomer] = await db.select().from(customers).where(eq18(customers.id, updatedMessage.customerId)).limit(1);
      if (currentCustomer && currentCustomer.routeOrder !== null) {
        const [nextCustomer] = await db.select().from(customers).where(and13(
          eq18(customers.assignedMilkmanId, updatedMessage.milkmanId),
          gt3(customers.routeOrder, currentCustomer.routeOrder)
        )).orderBy(asc2(customers.routeOrder)).limit(1);
        if (nextCustomer) {
          const [milkmanData] = await db.select().from(milkmen).where(eq18(milkmen.id, updatedMessage.milkmanId)).limit(1);
          if (milkmanData) {
            await nudgeCustomerToOrder(milkmanData, nextCustomer);
          }
        }
      }
    }
  } catch (error) {
    console.error("Mark delivered error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error" });
    }
  }
});
var chatRoutes_default = router9;

// server/locationRoutes.ts
init_db();
init_schema();
import { Router as Router10 } from "express";
import { eq as eq19, desc as desc8 } from "drizzle-orm";
var router10 = Router10();
router10.get("/milkman/:milkmanId", async (req, res) => {
  try {
    const milkmanId = parseInt(req.params.milkmanId);
    if (isNaN(milkmanId)) {
      return res.status(400).json({ message: "Invalid milkman ID" });
    }
    if (!await canTrackMilkman(req, milkmanId)) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const [latestLocation] = await db.select().from(locations).where(eq19(locations.milkmanId, milkmanId)).orderBy(desc8(locations.timestamp)).limit(1);
    if (!latestLocation) {
      return res.status(404).json({ message: "Location not found" });
    }
    res.json(latestLocation);
  } catch (error) {
    console.error("Get location error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router10.post("/", async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const me = await callerIdentities(req);
    if (me.milkmanId == null) {
      return res.status(403).json({ message: "Not a milkman account" });
    }
    if (latitude == null || longitude == null) {
      return res.status(400).json({ message: "latitude and longitude are required" });
    }
    const [newLocation] = await db.insert(locations).values({
      milkmanId: me.milkmanId,
      latitude: latitude.toString(),
      longitude: longitude.toString()
    }).returning();
    res.json(newLocation);
  } catch (error) {
    console.error("Update location error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
var locationRoutes_default = router10;

// server/routes.ts
init_gatewayRoutes();

// server/productRoutes.ts
init_db();
init_schema();
import { Router as Router12 } from "express";
import { eq as eq21 } from "drizzle-orm";
var router12 = Router12();
router12.get("/", async (req, res) => {
  try {
    const { search, category, maxPrice, milkmanId } = req.query;
    let query = db.select({
      product: products,
      milkman: milkmen
    }).from(products).innerJoin(milkmen, eq21(products.milkmanId, milkmen.id)).where(eq21(products.isAvailable, true));
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
var productRoutes_default = router12;

// server/deliveryRoutes.ts
init_db();
init_schema();
import { Router as Router13 } from "express";
import { eq as eq22, and as and16, asc as asc3, gt as gt4, gte as gte3, desc as desc9, sql as sql3 } from "drizzle-orm";
import jwt4 from "jsonwebtoken";
var router13 = Router13();
var JWT_SECRET4 = process.env.JWT_SECRET;
if (!JWT_SECRET4) throw new Error("JWT_SECRET is required");
var MAPBOX_TOKEN = process.env.MAPBOX_SECRET_TOKEN || process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
router13.get("/queue", async (req, res) => {
  try {
    const [customer] = await db.select().from(customers).where(eq22(customers.userId, req.user.id)).limit(1);
    if (!customer || !customer.assignedMilkmanId) {
      return res.json({ yourStop: null, totalStops: 0, stopsAhead: null });
    }
    const milkmanId = customer.assignedMilkmanId;
    const route = await db.select().from(customers).where(eq22(customers.assignedMilkmanId, milkmanId)).orderBy(asc3(customers.routeOrder));
    const memberships = await db.select({ chatId: familyChatMembers.chatId, userId: familyChatMembers.userId }).from(familyChatMembers).innerJoin(familyChats, eq22(familyChatMembers.chatId, familyChats.id)).where(and16(eq22(familyChats.milkmanId, milkmanId), eq22(familyChats.isActive, true)));
    const chatByUser = new Map(memberships.map((m) => [m.userId, m.chatId]));
    const doorOf = (c) => c.userId && chatByUser.get(c.userId) != null ? `c${chatByUser.get(c.userId)}` : `u${c.id}`;
    const doors = [];
    for (const c of route) {
      const door = doorOf(c);
      const existing = doors.find((d) => d.door === door);
      if (existing) {
        existing.customerIds.push(c.id);
        existing.routeOrder = Math.min(existing.routeOrder, c.routeOrder ?? 0);
      } else {
        doors.push({ door, routeOrder: c.routeOrder ?? 0, customerIds: [c.id] });
      }
    }
    doors.sort((a, b) => a.routeOrder - b.routeOrder);
    const myDoor = doorOf(customer);
    const totalStops = doors.length;
    const myIndex = doors.findIndex((d) => d.door === myDoor);
    const yourStop = myIndex >= 0 ? myIndex + 1 : null;
    const todayStart = /* @__PURE__ */ new Date();
    todayStart.setHours(0, 0, 0, 0);
    const deliveredRows = await db.select({ customerId: chatMessages.customerId }).from(chatMessages).where(
      and16(
        eq22(chatMessages.milkmanId, milkmanId),
        eq22(chatMessages.messageType, "order"),
        // isDelivered is what the delivery run sets and what the
        // third tick renders from. isDeliveryConfirmed is written by
        // nothing, so reading it here kept every stop "ahead" of the
        // customer for the whole run.
        eq22(chatMessages.isDelivered, true),
        gte3(chatMessages.createdAt, todayStart)
      )
    );
    const deliveredSet = new Set(deliveredRows.map((d) => d.customerId));
    const stopsAhead = doors.filter(
      (d, i) => i < myIndex && !d.customerIds.every((id) => deliveredSet.has(id))
    ).length;
    res.json({ yourStop, totalStops, stopsAhead });
  } catch (error) {
    console.error("Queue position error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router13.post("/complete", async (req, res) => {
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
    const [milkman] = await db.select().from(milkmen).where(eq22(milkmen.userId, milkmanUserId)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    const [completedCustomer] = await db.select().from(customers).where(eq22(customers.id, customerId)).limit(1);
    if (!completedCustomer || completedCustomer.assignedMilkmanId !== milkman.id) {
      return res.status(400).json({ message: "Invalid customer for this milkman" });
    }
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const [activeOrder] = await db.select().from(orders).where(
      and16(
        eq22(orders.customerId, customerId),
        eq22(orders.milkmanId, milkman.id),
        eq22(orders.status, "confirmed")
      )
    ).limit(1);
    if (activeOrder) {
      await db.update(orders).set({
        status: "delivered",
        deliveredAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq22(orders.id, activeOrder.id));
      const customerUser = await db.query.users.findFirst({
        where: eq22(users.id, completedCustomer.userId)
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
      and16(
        eq22(customers.assignedMilkmanId, milkman.id),
        gt4(customers.routeOrder, completedCustomer.routeOrder || 0)
      )
    ).orderBy(asc3(customers.routeOrder)).limit(1);
    let notificationSent = false;
    let nextCustomerName = null;
    if (nextCustomer) {
      nextCustomerName = nextCustomer.name;
      console.log(`[Notification] Sending 'Get Ready' to ${nextCustomer.name} (${nextCustomer.phone})`);
      const nextCustomerUser = await db.query.users.findFirst({
        where: eq22(users.id, nextCustomer.userId)
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
router13.get("/geocode", async (req, res) => {
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
router13.get("/location/:orderId", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    jwt4.verify(token, JWT_SECRET4);
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }
    const [order] = await db.select().from(orders).where(eq22(orders.id, orderId)).limit(1);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    const [latestLocation] = await db.select().from(locations).where(eq22(locations.milkmanId, order.milkmanId)).orderBy(desc9(locations.timestamp)).limit(1);
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
router13.get("/location/:orderId/history", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    jwt4.verify(token, JWT_SECRET4);
    const orderId = parseInt(req.params.orderId);
    if (isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }
    const [order] = await db.select().from(orders).where(eq22(orders.id, orderId)).limit(1);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    const history = await db.select().from(locations).where(eq22(locations.milkmanId, order.milkmanId)).orderBy(desc9(locations.timestamp)).limit(25);
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
router13.post("/location", async (req, res) => {
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
    const [milkman] = await db.select().from(milkmen).where(eq22(milkmen.userId, milkmanUserId)).limit(1);
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
      sql3`DELETE FROM locations WHERE milkman_id = ${milkman.id} AND id NOT IN (
                SELECT id FROM locations WHERE milkman_id = ${milkman.id}
                ORDER BY timestamp DESC LIMIT 200
            )`
    );
    res.json({ success: true, location: newLocation });
    try {
      const routeCustomers = await db.select().from(customers).where(eq22(customers.assignedMilkmanId, milkman.id)).orderBy(asc3(customers.routeOrder));
      const curLat = parseFloat(latitude);
      const curLng = parseFloat(longitude);
      for (let i = 0; i < routeCustomers.length - 1; i++) {
        const stop = routeCustomers[i];
        if (!stop.latitude || !stop.longitude) continue;
        const reached = distanceMetres(
          curLat,
          curLng,
          parseFloat(stop.latitude),
          parseFloat(stop.longitude)
        ) <= PROXIMITY_THRESHOLD_M;
        if (reached) {
          await nudgeCustomerToOrder(milkman, routeCustomers[i + 1]);
        }
      }
    } catch (proxErr) {
      console.error("Route proximity check failed:", proxErr);
    }
  } catch (error) {
    console.error("Update milkman location error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Server error" });
    }
  }
});
router13.post("/start-route", async (req, res) => {
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
    const [milkman] = await db.select().from(milkmen).where(eq22(milkmen.userId, decoded.id)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    const routeCustomers = await db.select().from(customers).where(eq22(customers.assignedMilkmanId, milkman.id)).orderBy(asc3(customers.routeOrder));
    await notifyUsers(
      routeCustomers.map((c) => c.userId),
      "Delivery started",
      `${milkman.businessName || "Your milkman"} has started today's round.`,
      { type: "delivery_started", relatedId: milkman.id }
    );
    let firstNudged = false;
    if (routeCustomers.length > 0) {
      firstNudged = await nudgeCustomerToOrder(milkman, routeCustomers[0]);
    }
    res.json({ success: true, stops: routeCustomers.length, firstCustomerNotified: firstNudged });
  } catch (error) {
    console.error("Start route error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
var deliveryRoutes_default = router13;

// server/subscriptionRoutes.ts
init_db();
init_schema();
import { Router as Router14 } from "express";
import { eq as eq23, and as and17, desc as desc10 } from "drizzle-orm";
var router14 = Router14();
router14.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const [customer] = await db.select().from(customers).where(eq23(customers.userId, userId)).limit(1);
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
router14.get("/customer", async (req, res) => {
  try {
    const userId = req.user.id;
    const [customer] = await db.select().from(customers).where(eq23(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    const customerSubscriptions = await db.select().from(subscriptions).where(eq23(subscriptions.customerId, customer.id)).orderBy(desc10(subscriptions.createdAt));
    res.json(customerSubscriptions);
  } catch (error) {
    console.error("Get customer subscriptions error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router14.get("/milkman", async (req, res) => {
  try {
    const userId = req.user.id;
    const [milkman] = await db.select().from(milkmen).where(eq23(milkmen.userId, userId)).limit(1);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    const milkmanSubscriptions = await db.select().from(subscriptions).where(eq23(subscriptions.milkmanId, milkman.id)).orderBy(desc10(subscriptions.createdAt));
    res.json(milkmanSubscriptions);
  } catch (error) {
    console.error("Get milkman subscriptions error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router14.patch("/:id/toggle", async (req, res) => {
  try {
    const userId = req.user.id;
    const subscriptionId = parseInt(req.params.id);
    const [customer] = await db.select().from(customers).where(eq23(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    const [existing] = await db.select().from(subscriptions).where(and17(eq23(subscriptions.id, subscriptionId), eq23(subscriptions.customerId, customer.id))).limit(1);
    if (!existing) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    const [updated] = await db.update(subscriptions).set({
      isActive: !existing.isActive,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq23(subscriptions.id, subscriptionId)).returning();
    res.json(updated);
  } catch (error) {
    console.error("Toggle subscription error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router14.patch("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const subscriptionId = parseInt(req.params.id);
    const [customer] = await db.select().from(customers).where(eq23(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    const [existing] = await db.select().from(subscriptions).where(and17(eq23(subscriptions.id, subscriptionId), eq23(subscriptions.customerId, customer.id))).limit(1);
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
    const [updated] = await db.update(subscriptions).set(updateData).where(eq23(subscriptions.id, subscriptionId)).returning();
    res.json(updated);
  } catch (error) {
    console.error("Update subscription error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router14.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const subscriptionId = parseInt(req.params.id);
    const [customer] = await db.select().from(customers).where(eq23(customers.userId, userId)).limit(1);
    if (!customer) {
      return res.status(404).json({ message: "Customer profile not found" });
    }
    const [existing] = await db.select().from(subscriptions).where(and17(eq23(subscriptions.id, subscriptionId), eq23(subscriptions.customerId, customer.id))).limit(1);
    if (!existing) {
      return res.status(404).json({ message: "Subscription not found" });
    }
    await db.delete(subscriptions).where(eq23(subscriptions.id, subscriptionId));
    res.json({ message: "Subscription deleted" });
  } catch (error) {
    console.error("Delete subscription error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
var subscriptionRoutes_default = router14;

// server/customerPricingRoutes.ts
init_db();
init_schema();
import { Router as Router15 } from "express";
import { eq as eq24, and as and18, isNull as isNull3 } from "drizzle-orm";
var router15 = Router15();
async function announcePriceChange(milkmanId, customerId, productName, newPrice, oldPrice) {
  try {
    const [milkman] = await db.select().from(milkmen).where(eq24(milkmen.id, milkmanId)).limit(1);
    if (!milkman) return;
    const item = productName || "milk";
    const wasSame = oldPrice != null && Number(oldPrice) === newPrice;
    if (wasSame) return;
    const text2 = oldPrice != null ? `Price updated \u2014 ${item}: \u20B9${Number(oldPrice).toFixed(2)} \u2192 \u20B9${newPrice.toFixed(2)} per unit.` : `Price set \u2014 ${item}: \u20B9${newPrice.toFixed(2)} per unit.`;
    const [msg] = await db.insert(chatMessages).values({
      customerId,
      milkmanId,
      senderId: milkman.userId,
      senderType: "milkman",
      message: text2,
      messageType: "notification"
    }).returning();
    broadcast(
      { type: "new_message", message: msg, customerId, milkmanId },
      await partyUserIds({ customerId, milkmanId })
    );
  } catch (err) {
    console.error("Failed to announce price change:", err);
  }
}
async function getMilkmanForUser(userId) {
  const [milkman] = await db.select().from(milkmen).where(eq24(milkmen.userId, userId)).limit(1);
  return milkman;
}
router15.get("/", async (req, res) => {
  try {
    const milkman = await getMilkmanForUser(req.user.id);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    const rows = await db.select().from(customerPricings).where(eq24(customerPricings.milkmanId, milkman.id));
    res.json(rows);
  } catch (error) {
    console.error("Get customer pricings error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router15.get("/customer/:customerId", async (req, res) => {
  try {
    const milkman = await getMilkmanForUser(req.user.id);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    const customerId = parseInt(req.params.customerId);
    if (isNaN(customerId)) {
      return res.status(400).json({ message: "Invalid customer id" });
    }
    const [customer] = await db.select().from(customers).where(eq24(customers.id, customerId)).limit(1);
    if (!customer || customer.assignedMilkmanId !== milkman.id) {
      return res.status(403).json({ message: "Not your customer" });
    }
    const overrides = await db.select().from(customerPricings).where(and18(
      eq24(customerPricings.milkmanId, milkman.id),
      eq24(customerPricings.customerId, customerId)
    ));
    const orderMessages = await db.select({ product: chatMessages.orderProduct, items: chatMessages.orderItems }).from(chatMessages).where(and18(
      eq24(chatMessages.milkmanId, milkman.id),
      eq24(chatMessages.customerId, customerId),
      eq24(chatMessages.messageType, "order")
    ));
    const ordered = /* @__PURE__ */ new Set();
    for (const m of orderMessages) {
      if (m.product) ordered.add(m.product);
      const items = Array.isArray(m.items) ? m.items : [];
      for (const it of items) {
        const name = it.product || it.name || it.productName;
        if (name) ordered.add(String(name));
      }
    }
    const catalogue = Array.isArray(milkman.dairyItems) ? milkman.dairyItems : [];
    const blanket = overrides.find((o) => o.productName == null);
    const services = catalogue.map((item) => {
      const override = overrides.find((o) => o.productName === item.name);
      const listPrice = parseFloat(item.price || "0") || 0;
      const custom = override ? parseFloat(override.pricePerLiter) : blanket ? parseFloat(blanket.pricePerLiter) : null;
      return {
        product: item.name,
        unit: item.unit || "litre",
        listPrice,
        customPrice: custom,
        effectivePrice: custom ?? listPrice,
        isCustom: custom != null,
        opted: ordered.has(item.name)
      };
    });
    services.sort((a, b) => Number(b.opted) - Number(a.opted));
    res.json({ customerId, customerName: customer.name, services });
  } catch (error) {
    console.error("Get customer services error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router15.post("/", async (req, res) => {
  try {
    const milkman = await getMilkmanForUser(req.user.id);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    const { customerId, pricePerLiter, notes, productName } = req.body;
    if (!customerId || pricePerLiter === void 0 || pricePerLiter === null) {
      return res.status(400).json({ message: "customerId and pricePerLiter are required" });
    }
    const price = Number(pricePerLiter);
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ message: "pricePerLiter must be greater than zero" });
    }
    const product = productName ?? null;
    const [existing] = await db.select().from(customerPricings).where(
      and18(
        eq24(customerPricings.milkmanId, milkman.id),
        eq24(customerPricings.customerId, customerId),
        product === null ? isNull3(customerPricings.productName) : eq24(customerPricings.productName, product)
      )
    ).limit(1);
    if (existing) {
      const [updated] = await db.update(customerPricings).set({
        pricePerLiter: String(price),
        notes: notes ?? existing.notes,
        isActive: true,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq24(customerPricings.id, existing.id)).returning();
      res.json(updated);
      await announcePriceChange(milkman.id, customerId, product, price, existing.pricePerLiter);
      return;
    }
    const [created] = await db.insert(customerPricings).values({
      milkmanId: milkman.id,
      customerId,
      productName: product,
      pricePerLiter: String(price),
      notes: notes ?? null
    }).returning();
    res.json(created);
    await announcePriceChange(milkman.id, customerId, product, price, null);
  } catch (error) {
    console.error("Create customer pricing error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router15.put("/:id", async (req, res) => {
  try {
    const milkman = await getMilkmanForUser(req.user.id);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid pricing ID" });
    }
    const [existing] = await db.select().from(customerPricings).where(
      and18(
        eq24(customerPricings.id, id),
        eq24(customerPricings.milkmanId, milkman.id)
      )
    ).limit(1);
    if (!existing) {
      return res.status(404).json({ message: "Pricing rule not found" });
    }
    const { pricePerLiter, notes, isActive } = req.body;
    const [updated] = await db.update(customerPricings).set({
      ...pricePerLiter !== void 0 && pricePerLiter !== null ? { pricePerLiter: String(pricePerLiter) } : {},
      ...notes !== void 0 ? { notes } : {},
      ...isActive !== void 0 ? { isActive } : {},
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq24(customerPricings.id, id)).returning();
    res.json(updated);
  } catch (error) {
    console.error("Update customer pricing error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router15.delete("/:id", async (req, res) => {
  try {
    const milkman = await getMilkmanForUser(req.user.id);
    if (!milkman) {
      return res.status(404).json({ message: "Milkman profile not found" });
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid pricing ID" });
    }
    const [existing] = await db.select().from(customerPricings).where(
      and18(
        eq24(customerPricings.id, id),
        eq24(customerPricings.milkmanId, milkman.id)
      )
    ).limit(1);
    if (!existing) {
      return res.status(404).json({ message: "Pricing rule not found" });
    }
    await db.delete(customerPricings).where(eq24(customerPricings.id, id));
    res.json({ success: true, message: "Pricing rule deleted" });
  } catch (error) {
    console.error("Delete customer pricing error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
var customerPricingRoutes_default = router15;

// server/notificationRoutes.ts
init_db();
init_schema();
import { Router as Router16 } from "express";
import { eq as eq25, and as and19, desc as desc11 } from "drizzle-orm";
var router16 = Router16();
router16.get("/", async (req, res) => {
  try {
    const rows = await db.select().from(notifications).where(eq25(notifications.userId, req.user.id)).orderBy(desc11(notifications.createdAt)).limit(100);
    res.json(rows);
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router16.post("/", async (req, res) => {
  try {
    const { userId, title, message, type, relatedId } = req.body;
    if (!userId || !title || !message || !type) {
      return res.status(400).json({ message: "userId, title, message and type are required" });
    }
    const [created] = await db.insert(notifications).values({
      userId,
      title,
      message,
      type,
      relatedId: relatedId ?? null,
      isRead: false
    }).returning();
    res.json(created);
  } catch (error) {
    console.error("Create notification error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router16.patch("/mark-all-read", async (req, res) => {
  try {
    await db.update(notifications).set({ isRead: true }).where(eq25(notifications.userId, req.user.id));
    res.json({ success: true });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router16.patch("/:id/read", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }
    const [updated] = await db.update(notifications).set({ isRead: true }).where(
      and19(
        eq25(notifications.id, id),
        eq25(notifications.userId, req.user.id)
      )
    ).returning();
    if (!updated) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json(updated);
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
var notificationRoutes_default = router16;

// server/groupRoutes.ts
init_db();
init_schema();
import { Router as Router17 } from "express";
import { eq as eq26, and as and20, inArray as inArray10, desc as desc12 } from "drizzle-orm";
init_households();
var router17 = Router17();
function makeChatCode2() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "GRP";
  for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
async function getOrCreateCustomer(req) {
  const userId = req.user.id;
  let [customer] = await db.select().from(customers).where(eq26(customers.userId, userId)).limit(1);
  if (!customer) {
    [customer] = await db.insert(customers).values({ userId, name: req.user.username || null, phone: req.user.phone || null }).returning();
  }
  return customer;
}
router17.post("/", async (req, res) => {
  try {
    const { name, milkmanId } = req.body;
    if (!name || !milkmanId) {
      return res.status(400).json({ message: "name and milkmanId are required" });
    }
    const [milkman] = await db.select().from(milkmen).where(eq26(milkmen.id, milkmanId)).limit(1);
    if (!milkman) return res.status(404).json({ message: "Milkman not found" });
    let chatCode = makeChatCode2();
    for (let i = 0; i < 5; i++) {
      const [clash] = await db.select().from(familyChats).where(eq26(familyChats.chatCode, chatCode)).limit(1);
      if (!clash) break;
      chatCode = makeChatCode2();
    }
    const [group] = await db.insert(familyChats).values({ chatName: name, milkmanId, createdBy: req.user.id, chatCode, isActive: true }).returning();
    await db.insert(familyChatMembers).values({ chatId: group.id, userId: req.user.id, isAdmin: true });
    const customer = await getOrCreateCustomer(req);
    await addDairyman(customer.id, milkmanId);
    await retireOtherSoloHouseholds(req.user.id, milkmanId, group.id);
    res.json(group);
  } catch (error) {
    console.error("Create group error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router17.post("/join", async (req, res) => {
  try {
    const { chatCode } = req.body;
    if (!chatCode) return res.status(400).json({ message: "chatCode is required" });
    const [group] = await db.select().from(familyChats).where(and20(eq26(familyChats.chatCode, String(chatCode).toUpperCase().trim()), eq26(familyChats.isActive, true))).limit(1);
    if (!group) return res.status(404).json({ message: "Group not found or inactive" });
    const [existing] = await db.select().from(familyChatMembers).where(and20(eq26(familyChatMembers.chatId, group.id), eq26(familyChatMembers.userId, req.user.id))).limit(1);
    if (!existing) {
      await db.insert(familyChatMembers).values({ chatId: group.id, userId: req.user.id, isAdmin: false });
      notifyOps("household", `Joined household "${group.chatName}" \u2014 a new member is now on dairyman #${group.milkmanId}`);
    }
    const customer = await getOrCreateCustomer(req);
    await addDairyman(customer.id, group.milkmanId);
    await retireOtherSoloHouseholds(req.user.id, group.milkmanId, group.id);
    res.json(group);
  } catch (error) {
    console.error("Join group error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router17.get("/mine", async (req, res) => {
  try {
    const memberships = await db.select().from(familyChatMembers).where(eq26(familyChatMembers.userId, req.user.id));
    if (memberships.length === 0) return res.json(null);
    const chatIds = memberships.map((m) => m.chatId);
    const [group] = await db.select().from(familyChats).where(and20(inArray10(familyChats.id, chatIds), eq26(familyChats.isActive, true))).orderBy(desc12(familyChats.createdAt)).limit(1);
    if (!group) return res.json(null);
    const members = await db.select().from(familyChatMembers).where(eq26(familyChatMembers.chatId, group.id));
    const [milkman] = await db.select().from(milkmen).where(eq26(milkmen.id, group.milkmanId)).limit(1);
    res.json({ ...group, members, milkman, memberCount: members.length });
  } catch (error) {
    console.error("Get my group error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router17.get("/:id/bill", async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    if (isNaN(groupId)) return res.status(400).json({ message: "Invalid group ID" });
    const bill = await BillingService.generateGroupBill(groupId);
    res.json(bill || { totalAmount: "0", totalOrders: 0, items: [] });
  } catch (error) {
    console.error("Get group bill error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router17.post("/:id/discontinue", async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    if (isNaN(groupId)) return res.status(400).json({ message: "Invalid group ID" });
    const [group] = await db.select().from(familyChats).where(eq26(familyChats.id, groupId)).limit(1);
    if (!group) return res.status(404).json({ message: "Group not found" });
    const [membership] = await db.select().from(familyChatMembers).where(and20(eq26(familyChatMembers.chatId, groupId), eq26(familyChatMembers.userId, req.user.id))).limit(1);
    if (!membership) return res.status(403).json({ message: "Not a member of this group" });
    const pending = await db.select().from(bills).where(and20(eq26(bills.familyChatId, groupId), eq26(bills.status, "pending")));
    if (pending.length > 0) {
      return res.status(400).json({
        message: "Pending group bill exists",
        pendingCount: pending.length,
        totalAmount: pending.reduce((s, b) => s + parseFloat(b.totalAmount), 0)
      });
    }
    const members = await db.select().from(familyChatMembers).where(eq26(familyChatMembers.chatId, groupId));
    const memberUserIds = members.map((m) => m.userId);
    if (memberUserIds.length > 0) {
      const memberCustomers = await db.select({ id: customers.id }).from(customers).where(inArray10(customers.userId, memberUserIds));
      for (const c of memberCustomers) {
        await removeDairyman(c.id, group.milkmanId);
      }
    }
    await db.delete(familyChatMembers).where(eq26(familyChatMembers.chatId, groupId));
    await db.update(familyChats).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq26(familyChats.id, groupId));
    broadcast({ type: "group_discontinued", groupId, milkmanId: group.milkmanId });
    res.json({ success: true });
  } catch (error) {
    console.error("Discontinue group error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
var groupRoutes_default = router17;

// server/legalPages.ts
import { Router as Router18 } from "express";
var router18 = Router18();
var LAST_UPDATED = "30 May 2026";
var CONTACT_EMAIL = "siddhantsancheti200207@gmail.com";
function page(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title} \u2014 DOOODHWALA</title>
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
  <div class="brand">\u2764\uFE0F <b>DOOODHWALA</b></div>
  <h1>${title}</h1>
  <p class="muted">Last updated: ${LAST_UPDATED}</p>
  ${bodyHtml}
  <footer>
    DOOODHWALA \u2014 Daily milk &amp; dairy delivery. Questions? Email
    <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.
  </footer>
</body>
</html>`;
}
router18.get("/privacy", (_req, res) => {
  res.type("html").send(page("Privacy Policy", `
    <p>DOOODHWALA ("we", "us", "our") operates the DOOODHWALA mobile application and website
    (the "Service"), a platform connecting customers with local milk/dairy delivery providers
    ("dairymen"). This Privacy Policy explains what information we collect, how we use it, and
    your choices. By using the Service you agree to this policy.</p>

    <h2>1. Information We Collect</h2>
    <ul>
      <li><b>Phone number</b> \u2014 used to create your account and verify your identity via OTP.</li>
      <li><b>Profile details</b> \u2014 name, delivery address, and (optionally) email.</li>
      <li><b>Location</b> \u2014 your delivery address coordinates, and, for dairymen, live GPS during
      active deliveries to provide real-time order tracking and proximity reminders.</li>
      <li><b>Order &amp; billing data</b> \u2014 products ordered, quantities, delivery times, and bills.</li>
      <li><b>Payment information</b> \u2014 processed securely by our payment partner (Razorpay). We do
      not store your full card or UPI credentials on our servers.</li>
      <li><b>Device information</b> \u2014 push-notification token and basic device data to deliver alerts.</li>
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
      <li><b>Your dairyman</b> \u2014 your name, address, contact, and orders, so they can deliver.</li>
      <li><b>Household group members</b> \u2014 if you join a shared group, order and bill information
      is visible to members of that group.</li>
      <li><b>Service providers</b> \u2014 Google Firebase (authentication, notifications), Razorpay
      (payments), and our hosting/maps providers, who process data on our behalf.</li>
      <li><b>Legal</b> \u2014 where required by law or to protect rights and safety.</li>
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
    <p>DOOODHWALA \u2014 <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
    `));
});
router18.get("/terms", (_req, res) => {
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
    <p>DOOODHWALA \u2014 <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
    `));
});
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function markdownToHtml(md) {
  const out = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };
  const inline = (s) => escapeHtml(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  for (const rawLine of md.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      continue;
    }
    if (line.startsWith("## ")) {
      closeList();
      out.push(`<h2>${inline(line.slice(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      closeList();
      out.push(`<h1>${inline(line.slice(2))}</h1>`);
    } else if (line.startsWith("- ")) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(line.slice(2))}</li>`);
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return out.join("\n");
}
router18.get("/api/legal/terms/:role", (req, res) => {
  const { role } = req.params;
  if (!isTermsRole(role)) {
    return res.status(404).json({ message: "Unknown terms role" });
  }
  const doc = TERMS[role];
  res.json({
    role: doc.role,
    version: doc.version,
    lastUpdated: doc.lastUpdated,
    title: doc.title,
    markdown: doc.markdown
  });
});
router18.get("/terms/:role", (req, res) => {
  const { role } = req.params;
  if (!isTermsRole(role)) {
    return res.status(404).type("html").send(page("Not found", "<p>Unknown terms page.</p>"));
  }
  const doc = TERMS[role];
  const body = markdownToHtml(doc.markdown).replace(/^<h1>.*?<\/h1>\n?/, "");
  res.type("html").send(page(doc.title, body));
});
var legalPages_default = router18;

// server/middleware/auth.ts
init_db();
init_schema();
import jwt5 from "jsonwebtoken";
import { eq as eq27 } from "drizzle-orm";
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
    const [user] = await db.select().from(users).where(eq27(users.id, decoded.id)).limit(1);
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

// server/middleware/adminDevice.ts
import crypto3 from "crypto";
var RAW_KEYS = (process.env.ADMIN_DEVICE_KEYS || "").split(",").map((k) => k.trim()).filter(Boolean);
if (RAW_KEYS.length === 0) {
  console.warn(
    "[AdminDevice] ADMIN_DEVICE_KEYS is not set \u2014 the admin API is protected by phone number alone. Set it to lock admin to known machines."
  );
}
function matches(candidate) {
  const given = Buffer.from(candidate);
  return RAW_KEYS.some((key) => {
    const expected = Buffer.from(key);
    if (expected.length !== given.length) return false;
    return crypto3.timingSafeEqual(expected, given);
  });
}
function requireAdminDevice(req, res, next) {
  if (RAW_KEYS.length === 0) return next();
  const provided = req.headers["x-admin-device"] || req.query.device;
  if (!provided || !matches(provided)) {
    console.warn(
      `[AdminDevice] Refused admin request from ${req.ip} for ${req.method} ${req.path}` + (provided ? " \u2014 device key not recognised" : " \u2014 no device key presented")
    );
    return res.status(403).json({
      message: "This device is not authorised for admin access.",
      code: "ADMIN_DEVICE_REQUIRED"
    });
  }
  next();
}

// server/userRoutes.ts
import { Router as Router19 } from "express";

// server/multer.ts
import multer4 from "multer";
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
var upload2 = multer4({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
    // 5MB limit
  }
});
var multer_default = upload2;

// server/userRoutes.ts
init_db();
init_schema();
import { eq as eq28 } from "drizzle-orm";
var router19 = Router19();
router19.post("/profile-image", authenticateToken, multer_default.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image uploaded" });
    }
    const userId = req.user.id;
    const imageUrl = req.file.path;
    await db.update(users).set({ profileImageUrl: imageUrl }).where(eq28(users.id, userId));
    res.json({ success: true, imageUrl });
  } catch (error) {
    console.error("Profile image upload error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router19.patch("/profile", authenticateToken, async (req, res) => {
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
    await db.update(users).set(updateData).where(eq28(users.id, userId));
    res.json({ success: true, message: "Basic profile updated successfully" });
  } catch (error) {
    console.error("Basic profile update error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router19.patch("/fcm-token", authenticateToken, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user.id;
    if (!fcmToken) {
      return res.status(400).json({ message: "fcmToken is required" });
    }
    await db.update(users).set({ fcmToken }).where(eq28(users.id, userId));
    res.json({ success: true, message: "FCM token updated successfully" });
  } catch (error) {
    console.error("FCM token update error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
var userRoutes_default = router19;

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
  const paymentsAuth = (req, res, next) => {
    if (req.path.startsWith("/razorpay/webhook") || req.path.startsWith("/stripe/webhook")) {
      return next();
    }
    return authenticateToken(req, res, next);
  };
  app2.use("/api/payments", paymentsAuth, paymentRoutes_default);
  app2.use("/api/delivery", authenticateToken, deliveryRoutes_default);
  app2.use("/api/chat", authenticateToken, chatRoutes_default);
  app2.use("/api/subscriptions", authenticateToken, subscriptionRoutes_default);
  app2.use("/api/locations", authenticateToken, locationRoutes_default);
  app2.use("/api/customer-pricings", authenticateToken, customerPricingRoutes_default);
  app2.use("/api/notifications", authenticateToken, notificationRoutes_default);
  app2.use("/api/groups", authenticateToken, groupRoutes_default);
  app2.use("/api/ads", authenticateToken, adRoutes_default);
  app2.use("/api/admin", authenticateToken, authorizeRole(["admin"]), requireAdminDevice, adminRoutes_default);
  app2.use("/api/products", authenticateToken, productRoutes_default);
  app2.use("/", legalPages_default);
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
  // The live host. It was missing, which the comment above says must never
  // happen — same-origin requests are exempt from CORS so nothing broke, but
  // the list did not describe production.
  "https://dooodhwala.duckdns.org",
  "https://dooodhwala.com",
  "https://www.dooodhwala.com",
  "http://localhost:5001",
  "http://localhost:5173",
  "http://localhost:19006",
  "http://127.0.0.1:19006"
];
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true
}));
var limiter = rateLimit2({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: process.env.NODE_ENV === "development" || !process.env.NODE_ENV ? 1e5 : 200,
  // Limit each IP to 200 requests per `window` (here, per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false
});
app.use("/api", limiter);
app.use("/api/payments/stripe/webhook", express2.raw({ type: "application/json" }));
app.use("/api/payments/razorpay/webhook", express2.raw({ type: "application/json" }));
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
  app.get("/healthz", (_req, res) => res.json({ status: "ok" }));
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
  const IST = { timezone: "Asia/Kolkata" };
  cron.schedule("30 0 1 * *", async () => {
    console.log("Running monthly billing cron job...");
    try {
      await BillingService.generateAllMonthlyBills();
    } catch (error) {
      console.error("Error in monthly billing cron job:", error);
    }
  }, IST);
  cron.schedule("*/15 * * * *", async () => {
    console.log("Running SMS retry job...");
    try {
      const { retryFailedMessages: retryFailedMessages2 } = await Promise.resolve().then(() => (init_gatewayRoutes(), gatewayRoutes_exports));
      await retryFailedMessages2();
    } catch (error) {
      console.error("Error in SMS retry job:", error);
    }
  }, IST);
  cron.schedule("0 * * * *", async () => {
    const hour = (/* @__PURE__ */ new Date()).getHours();
    const timeString = `${hour.toString().padStart(2, "0")}:00`;
    console.log(`Running Daily Order job for ${timeString}...`);
    try {
      const { customers: customers2, orders: orders2, chatMessages: chatMessages3, milkmen: milkmen2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { eq: eq29, and: and21, sql: sql4 } = await import("drizzle-orm");
      const allCustomers = await db2.select().from(customers2);
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
          and21(
            eq29(orders2.customerId, customer.id),
            sql4`${orders2.createdAt} >= ${todayStart.toISOString()}`
          )
        ).limit(1);
        if (existingOrder.length > 0) {
          console.log(`Skipping ${customer.name}: Order already exists for today.`);
          continue;
        }
        const [milkman] = await db2.select().from(milkmen2).where(eq29(milkmen2.id, customer.assignedMilkmanId)).limit(1);
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
        const { ensureHouseholdChat: ensureHouseholdChat2 } = await Promise.resolve().then(() => (init_households(), households_exports));
        await db2.insert(chatMessages3).values({
          customerId: customer.id,
          milkmanId: milkman.id,
          familyChatId: await ensureHouseholdChat2(customer.id, milkman.id),
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
  }, IST);
  cron.schedule("0 5 * * *", async () => {
    console.log("Running Subscription Order Processing...");
    try {
      const { subscriptions: subscriptions2, customers: customers2, orders: orders2, chatMessages: chatMessages3, milkmen: milkmen2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { eq: eq29, and: and21, sql: sql4 } = await import("drizzle-orm");
      const now = /* @__PURE__ */ new Date();
      const istNow = now;
      const today = istNow.getDay();
      const todayDate = istNow.getDate();
      const activeSubscriptions = await db2.select().from(subscriptions2).where(
        eq29(subscriptions2.isActive, true)
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
          and21(
            eq29(chatMessages3.customerId, sub.customerId),
            eq29(chatMessages3.milkmanId, sub.milkmanId),
            sql4`${chatMessages3.message} LIKE ${"\u{1F504} Subscription:%"}`,
            sql4`${chatMessages3.createdAt} >= ${todayStart.toISOString()}`
          )
        ).limit(1);
        if (existingOrder.length > 0) {
          console.log(`Skipping subscription #${sub.id}: already processed today.`);
          continue;
        }
        const [customer] = await db2.select().from(customers2).where(eq29(customers2.id, sub.customerId)).limit(1);
        const [milkman] = await db2.select().from(milkmen2).where(eq29(milkmen2.id, sub.milkmanId)).limit(1);
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
        const { ensureHouseholdChat: ensureHH } = await Promise.resolve().then(() => (init_households(), households_exports));
        await db2.insert(chatMessages3).values({
          customerId: sub.customerId,
          milkmanId: sub.milkmanId,
          familyChatId: await ensureHH(sub.customerId, sub.milkmanId),
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
  }, IST);
  cron.schedule("0 0 * * *", async () => {
    console.log("Running Subscription Settlement...");
    try {
      const { subscriptions: subscriptions2, customers: customers2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { eq: eq29, and: and21, lte: lte3, isNotNull: isNotNull2 } = await import("drizzle-orm");
      const istNow = /* @__PURE__ */ new Date();
      const todayStart = new Date(istNow);
      todayStart.setHours(0, 0, 0, 0);
      const ended = await db2.select().from(subscriptions2).where(and21(
        eq29(subscriptions2.isActive, true),
        isNotNull2(subscriptions2.endDate),
        lte3(subscriptions2.endDate, todayStart)
      ));
      if (ended.length === 0) {
        console.log("No subscriptions ended today.");
        return;
      }
      for (const sub of ended) {
        await db2.update(subscriptions2).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq29(subscriptions2.id, sub.id));
      }
      const milkmanIds = [...new Set(ended.map((s) => s.milkmanId))];
      for (const milkmanId of milkmanIds) {
        try {
          await BillingService.generateBillsForMilkman(milkmanId);
        } catch (err) {
          console.error(`Settlement billing failed for milkman ${milkmanId}:`, err);
        }
      }
      console.log(`Settled ${ended.length} subscription(s) across ${milkmanIds.length} milkman(s).`);
    } catch (error) {
      console.error("Error in Subscription Settlement:", error);
    }
  }, IST);
  const PORT = process.env.PORT || 5001;
  const HOST = process.env.HOST || "0.0.0.0";
  server.listen(Number(PORT), HOST, () => {
    log(`serving on port ${PORT}`);
    log(`serving on port ${PORT}`);
    console.log("Server restarted and routes registered - Forcing Update");
  });
})();
