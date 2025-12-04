-- Migration: Change duration_ms columns to numeric for decimal support
-- Purpose: TTS service returns decimal duration values like 5.2ms

-- Change duration_ms columns from integer to numeric to support decimal values
-- Use IF EXISTS pattern since the baseline schema may already have these changes
DO $$ 
BEGIN
  -- Only alter duration_ms if it exists and is not already numeric
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'analysis_audio_segments' 
    AND column_name = 'duration_ms'
    AND data_type != 'numeric'
  ) THEN
    ALTER TABLE public.analysis_audio_segments ALTER COLUMN duration_ms TYPE numeric;
  END IF;

  -- Only alter audio_duration_ms if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'analysis_audio_segments' 
    AND column_name = 'audio_duration_ms'
  ) THEN
    ALTER TABLE public.analysis_audio_segments ALTER COLUMN audio_duration_ms TYPE numeric;
  END IF;
END $$;

-- Update comments only if columns exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'analysis_audio_segments' 
    AND column_name = 'duration_ms'
  ) THEN
    COMMENT ON COLUMN public.analysis_audio_segments.duration_ms IS 'Duration in milliseconds (supports decimal values)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'analysis_audio_segments' 
    AND column_name = 'audio_duration_ms'
  ) THEN
    COMMENT ON COLUMN public.analysis_audio_segments.audio_duration_ms IS 'Duration in milliseconds (supports decimal values)';
  END IF;
END $$;
