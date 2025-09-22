-- Add per-feedback SSML storage functions
-- Enables storing SSML and audio data for individual feedback items

-- Remove feedback_audio_url column if it exists
ALTER TABLE "public"."analysis_audio_segments" DROP COLUMN IF EXISTS "feedback_audio_url";

-- Create new RPC function for storing audio segments with feedback linkage
CREATE OR REPLACE FUNCTION "public"."store_analysis_audio_segment_for_feedback"(
  "p_analysis_id" "uuid",
  "p_analysis_feedback_id" bigint,
  "p_feedback_ssml" "text",
  "p_audio_url" "text",
  "p_audio_duration_ms" integer DEFAULT NULL::integer,
  "p_audio_format" "text" DEFAULT 'mp3'::"text",
  "p_ssml_prompt" "text" DEFAULT NULL::"text",
  "p_audio_prompt" "text" DEFAULT NULL::"text"
) RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  segment_id bigint;
begin
  -- Validate inputs
  if p_analysis_id is null or p_analysis_feedback_id is null or p_feedback_ssml is null or p_audio_url is null then
    raise exception 'analysis_id, analysis_feedback_id, feedback_ssml, and audio_url are required';
  end if;

  -- Insert the audio segment linked to specific feedback item
  insert into public.analysis_audio_segments (
    analysis_id,
    analysis_feedback_id,
    feedback_ssml,
    audio_url,
    audio_duration_ms,
    audio_format,
    ssml_prompt,
    audio_prompt
  ) values (
    p_analysis_id,
    p_analysis_feedback_id,
    p_feedback_ssml,
    p_audio_url,
    p_audio_duration_ms,
    p_audio_format,
    p_ssml_prompt,
    p_audio_prompt
  )
  returning id into segment_id;

  return segment_id;
end;
$$;

-- Grant permissions
GRANT ALL ON FUNCTION "public"."store_analysis_audio_segment_for_feedback"("uuid", bigint, "text", "text", integer, "text", "text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."store_analysis_audio_segment_for_feedback"("uuid", bigint, "text", "text", integer, "text", "text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."store_analysis_audio_segment_for_feedback"("uuid", bigint, "text", "text", integer, "text", "text", "text") TO "service_role";

-- Add comment
COMMENT ON FUNCTION "public"."store_analysis_audio_segment_for_feedback"("uuid", bigint, "text", "text", integer, "text", "text", "text") IS 'Store an audio segment for a specific feedback item with proper linkage to both analysis and feedback';

-- Fix get_complete_analysis parameter naming to avoid ambiguity
-- (The existing function has a parameter named 'job_id' which conflicts with table column)
-- We'll keep the existing function signature for backward compatibility but add proper parameter naming internally

-- Note: The existing get_complete_analysis function is already correctly implemented,
-- but we document here that it should be called with p_job_id parameter name in the RPC call
-- from application code to avoid the ambiguity error.
