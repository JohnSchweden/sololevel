-- Drop analysis_jobs.ssml column as we now use per-feedback SSML in analysis_audio_segments.feedback_ssml
-- This removes the redundant summary-level SSML that was confusing the data model

ALTER TABLE public.analysis_jobs DROP COLUMN IF EXISTS ssml;

-- Update any functions that reference the ssml column
-- The functions will be updated in subsequent migrations
