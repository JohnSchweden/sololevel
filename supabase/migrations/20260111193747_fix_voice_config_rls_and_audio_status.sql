-- Fix RLS policy for coach_voice_configs to allow service_role access
-- Fix audio_status check constraint to include 'retrying' status
-- Fix ssml_status check constraint to include 'retrying' status for consistency

-- 1. Grant table-level permissions to service_role for coach_voice_configs
-- RLS policies alone aren't enough - service_role needs base table SELECT permission
GRANT SELECT ON public.coach_voice_configs TO service_role;

-- 2. Add RLS policy for service_role to read coach_voice_configs
-- Note: service_role should bypass RLS by default, but this ensures explicit access
-- Edge Functions use service_role key and need to read voice configs
-- Drop policy if it exists (idempotent)
DROP POLICY IF EXISTS "Service role can read voice configs" ON public.coach_voice_configs;
CREATE POLICY "Service role can read voice configs"
  ON public.coach_voice_configs FOR SELECT
  TO service_role
  USING (true);

-- 3. Update audio_status check constraint to include 'retrying'
-- The code sets audio_status to 'retrying' for retry attempts, but the constraint didn't allow it
ALTER TABLE public.analysis_feedback
  DROP CONSTRAINT IF EXISTS analysis_feedback_audio_status_check;

ALTER TABLE public.analysis_feedback
  ADD CONSTRAINT analysis_feedback_audio_status_check 
  CHECK (audio_status = ANY (ARRAY['queued'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'retrying'::text]));

-- 4. Update ssml_status check constraint to include 'retrying' for consistency
-- Even though ssmlWorker doesn't currently use 'retrying', adding it for consistency
ALTER TABLE public.analysis_feedback
  DROP CONSTRAINT IF EXISTS analysis_feedback_ssml_status_check;

ALTER TABLE public.analysis_feedback
  ADD CONSTRAINT analysis_feedback_ssml_status_check 
  CHECK (ssml_status = ANY (ARRAY['queued'::text, 'processing'::text, 'completed'::text, 'failed'::text, 'retrying'::text]));

COMMENT ON CONSTRAINT analysis_feedback_audio_status_check ON public.analysis_feedback IS 'Audio processing status: queued, processing, completed, failed, or retrying';
COMMENT ON CONSTRAINT analysis_feedback_ssml_status_check ON public.analysis_feedback IS 'SSML processing status: queued, processing, completed, failed, or retrying';
