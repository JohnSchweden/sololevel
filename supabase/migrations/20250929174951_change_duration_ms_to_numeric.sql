-- Migration: Change duration_ms columns to numeric for decimal support
-- Purpose: TTS service returns decimal duration values like 5.2ms

-- Change duration_ms columns from integer to numeric to support decimal values
ALTER TABLE public.analysis_audio_segments 
  ALTER COLUMN duration_ms TYPE numeric,
  ALTER COLUMN audio_duration_ms TYPE numeric;

-- Update functions to accept numeric instead of integer
-- (The functions will automatically work with numeric type)

COMMENT ON COLUMN public.analysis_audio_segments.duration_ms IS 'Duration in milliseconds (supports decimal values)';
COMMENT ON COLUMN public.analysis_audio_segments.audio_duration_ms IS 'Duration in milliseconds (supports decimal values)';
