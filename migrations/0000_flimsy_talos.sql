CREATE TABLE "ad_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"ad_id" integer NOT NULL,
	"user_id" varchar,
	"event" varchar NOT NULL,
	"timestamp" timestamp NOT NULL,
	"ip_address" varchar,
	"user_agent" varchar,
	"location" varchar,
	"device_type" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ads" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"description" text NOT NULL,
	"image_url" varchar,
	"cta_text" varchar NOT NULL,
	"cta_url" varchar NOT NULL,
	"advertiser_name" varchar NOT NULL,
	"advertiser_email" varchar,
	"ad_type" varchar NOT NULL,
	"position" varchar NOT NULL,
	"target_audience" varchar DEFAULT 'all',
	"target_location" varchar,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"impressions" integer DEFAULT 0,
	"clicks" integer DEFAULT 0,
	"conversions" integer DEFAULT 0,
	"budget" numeric(10, 2),
	"cost_per_click" numeric(10, 2),
	"cost_per_impression" numeric(10, 4),
	"priority" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_prompts" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_name" varchar(50),
	"instruction" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_status" (
	"agent_name" varchar(50) PRIMARY KEY NOT NULL,
	"status" varchar(20),
	"last_seen" timestamp
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_chat_id" integer,
	"customer_id" integer,
	"milkman_id" integer NOT NULL,
	"bill_month" varchar NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"due_date" timestamp NOT NULL,
	"paid_at" timestamp,
	"paid_by" varchar,
	"stripe_payment_intent_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_chat_id" integer,
	"customer_id" integer,
	"milkman_id" integer NOT NULL,
	"sender_id" varchar NOT NULL,
	"message" text NOT NULL,
	"order_quantity" numeric(5, 2),
	"order_product" varchar,
	"order_total" numeric(10, 2),
	"order_items" jsonb,
	"message_type" varchar DEFAULT 'text' NOT NULL,
	"bill_id" integer,
	"voice_url" text,
	"voice_duration" integer,
	"sender_type" varchar NOT NULL,
	"is_read" boolean DEFAULT false,
	"is_delivered" boolean DEFAULT false,
	"is_accepted" boolean DEFAULT false,
	"is_delivery_confirmed" boolean DEFAULT false,
	"is_editable" boolean DEFAULT true,
	"edited_at" timestamp,
	"delivered_at" timestamp,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customer_pricings" (
	"id" serial PRIMARY KEY NOT NULL,
	"milkman_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	"price_per_liter" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar,
	"phone" varchar,
	"address" text,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"assigned_milkman_id" integer,
	"regular_order_quantity" numeric(5, 2),
	"route_order" integer DEFAULT 0,
	"preset_order" jsonb,
	"auto_pay_enabled" boolean DEFAULT false,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "family_chat_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"is_admin" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "family_chats" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_name" varchar NOT NULL,
	"milkman_id" integer NOT NULL,
	"created_by" varchar NOT NULL,
	"chat_code" varchar NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "family_chats_chat_code_unique" UNIQUE("chat_code")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"milkman_id" integer,
	"user_id" varchar,
	"latitude" varchar NOT NULL,
	"longitude" varchar NOT NULL,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "milkmen" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"contact_name" varchar NOT NULL,
	"business_name" varchar NOT NULL,
	"phone" varchar NOT NULL,
	"address" text NOT NULL,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"price_per_liter" numeric(10, 2) NOT NULL,
	"dairy_items" jsonb DEFAULT '[]'::jsonb,
	"delivery_time_start" varchar NOT NULL,
	"delivery_time_end" varchar NOT NULL,
	"delivery_slots" jsonb DEFAULT '[]'::jsonb,
	"is_available" boolean DEFAULT true,
	"rating" numeric(3, 2) DEFAULT '0',
	"total_reviews" integer DEFAULT 0,
	"verified" boolean DEFAULT false,
	"bank_account_number" varchar,
	"bank_ifsc_code" varchar,
	"bank_account_holder_name" varchar,
	"bank_account_type" varchar,
	"bank_name" varchar,
	"bank_branch" varchar,
	"upi_id" varchar,
	"commission_percentage" numeric(5, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" varchar NOT NULL,
	"related_id" integer,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"family_chat_id" integer,
	"customer_id" integer,
	"milkman_id" integer NOT NULL,
	"ordered_by" varchar,
	"quantity" numeric(5, 2) NOT NULL,
	"price_per_liter" numeric(10, 2) NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"delivery_date" timestamp NOT NULL,
	"delivery_time" varchar,
	"special_instructions" text,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" varchar NOT NULL,
	"code" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"customer_id" integer,
	"milkman_id" integer,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar DEFAULT 'INR' NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"payment_method" varchar NOT NULL,
	"razorpay_order_id" varchar,
	"razorpay_payment_id" varchar,
	"razorpay_signature" varchar,
	"stripe_payment_intent_id" varchar,
	"stripe_charge_id" varchar,
	"payment_details" jsonb DEFAULT '{}'::jsonb,
	"webhook_data" jsonb DEFAULT '{}'::jsonb,
	"failure_reason" text,
	"refund_amount" numeric(10, 2),
	"refunded_at" timestamp,
	"initiated_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"milkman_id" integer NOT NULL,
	"name" varchar NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"unit" varchar NOT NULL,
	"quantity" integer DEFAULT 0,
	"is_available" boolean DEFAULT true,
	"is_custom" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"milkman_id" integer NOT NULL,
	"order_id" integer,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "service_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"milkman_id" integer NOT NULL,
	"services" jsonb NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"milkman_notes" text,
	"customer_notes" text,
	"quoted_at" timestamp,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key_name" varchar(50) PRIMARY KEY NOT NULL,
	"value" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "sms_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" varchar NOT NULL,
	"message" text NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0,
	"last_attempt_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"milkman_id" integer NOT NULL,
	"product_name" varchar NOT NULL,
	"quantity" numeric(5, 2) NOT NULL,
	"unit" varchar DEFAULT 'liter',
	"price_snapshot" numeric(10, 2),
	"frequency_type" varchar NOT NULL,
	"days_of_week" jsonb,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp,
	"is_active" boolean DEFAULT true,
	"special_instructions" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"username" varchar,
	"email" varchar,
	"phone" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"user_type" varchar,
	"stripe_customer_id" varchar,
	"stripe_subscription_id" varchar,
	"is_verified" boolean DEFAULT false,
	"fcm_token" varchar(255),
	"latitude" varchar,
	"longitude" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"last_active_at" timestamp,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
ALTER TABLE "ad_tracking" ADD CONSTRAINT "ad_tracking_ad_id_ads_id_fk" FOREIGN KEY ("ad_id") REFERENCES "public"."ads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_tracking" ADD CONSTRAINT "ad_tracking_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_family_chat_id_family_chats_id_fk" FOREIGN KEY ("family_chat_id") REFERENCES "public"."family_chats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_milkman_id_milkmen_id_fk" FOREIGN KEY ("milkman_id") REFERENCES "public"."milkmen"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_family_chat_id_family_chats_id_fk" FOREIGN KEY ("family_chat_id") REFERENCES "public"."family_chats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_milkman_id_milkmen_id_fk" FOREIGN KEY ("milkman_id") REFERENCES "public"."milkmen"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_pricings" ADD CONSTRAINT "customer_pricings_milkman_id_milkmen_id_fk" FOREIGN KEY ("milkman_id") REFERENCES "public"."milkmen"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_pricings" ADD CONSTRAINT "customer_pricings_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_assigned_milkman_id_milkmen_id_fk" FOREIGN KEY ("assigned_milkman_id") REFERENCES "public"."milkmen"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_chat_members" ADD CONSTRAINT "family_chat_members_chat_id_family_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."family_chats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_chat_members" ADD CONSTRAINT "family_chat_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_chats" ADD CONSTRAINT "family_chats_milkman_id_milkmen_id_fk" FOREIGN KEY ("milkman_id") REFERENCES "public"."milkmen"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_chats" ADD CONSTRAINT "family_chats_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_milkman_id_milkmen_id_fk" FOREIGN KEY ("milkman_id") REFERENCES "public"."milkmen"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milkmen" ADD CONSTRAINT "milkmen_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_family_chat_id_family_chats_id_fk" FOREIGN KEY ("family_chat_id") REFERENCES "public"."family_chats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_milkman_id_milkmen_id_fk" FOREIGN KEY ("milkman_id") REFERENCES "public"."milkmen"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_ordered_by_users_id_fk" FOREIGN KEY ("ordered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_milkman_id_milkmen_id_fk" FOREIGN KEY ("milkman_id") REFERENCES "public"."milkmen"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_milkman_id_milkmen_id_fk" FOREIGN KEY ("milkman_id") REFERENCES "public"."milkmen"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_milkman_id_milkmen_id_fk" FOREIGN KEY ("milkman_id") REFERENCES "public"."milkmen"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_milkman_id_milkmen_id_fk" FOREIGN KEY ("milkman_id") REFERENCES "public"."milkmen"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_milkman_id_milkmen_id_fk" FOREIGN KEY ("milkman_id") REFERENCES "public"."milkmen"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_milkman_customer_pricing" ON "customer_pricings" USING btree ("milkman_id","customer_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");