-- Cleanup migration: Drop conflicting objects before baseline
-- This runs before initial_baseline.sql (timestamp 20251204135321)

-- Drop the conflicting function that has different return type
DROP FUNCTION IF EXISTS public.get_audio_segments_for_feedback(bigint) CASCADE;

-- Drop all other functions that might conflict
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT 'DROP FUNCTION IF EXISTS public.' || quote_ident(proname) || 
               '(' || oidvectortypes(proargtypes) || ') CASCADE' as drop_cmd
        FROM pg_proc
        INNER JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
        WHERE pg_namespace.nspname = 'public'
        AND proname NOT LIKE 'pg_%'
        AND proname NOT IN ('backfill_analyses_from_jobs')
    )
    LOOP
        EXECUTE r.drop_cmd;
    END LOOP;
END $$;

-- Drop all tables (baseline will recreate them)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- Drop all views
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public')
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
    END LOOP;
END $$;

-- Clear migration history (baseline will recreate it)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations') THEN
        TRUNCATE TABLE supabase_migrations.schema_migrations;
    END IF;
END $$;

