-- Fix RPC function to use correct column name 'feedback_id' instead of 'analysis_feedback_id'
-- The analysis_audio_segments table has 'feedback_id' column, not 'analysis_feedback_id'

-- Drop and recreate the function with correct column references
DROP FUNCTION IF EXISTS "public"."get_audio_segments_for_feedback"("feedback_item_id" bigint);

CREATE OR REPLACE FUNCTION "public"."get_audio_segments_for_feedback"("feedback_item_id" bigint)
RETURNS TABLE("id" bigint, "audio_url" "text", "duration_ms" numeric, "format" "text", "provider" "text", "version" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    aas.id,
    aas.audio_url,
    aas.duration_ms,
    aas.format,
    aas.provider,
    aas.version,
    aas.created_at
  FROM public.analysis_audio_segments aas
  JOIN public.analysis_feedback af ON af.id = aas.feedback_id
  WHERE aas.feedback_id = feedback_item_id
    AND af.analysis_job_id IN (
      SELECT id FROM public.analysis_jobs WHERE user_id = (SELECT auth.uid())
    )
  ORDER BY aas.segment_index;
END;
$$;
