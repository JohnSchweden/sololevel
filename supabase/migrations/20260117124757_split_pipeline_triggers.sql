-- Migration: Split Pipeline Architecture v2
-- Add 'analysis_complete' status and UPDATE trigger for SSML/Audio processing
-- This enables splitting video analysis from SSML/Audio generation to prevent wall clock timeouts

-- Step 1: Add 'analysis_complete' status to analysis_jobs
-- Drop and recreate CHECK constraint with new status
ALTER TABLE public.analysis_jobs 
DROP CONSTRAINT IF EXISTS analysis_jobs_status_check;

ALTER TABLE public.analysis_jobs 
ADD CONSTRAINT analysis_jobs_status_check 
CHECK (status = ANY (ARRAY[
  'queued'::text, 
  'processing'::text, 
  'analysis_complete'::text,  -- NEW: Indicates video analysis done, SSML/Audio pending
  'completed'::text, 
  'failed'::text
]));

-- Step 2: Clean up any broken webhook triggers (Dashboard-created triggers lack WHEN clause support)
-- IMPORTANT: supabase_functions.http_request does NOT support WHEN clauses properly
-- This caused an infinite loop where every UPDATE fired the trigger
DROP TRIGGER IF EXISTS auto_start_post_analysis ON public.analysis_jobs;

-- Step 3: Create trigger function using pg_net (supports WHEN clause in function body)
-- This function fires when status changes TO 'analysis_complete' to trigger SSML/Audio generation
CREATE OR REPLACE FUNCTION public.trigger_post_analyze_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  edge_function_url TEXT;
  webhook_secret TEXT;
  request_id BIGINT;
BEGIN
  -- Only fire when status changes TO 'analysis_complete' (not FROM)
  IF NEW.status = 'analysis_complete' AND (OLD.status IS NULL OR OLD.status <> 'analysis_complete') THEN
    -- Get edge function URL from environment or use production default
    -- Production: https://qbkvqhoijishdkqlwhqp.supabase.co/functions/v1/ai-analyze-video/post-analyze
    -- Local dev: Override with app.edge_function_url = 'http://host.docker.internal:54321/functions/v1/ai-analyze-video/post-analyze'
    edge_function_url := COALESCE(
      current_setting('app.edge_function_url', true),
      'https://qbkvqhoijishdkqlwhqp.supabase.co/functions/v1/ai-analyze-video/post-analyze'
    );
    
    webhook_secret := COALESCE(
      current_setting('app.db_webhook_secret', true),
      'your-test-secret-123'
    );
    
    -- Use pg_net to make async HTTP request to edge function
    SELECT net.http_post(
      url := edge_function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'X-Db-Webhook-Secret', webhook_secret
      ),
      body := jsonb_build_object(
        'type', 'UPDATE',
        'table', 'analysis_jobs',
        'record', jsonb_build_object(
          'id', NEW.id,
          'user_id', NEW.user_id,
          'video_recording_id', NEW.video_recording_id,
          'status', NEW.status
        ),
        'old_record', jsonb_build_object(
          'id', OLD.id,
          'status', OLD.status
        )
      ),
      timeout_milliseconds := 5000
    ) INTO request_id;
    
    -- Log the request for debugging
    RAISE LOG 'Triggered post-analyze webhook for job_id=%, request_id=%', NEW.id, request_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 4: Create trigger that calls the webhook function
DROP TRIGGER IF EXISTS trigger_post_analyze_on_status_change ON public.analysis_jobs;

CREATE TRIGGER trigger_post_analyze_on_status_change
  AFTER UPDATE ON public.analysis_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_post_analyze_webhook();

-- Rollback instructions (if needed):
-- DROP TRIGGER IF EXISTS trigger_post_analyze_on_status_change ON public.analysis_jobs;
-- DROP FUNCTION IF EXISTS public.trigger_post_analyze_webhook();
-- DROP TRIGGER IF EXISTS auto_start_post_analysis ON public.analysis_jobs;
-- ALTER TABLE public.analysis_jobs DROP CONSTRAINT analysis_jobs_status_check;
-- ALTER TABLE public.analysis_jobs ADD CONSTRAINT analysis_jobs_status_check 
-- CHECK (status = ANY (ARRAY['queued'::text, 'processing'::text, 'completed'::text, 'failed'::text]));
