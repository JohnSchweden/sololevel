-- Drop analysis_jobs.audio_url column as we now use per-feedback audio in analysis_audio_segments
-- This removes the redundant summary-level audio URL that was confusing the data model

ALTER TABLE public.analysis_jobs DROP COLUMN IF EXISTS audio_url;

-- Update any functions that reference the audio_url column
-- The functions will be updated in subsequent migrations
