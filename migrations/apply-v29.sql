-- Schema changes for the v29 release, written to be safe to run twice.
--
--   psql "$DATABASE_URL" -f migrations/apply-v29.sql
--
-- Use this rather than `drizzle-kit push` against a live database. Push diffs
-- the whole schema and guesses at intent — on this database it offers to
-- rename `app_config` into `terms_acceptances`, and `app_config` is the table
-- every installed phone reads its server address from. One wrong keypress
-- would take the app down for every user, including on the old host.
--
-- This file states exactly what changes, and nothing else.

-- 1. Consent log for the terms a user accepted at signup.
CREATE TABLE IF NOT EXISTS "terms_acceptances" (
    "id"          serial PRIMARY KEY NOT NULL,
    "user_id"     varchar NOT NULL,
    "role"        varchar NOT NULL,
    "version"     varchar NOT NULL,
    "accepted_at" timestamp DEFAULT now() NOT NULL,
    "ip_address"  varchar,
    "user_agent"  text
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'terms_acceptances_user_id_users_id_fk'
    ) THEN
        ALTER TABLE "terms_acceptances"
            ADD CONSTRAINT "terms_acceptances_user_id_users_id_fk"
            FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");
    END IF;
END $$;

-- 2. Per-product custom pricing. NULL product_name keeps meaning the
--    customer's blanket per-litre rate, which is what existing rows are.
ALTER TABLE "customer_pricings"
    ADD COLUMN IF NOT EXISTS "product_name" varchar;

DROP INDEX IF EXISTS "idx_milkman_customer_pricing";
CREATE INDEX IF NOT EXISTS "idx_milkman_customer_pricing"
    ON "customer_pricings" USING btree ("milkman_id", "customer_id", "product_name");

-- What should exist afterwards.
SELECT
    (SELECT count(*) FROM information_schema.tables
      WHERE table_name = 'terms_acceptances')                     AS terms_table,
    (SELECT count(*) FROM information_schema.columns
      WHERE table_name = 'customer_pricings'
        AND column_name = 'product_name')                         AS product_name_col,
    (SELECT count(*) FROM information_schema.tables
      WHERE table_name = 'app_config')                            AS app_config_still_here;
