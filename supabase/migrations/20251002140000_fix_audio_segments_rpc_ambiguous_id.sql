-- Clarify ambiguous column references in RPC get_audio_segments_for_feedback
-- Fully qualify all occurrences of "id" to avoid: column reference "id" is ambiguous

DROP FUNCTION IF EXISTS "public"."get_audio_segments_for_feedback"("feedback_item_id" bigint);

CREATE OR REPLACE FUNCTION "public"."get_audio_segments_for_feedback"("feedback_item_id" bigint)
RETURNS TABLE(
  "id" bigint,
  "audio_url" text,
  "duration_ms" numeric,
  "format" text,
  "provider" text,
  "version" text,
  "created_at" timestamp with time zone
)
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
  FROM public.analysis_audio_segments AS aas
  JOIN public.analysis_feedback AS af ON af.id = aas.feedback_id
  WHERE aas.feedback_id = feedback_item_id
    AND af.analysis_job_id IN (
      SELECT aj.id FROM public.analysis_jobs AS aj WHERE aj.user_id = (SELECT auth.uid())
    )
  ORDER BY aas.segment_index;
END;
$$;


