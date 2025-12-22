-- Fix realtime publication for postgres_changes subscriptions
-- Issue: Tables were removed from supabase_realtime publication causing silent subscription failures
-- Solution: Re-add tables to enable realtime events

-- Add tables to supabase_realtime publication (idempotent)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_jobs;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- Table already in publication
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.analyses;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_feedback;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;






