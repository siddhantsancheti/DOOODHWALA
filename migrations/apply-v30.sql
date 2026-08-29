-- Billing columns for the platform fee and vendor commission.
--
--   psql "$DATABASE_URL" -f migrations/apply-v30.sql
--
-- Safe to run twice. Written by hand rather than with `drizzle-kit push`, which
-- diffs the whole schema and guesses at intent — on this database it has
-- previously offered to rename app_config, the table every installed phone
-- reads its server address from.

-- The deliveries themselves, before any platform charge. NULL on bills raised
-- before the fee existed, where subtotal and total are the same number.
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "subtotal" numeric(10,2);

-- Customer-side fee, added on top. Clause 8.7 of the customer terms requires it
-- to show as its own line before payment, so it is stored, not derived.
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "customer_fee_percent" numeric(5,2);
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "customer_fee_amount" numeric(10,2);

-- Platform's cut from the milkman, calculated on the subtotal.
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "vendor_commission_percent" numeric(5,2);
ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "vendor_commission_amount" numeric(10,2);

-- Backfill the bills that already exist: no fee was charged on them, so the
-- subtotal is the total and the fee is zero. Without this they would read as
-- "unknown subtotal" forever.
UPDATE "bills"
   SET "subtotal" = "total_amount",
       "customer_fee_percent" = 0,
       "customer_fee_amount" = 0
 WHERE "subtotal" IS NULL;

-- The two agreed rates, editable without a deploy. Flat for everyone.
--   customer_fee_percent     1%    charged to the customer on top of the bill
--   vendor_commission_percent 0.5% service charge taken from the milkman
INSERT INTO "app_config" ("key", "value")
VALUES ('customer_fee_percent', '1'),
       ('vendor_commission_percent', '0.5')
ON CONFLICT ("key") DO NOTHING;

-- What should exist afterwards.
SELECT
    (SELECT count(*) FROM information_schema.columns
      WHERE table_name = 'bills'
        AND column_name IN ('subtotal','customer_fee_percent','customer_fee_amount',
                            'vendor_commission_percent','vendor_commission_amount')) AS new_bill_columns,
    (SELECT value FROM app_config WHERE key = 'customer_fee_percent')                AS customer_fee,
    (SELECT value FROM app_config WHERE key = 'vendor_commission_percent')           AS vendor_commission,
    (SELECT value FROM app_config WHERE key = 'api_url')                             AS api_url_still_here;
