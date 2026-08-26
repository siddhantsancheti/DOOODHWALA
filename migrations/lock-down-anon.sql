-- Close direct public access to the database.
--
--   psql "$DATABASE_URL" -f migrations/lock-down-anon.sql
--
-- Safe to run more than once.
--
-- WHY THIS EXISTS
--
-- Supabase exposes every table in `public` over PostgREST, and the `anon` role
-- held DELETE, INSERT, SELECT, TRUNCATE and UPDATE on all of them with row
-- level security switched off. The anon key is compiled into the mobile app, so
-- it is public by definition — anyone who downloads the APK can extract it in
-- minutes and then read every user's phone and email, every customer's home
-- address, every chat message and every bill, straight from Supabase without
-- ever touching our server or holding a login.
--
-- They could also write: mark a bill paid, change an amount, or TRUNCATE the
-- lot. And `app_config` carried an "Allow anonymous update" policy, which meant
-- anyone could repoint `api_url` and send every installed phone to a server of
-- their choosing.
--
-- The app needs the anon key for exactly one thing: reading app_config.api_url
-- at launch to find the server. Everything else already goes through our API
-- with a JWT. So anon keeps that one read and loses everything else.
--
-- Our server connects as `postgres`, which owns these tables and is unaffected
-- by both the revokes and RLS.

-- 1. Take away the blanket grants Supabase handed out.
DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', r.tablename);
    END LOOP;
END $$;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- Stop future tables from inheriting the same problem.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- 2. Turn RLS on everywhere as a second line of defence, so a grant restored by
--    accident later still does not expose rows.
DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
END $$;

-- 3. app_config: the one thing the app may read, and read only.
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.app_config;
DROP POLICY IF EXISTS "Allow anonymous update" ON public.app_config;
DROP POLICY IF EXISTS "Public read" ON public.app_config;

CREATE POLICY "anon may read api url"
    ON public.app_config FOR SELECT
    TO anon, authenticated
    USING (true);

GRANT SELECT ON public.app_config TO anon, authenticated;

-- 4. Show what anon can still reach. Expect exactly one row: app_config SELECT.
SELECT table_name, string_agg(privilege_type, ',' ORDER BY privilege_type) AS anon_still_has
FROM information_schema.role_table_grants
WHERE grantee = 'anon' AND table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;
