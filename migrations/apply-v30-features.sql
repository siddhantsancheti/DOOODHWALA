-- Problem reports on delivered orders, and milkman verification.
--
--   psql "$DATABASE_URL" -f migrations/apply-v30-features.sql
--
-- Safe to run twice.

-- 1. A problem reported against a delivered order.
--
-- Reports live in the conversation rather than a separate ticket system,
-- because the conversation is where the two of them already talk. Clause 7.3 of
-- the customer terms promises this route exists — "within 24 hours of delivery,
-- through the app" — and until now it did not.
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "reported_message_id" integer;
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "report_reason" varchar;
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "report_photo_url" text;
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "report_resolved_at" timestamp;

-- Finding a report against an order, and finding unresolved ones.
CREATE INDEX IF NOT EXISTS "idx_chat_reported_message"
    ON "chat_messages" ("reported_message_id")
    WHERE "reported_message_id" IS NOT NULL;

-- 2. Milkman verification. He is paid real money, so the account and the PAN
--    are collected before he can be listed.
ALTER TABLE "milkmen" ADD COLUMN IF NOT EXISTS "pan_number" varchar;
ALTER TABLE "milkmen" ADD COLUMN IF NOT EXISTS "pan_image_url" text;
ALTER TABLE "milkmen" ADD COLUMN IF NOT EXISTS "verification_status" varchar DEFAULT 'pending';
ALTER TABLE "milkmen" ADD COLUMN IF NOT EXISTS "verified_at" timestamp;
ALTER TABLE "milkmen" ADD COLUMN IF NOT EXISTS "verification_note" text;

-- Milkmen who existed before verification did are marked pending, not verified.
-- Defaulting them to verified would mean the badge asserts a check nobody ran.
UPDATE "milkmen" SET "verification_status" = 'pending' WHERE "verification_status" IS NULL;

-- What should exist afterwards.
SELECT
    (SELECT count(*) FROM information_schema.columns
      WHERE table_name = 'chat_messages'
        AND column_name IN ('reported_message_id','report_reason','report_photo_url','report_resolved_at')) AS report_columns,
    (SELECT count(*) FROM information_schema.columns
      WHERE table_name = 'milkmen'
        AND column_name IN ('pan_number','pan_image_url','verification_status','verified_at','verification_note')) AS kyc_columns,
    (SELECT value FROM app_config WHERE key = 'api_url') AS api_url_still_here;
