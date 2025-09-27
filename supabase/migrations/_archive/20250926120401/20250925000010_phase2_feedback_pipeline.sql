-- Migration 10: Phase 2 SSML/Audio feedback pipeline simplification
-- Consolidates queue tables into analysis_feedback status tracking

-- Add retry/error metadata to analysis_feedback
ALTER TABLE public.analysis_feedback
ADD COLUMN IF NOT EXISTS ssml_attempts integer NOT NULL DEFAULT 0;

ALTER TABLE public.analysis_feedback
ADD COLUMN IF NOT EXISTS audio_attempts integer NOT NULL DEFAULT 0;

ALTER TABLE public.analysis_feedback
ADD COLUMN IF NOT EXISTS ssml_last_error text;

ALTER TABLE public.analysis_feedback
ADD COLUMN IF NOT EXISTS audio_last_error text;

ALTER TABLE public.analysis_feedback
ADD COLUMN IF NOT EXISTS ssml_updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.analysis_feedback
ADD COLUMN IF NOT EXISTS audio_updated_at timestamptz NOT NULL DEFAULT now();

-- Drop legacy SSML job enqueue triggers
DROP TRIGGER IF EXISTS enqueue_ssml_job_on_feedback_insert ON public.analysis_feedback;
DROP TRIGGER IF EXISTS enqueue_ssml_job_on_feedback_update ON public.analysis_feedback;
DROP FUNCTION IF EXISTS enqueue_ssml_job_on_feedback();
DROP FUNCTION IF EXISTS enqueue_ssml_job_on_feedback_update();

-- Drop legacy job tables
DROP TABLE IF EXISTS public.audio_jobs;
DROP TABLE IF EXISTS public.ssml_jobs;

-- Cleanup helper trigger/functions from legacy job tables
DROP FUNCTION IF EXISTS update_audio_jobs_updated_at();
DROP FUNCTION IF EXISTS update_ssml_jobs_updated_at();

-- Reset status + retry metadata when feedback message is created or changed
CREATE OR REPLACE FUNCTION public.reset_feedback_generation_state()
RETURNS TRIGGER AS $$
BEGIN
  IF trim(coalesce(NEW.message, '')) = '' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.ssml_status := 'queued';
    NEW.audio_status := 'queued';
    NEW.ssml_attempts := 0;
    NEW.audio_attempts := 0;
    NEW.ssml_last_error := NULL;
    NEW.audio_last_error := NULL;
    NEW.ssml_updated_at := now();
    NEW.audio_updated_at := now();
  ELSIF TG_OP = 'UPDATE' THEN
    IF trim(coalesce(OLD.message, '')) <> trim(coalesce(NEW.message, '')) THEN
      NEW.ssml_status := 'queued';
      NEW.audio_status := 'queued';
      NEW.ssml_attempts := 0;
      NEW.audio_attempts := 0;
      NEW.ssml_last_error := NULL;
      NEW.audio_last_error := NULL;
      NEW.ssml_updated_at := now();
      NEW.audio_updated_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reset_feedback_generation_state_insert
  BEFORE INSERT ON public.analysis_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_feedback_generation_state();

CREATE TRIGGER reset_feedback_generation_state_update
  BEFORE UPDATE ON public.analysis_feedback
  FOR EACH ROW
  WHEN (OLD.message IS DISTINCT FROM NEW.message)
  EXECUTE FUNCTION public.reset_feedback_generation_state();

COMMENT ON FUNCTION public.reset_feedback_generation_state() IS 'Resets SSML/audio processing state when feedback content changes.';

