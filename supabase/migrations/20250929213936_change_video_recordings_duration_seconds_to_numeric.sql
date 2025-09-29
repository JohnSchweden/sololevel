-- Migration: Change video_recordings.duration_seconds from integer to numeric for decimal support
-- Purpose: Support decimal duration values like 30.5 seconds for more precise video timing

-- Change duration_seconds column from integer to numeric to support decimal values
ALTER TABLE public.video_recordings 
  ALTER COLUMN duration_seconds TYPE numeric;

-- Update column comment to reflect decimal support
COMMENT ON COLUMN public.video_recordings.duration_seconds IS 'Duration in seconds (numeric to support decimal values for precise timing)';
