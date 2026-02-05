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
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  username: varchar("username").unique(),
  email: varchar("email").unique(),
  phone: varchar("phone").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  userType: varchar("user_type"), // "customer", "milkman", or "admin" - nullable to allow onboarding
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  isVerified: boolean("is_verified").default(false),
  // Location fields for proximity notifications
  latitude: varchar("latitude"),
  longitude: varchar("longitude"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastActiveAt: timestamp("last_active_at"),
});

// OTP verification table
export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  phone: varchar("phone").notNull(),
  code: varchar("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const milkmen = pgTable("milkmen", {
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const customers = pgTable("customers", {
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
  autoPayEnabled: boolean("auto_pay_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  familyChatId: integer("family_chat_id").references(() => familyChats.id), // Link to family chat for family orders
  customerId: integer("customer_id").references(() => customers.id), // Individual orders
  milkmanId: integer("milkman_id").notNull().references(() => milkmen.id),
  orderedBy: varchar("ordered_by").references(() => users.id), // Which family member placed the order
  quantity: decimal("quantity", { precision: 5, scale: 2 }).notNull(),
  pricePerLiter: decimal("price_per_liter", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").notNull().default("pending"), // "pending", "confirmed", "out_for_delivery", "delivered", "cancelled"
  deliveryDate: timestamp("delivery_date").notNull(),
  deliveryTime: varchar("delivery_time"),
  specialInstructions: text("special_instructions"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payments table for secure transaction tracking
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: varchar("order_id").notNull(), // Internal order reference
  userId: varchar("user_id").notNull().references(() => users.id),
  customerId: integer("customer_id").references(() => customers.id),
  milkmanId: integer("milkman_id").references(() => milkmen.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").notNull().default("INR"),
  status: varchar("status").notNull().default("pending"), // "pending", "processing", "completed", "failed", "refunded"
  paymentMethod: varchar("payment_method").notNull(), // "razorpay", "stripe", "upi", "card", "netbanking", "cod"

  // Razorpay specific fields
  razorpayOrderId: varchar("razorpay_order_id"),
  razorpayPaymentId: varchar("razorpay_payment_id"),
  razorpaySignature: varchar("razorpay_signature"),

  // Stripe specific fields
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  stripeChargeId: varchar("stripe_charge_id"),

  // Transaction metadata
  paymentDetails: jsonb("payment_details").default({}), // Store additional payment info
  webhookData: jsonb("webhook_data").default({}), // Store webhook payload for auditing
  failureReason: text("failure_reason"),
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  refundedAt: timestamp("refunded_at"),

  // Timestamps
  initiatedAt: timestamp("initiated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Family chat groups for shared billing
export const familyChats = pgTable("family_chats", {
  id: serial("id").primaryKey(),
  chatName: varchar("chat_name").notNull(),
  milkmanId: integer("milkman_id").notNull().references(() => milkmen.id),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  chatCode: varchar("chat_code").notNull().unique(), // 6-digit code for joining
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Family chat members
export const familyChatMembers = pgTable("family_chat_members", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").notNull().references(() => familyChats.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow(),
  isAdmin: boolean("is_admin").default(false),
});

export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  familyChatId: integer("family_chat_id").references(() => familyChats.id), // Link to family chat
  customerId: integer("customer_id").references(() => customers.id), // Keep for individual bills
  milkmanId: integer("milkman_id").notNull().references(() => milkmen.id),
  billMonth: varchar("bill_month").notNull(), // YYYY-MM format for easier querying
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  totalOrders: integer("total_orders").notNull().default(0), // Number of orders in the bill
  items: jsonb("items").default([]), // Detailed line items with date, product, quantity, price
  status: varchar("status").notNull().default("pending"), // "pending", "paid", "overdue"
  dueDate: timestamp("due_date").notNull(),
  paidAt: timestamp("paid_at"),
  paidBy: varchar("paid_by").references(() => users.id), // Which family member paid
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  milkmanId: integer("milkman_id").notNull().references(() => milkmen.id),
  orderId: integer("order_id").references(() => orders.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  milkmanId: integer("milkman_id").references(() => milkmen.id),
  userId: varchar("user_id").references(() => users.id), // For general user location tracking
  latitude: varchar("latitude").notNull(),
  longitude: varchar("longitude").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Customer-specific pricing table
export const customerPricings = pgTable("customer_pricings", {
  id: serial("id").primaryKey(),
  milkmanId: integer("milkman_id").notNull().references(() => milkmen.id),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  pricePerLiter: decimal("price_per_liter", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Ensure one pricing rule per milkman-customer pair
  index("idx_milkman_customer_pricing").on(table.milkmanId, table.customerId),
]);

// Chat messages for family chats and individual conversations
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  familyChatId: integer("family_chat_id").references(() => familyChats.id), // Family chat messages
  customerId: integer("customer_id").references(() => customers.id), // Individual chat messages
  milkmanId: integer("milkman_id").notNull().references(() => milkmen.id),
  senderId: varchar("sender_id").notNull().references(() => users.id), // Who sent the message
  message: text("message").notNull(),
  orderQuantity: decimal("order_quantity", { precision: 5, scale: 2 }),
  orderProduct: varchar("order_product"), // Product name for order messages
  orderTotal: decimal("order_total", { precision: 10, scale: 2 }), // Total amount for order
  orderItems: jsonb("order_items"), // Full order details for multi-product orders
  messageType: varchar("message_type").notNull().default("text"), // "text" | "order" | "notification" | "bill" | "voice" | "join"
  billId: integer("bill_id"), // Reference to bill for bill messages
  voiceUrl: text("voice_url"), // URL for voice message files
  voiceDuration: integer("voice_duration"), // Duration in seconds
  senderType: varchar("sender_type").notNull(), // "customer" | "milkman" | "system"
  isRead: boolean("is_read").default(false),
  isDelivered: boolean("is_delivered").default(false),
  isAccepted: boolean("is_accepted").default(false),
  isDeliveryConfirmed: boolean("is_delivery_confirmed").default(false), // Third tick for delivery confirmation
  isEditable: boolean("is_editable").default(true), // Orders can be edited until delivery
  editedAt: timestamp("edited_at"),
  deliveredAt: timestamp("delivered_at"),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Service requests for custom pricing
export const serviceRequests = pgTable("service_requests", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  milkmanId: integer("milkman_id").notNull().references(() => milkmen.id),
  services: jsonb("services").notNull(), // Array of requested services
  status: varchar("status").notNull().default("pending"), // "pending", "quoted", "accepted", "rejected"
  milkmanNotes: text("milkman_notes"),
  customerNotes: text("customer_notes"),
  quotedAt: timestamp("quoted_at"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications for users
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // Can be customer or milkman user ID
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type").notNull(), // "order" | "message" | "system" | "service_request" | "proximity" | "bill"
  relatedId: integer("related_id"), // Order ID, Message ID, Service Request ID, etc.
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Third-party ads table for advertisement management
export const ads = pgTable("ads", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  imageUrl: varchar("image_url"),
  ctaText: varchar("cta_text").notNull(),
  ctaUrl: varchar("cta_url").notNull(),
  advertiserName: varchar("advertiser_name").notNull(),
  advertiserEmail: varchar("advertiser_email"),
  adType: varchar("ad_type").notNull(), // 'banner', 'sponsored', 'promotional', 'native'
  position: varchar("position").notNull(), // 'top', 'bottom', 'sidebar', 'inline', 'modal'
  targetAudience: varchar("target_audience").default("all"), // 'customers', 'milkmen', 'all'
  targetLocation: varchar("target_location"), // City/region targeting
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  conversions: integer("conversions").default(0),
  budget: decimal("budget", { precision: 10, scale: 2 }),
  costPerClick: decimal("cost_per_click", { precision: 10, scale: 2 }),
  costPerImpression: decimal("cost_per_impression", { precision: 10, scale: 4 }),
  priority: integer("priority").default(1), // Higher number = higher priority
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ad tracking for analytics and billing
export const adTracking = pgTable("ad_tracking", {
  id: serial("id").primaryKey(),
  adId: integer("ad_id").notNull().references(() => ads.id),
  userId: varchar("user_id").references(() => users.id),
  event: varchar("event").notNull(), // 'impression', 'click', 'conversion', 'dismiss'
  timestamp: timestamp("timestamp").notNull(),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  location: varchar("location"), // City/region
  deviceType: varchar("device_type"), // 'mobile', 'desktop', 'tablet'
  createdAt: timestamp("created_at").defaultNow(),
});

// SMS Queue for Android Gateway
export const smsQueue = pgTable("sms_queue", {
  id: serial("id").primaryKey(),
  phone: varchar("phone").notNull(),
  message: text("message").notNull(),
  status: varchar("status").notNull().default("pending"), // "pending", "processing", "sent", "failed"
  attempts: integer("attempts").default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  milkmanId: integer("milkman_id").notNull().references(() => milkmen.id),
  name: varchar("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit").notNull(),
  quantity: integer("quantity").default(0),
  isAvailable: boolean("is_available").default(true),
  isCustom: boolean("is_custom").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertMilkmanSchema = createInsertSchema(milkmen).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  rating: true,
  totalReviews: true,
  isAvailable: true,
  verified: true,
}).extend({
  phone: z.string().optional(), // Phone comes from user session
  latitude: z.string().optional().nullable(),
  longitude: z.string().optional().nullable(),
  dairyItems: z.array(z.object({
    name: z.string(),
    price: z.string(),
    unit: z.string(),
    isCustom: z.boolean().optional(),
    quantity: z.number().optional().default(0),
    isAvailable: z.boolean().optional().default(true),
  })).optional().default([]),
  deliverySlots: z.array(z.object({
    name: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    isActive: z.boolean().optional().default(true),
  })).optional().default([]),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBillSchema = createInsertSchema(bills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
});

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
  timestamp: true,
});

export const insertCustomerPricingSchema = createInsertSchema(customerPricings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOtpCodeSchema = createInsertSchema(otpCodes).omit({
  id: true,
  createdAt: true,
});

export const insertFamilyChatSchema = createInsertSchema(familyChats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFamilyChatMemberSchema = createInsertSchema(familyChatMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertServiceRequestSchema = createInsertSchema(serviceRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdSchema = createInsertSchema(ads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  impressions: true,
  clicks: true,
  conversions: true,
});

export const insertAdTrackingSchema = createInsertSchema(adTracking).omit({
  id: true,
  createdAt: true,
});

export const insertSmsQueueSchema = createInsertSchema(smsQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertMilkman = z.infer<typeof insertMilkmanSchema>;
export type Milkman = typeof milkmen.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof bills.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;
export type InsertCustomerPricing = z.infer<typeof insertCustomerPricingSchema>;
export type CustomerPricing = typeof customerPricings.$inferSelect;
export type InsertOtpCode = z.infer<typeof insertOtpCodeSchema>;
export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertAd = z.infer<typeof insertAdSchema>;
export type Ad = typeof ads.$inferSelect;
export type InsertAdTracking = z.infer<typeof insertAdTrackingSchema>;
export type AdTracking = typeof adTracking.$inferSelect;
export type InsertSmsQueue = z.infer<typeof insertSmsQueueSchema>;
export type SmsQueue = typeof smsQueue.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
