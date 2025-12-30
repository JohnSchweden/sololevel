-- Enable pg_cron extension for scheduled jobs
-- This allows us to keep Edge Functions warm by periodically invoking them
-- Note: In local dev, this may require superuser privileges
-- If this fails, enable manually: CREATE EXTENSION pg_cron;
DO $$
BEGIN
  -- Try to create extension, but don't fail if we don't have permissions
  -- In production Supabase, this will work automatically
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
EXCEPTION WHEN insufficient_privilege THEN
  -- In local dev without superuser, skip extension creation
  -- The cron job will be created manually or via Supabase Dashboard
  RAISE NOTICE 'pg_cron extension requires superuser privileges. Skipping for local dev.';
END $$;

-- Keep ai-analyze-video Edge Function warm every 5 minutes
-- This reduces cold start latency from ~1-2s to ~200ms
-- 
-- Note: pg_net extension must be enabled (already installed in Supabase)
-- 
-- IMPORTANT: For production, update the URL in Supabase Dashboard:
-- 1. Go to Database > Extensions > pg_cron
-- 2. Edit the cron job 'keep-ai-analyze-video-warm'
-- 3. Update URL to: 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/ai-analyze-video/health'
-- 4. Update Authorization header with your service_role_key
--
-- For local dev, this uses localhost URL (works with `supabase start`)
SELECT cron.schedule(
  'keep-ai-analyze-video-warm',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'http://127.0.0.1:54321/functions/v1/ai-analyze-video/health',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
      -- Note: Local dev doesn't require auth for health endpoint
      -- Production will need: 'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  ) as request_id;
  $$
);

-- Comment explaining the cron job
COMMENT ON EXTENSION pg_cron IS 'Scheduled job extension for keeping Edge Functions warm';
