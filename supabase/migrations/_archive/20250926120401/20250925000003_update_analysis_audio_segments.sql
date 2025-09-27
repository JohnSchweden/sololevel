-- Migration 03: Clean analysis_audio_segments of SSML fields
-- Part of SSML/Audio segments separation initiative
-- Removes SSML-related columns, keeping only audio-specific fields

-- Drop SSML-related columns from analysis_audio_segments
ALTER TABLE public.analysis_audio_segments DROP COLUMN IF EXISTS feedback_ssml;
ALTER TABLE public.analysis_audio_segments DROP COLUMN IF EXISTS ssml_prompt;

-- Ensure we have the required audio-specific columns
-- (These should already exist, but adding IF NOT EXISTS for safety)
DO $$
BEGIN
    -- Ensure audio_url column exists and is NOT NULL
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analysis_audio_segments' 
        AND column_name = 'audio_url'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.analysis_audio_segments ADD COLUMN audio_url text NOT NULL;
    END IF;

    -- Ensure format column exists with proper check constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analysis_audio_segments' 
        AND column_name = 'format'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.analysis_audio_segments ADD COLUMN format text DEFAULT 'aac'
        CHECK (format IN ('aac', 'mp3', 'wav'));
    END IF;

    -- Ensure duration_ms column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analysis_audio_segments' 
        AND column_name = 'duration_ms'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.analysis_audio_segments ADD COLUMN duration_ms integer;
    END IF;

    -- Ensure provider column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analysis_audio_segments' 
        AND column_name = 'provider'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.analysis_audio_segments ADD COLUMN provider text DEFAULT 'gemini';
    END IF;

    -- Ensure version column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analysis_audio_segments' 
        AND column_name = 'version'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.analysis_audio_segments ADD COLUMN version text;
    END IF;
END $$;

-- Rename audio_format to format if it exists (standardization)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analysis_audio_segments' 
        AND column_name = 'audio_format'
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analysis_audio_segments' 
        AND column_name = 'format'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.analysis_audio_segments RENAME COLUMN audio_format TO format;
    END IF;
END $$;

-- Rename audio_duration_ms to duration_ms if it exists (standardization)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analysis_audio_segments' 
        AND column_name = 'audio_duration_ms'
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analysis_audio_segments' 
        AND column_name = 'duration_ms'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.analysis_audio_segments RENAME COLUMN audio_duration_ms TO duration_ms;
    END IF;
END $$;

-- Add segment_index column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'analysis_audio_segments' 
        AND column_name = 'segment_index'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.analysis_audio_segments ADD COLUMN segment_index integer DEFAULT 0;
    END IF;
END $$;

-- Add/ensure unique constraint on feedback_id, segment_index
ALTER TABLE public.analysis_audio_segments 
DROP CONSTRAINT IF EXISTS analysis_audio_segments_feedback_id_segment_index_key;

ALTER TABLE public.analysis_audio_segments 
ADD CONSTRAINT analysis_audio_segments_feedback_id_segment_index_key 
UNIQUE (analysis_feedback_id, segment_index);

-- Update table comment
COMMENT ON TABLE public.analysis_audio_segments IS 'Audio segments per feedback item. SSML content now stored separately in analysis_ssml_segments.';
