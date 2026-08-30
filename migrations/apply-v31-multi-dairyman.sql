-- A customer may buy from several dairymen.
--
--   psql "$DATABASE_URL" -f migrations/apply-v31-multi-dairyman.sql
--
-- Safe to run twice.
--
-- customers.assigned_milkman_id held exactly one. It stays, as the *primary* —
-- the one screens fall back to when they can only show one — while this table
-- holds the full list. Keeping both means the existing call sites go on working
-- instead of needing a single large refactor.

CREATE TABLE IF NOT EXISTS "customer_milkmen" (
    "id"          serial PRIMARY KEY NOT NULL,
    "customer_id" integer NOT NULL,
    "milkman_id"  integer NOT NULL,
    "is_primary"  boolean DEFAULT false,
    "is_active"   boolean DEFAULT true,
    "created_at"  timestamp DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_milkmen_customer_fk') THEN
        ALTER TABLE "customer_milkmen"
            ADD CONSTRAINT "customer_milkmen_customer_fk"
            FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'customer_milkmen_milkman_fk') THEN
        ALTER TABLE "customer_milkmen"
            ADD CONSTRAINT "customer_milkmen_milkman_fk"
            FOREIGN KEY ("milkman_id") REFERENCES "public"."milkmen"("id");
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_customer_milkmen"
    ON "customer_milkmen" USING btree ("customer_id", "milkman_id");

-- One relationship can only exist once, so a double tap on "Select" cannot
-- create a duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_customer_milkman"
    ON "customer_milkmen" ("customer_id", "milkman_id");

-- Backfill: every existing assignment becomes a row, marked primary.
INSERT INTO "customer_milkmen" ("customer_id", "milkman_id", "is_primary", "is_active")
SELECT c."id", c."assigned_milkman_id", true, true
  FROM "customers" c
 WHERE c."assigned_milkman_id" IS NOT NULL
ON CONFLICT ("customer_id", "milkman_id") DO NOTHING;

-- The new table must never be locked down less than the rest: anon lost all
-- access in lock-down-anon.sql, and a table created afterwards would otherwise
-- inherit Supabase's default grants.
REVOKE ALL ON "customer_milkmen" FROM anon, authenticated;
ALTER TABLE "customer_milkmen" ENABLE ROW LEVEL SECURITY;

-- What should exist afterwards.
SELECT
    (SELECT count(*) FROM customer_milkmen)                                AS relationships,
    (SELECT count(*) FROM customers WHERE assigned_milkman_id IS NOT NULL) AS legacy_assignments,
    (SELECT count(*) FROM information_schema.role_table_grants
      WHERE grantee = 'anon' AND table_name = 'customer_milkmen')          AS anon_grants_should_be_zero;
