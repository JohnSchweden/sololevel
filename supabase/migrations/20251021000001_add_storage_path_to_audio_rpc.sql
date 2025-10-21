-- Migration: Add storage_path to get_audio_segments_for_feedback RPC
-- Task 32 Module 4/5 completion: Enable client to read storage_path from RPC
-- Date: 2025-10-21

-- Drop existing function
DROP FUNCTION IF EXISTS "public"."get_audio_segments_for_feedback"("feedback_item_id" bigint);

-- Recreate function with storage_path field
CREATE OR REPLACE FUNCTION "public"."get_audio_segments_for_feedback"("feedback_item_id" bigint)
RETURNS TABLE(
  "id" bigint,
  "audio_url" "text",
  "storage_path" "text",
  "duration_ms" numeric,
  "format" "text",
  "provider" "text",
  "version" "text",
  "created_at" timestamp with time zone
)
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    aas.id,
    aas.audio_url,
    aas.storage_path,
    aas.duration_ms,
    aas.format,
    aas.provider,
    aas.version,
    aas.created_at
  FROM public.analysis_audio_segments aas
  WHERE aas.feedback_id = feedback_item_id
  ORDER BY aas.segment_index ASC;
END;
$$;

-- Update function comment
COMMENT ON FUNCTION "public"."get_audio_segments_for_feedback"("feedback_item_id" bigint) IS 
'Get all audio segments for a specific feedback item. Returns storage_path for semantic path-based signed URL generation (Task 32), with audio_url fallback for legacy records.';

