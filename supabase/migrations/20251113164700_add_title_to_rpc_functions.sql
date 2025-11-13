-- Add title column to RPC function return types and SELECT statements
-- This migration updates RPC functions to include the title field from analyses table

-- Drop existing functions to allow return type changes
DROP FUNCTION IF EXISTS "public"."get_complete_analysis"("p_job_id" bigint);
DROP FUNCTION IF EXISTS "public"."get_enhanced_analysis_with_feedback"("analysis_job_id" bigint);

-- Update get_complete_analysis RPC to include title
CREATE FUNCTION "public"."get_complete_analysis"("p_job_id" bigint) 
RETURNS TABLE(
  "analysis_id" "uuid", 
  "job_status" "text", 
  "job_progress_percentage" integer, 
  "full_feedback_text" "text", 
  "summary_text" "text", 
  "raw_generated_text" "text", 
  "full_feedback_json" "jsonb", 
  "feedback_prompt" "text", 
  "title" "text",
  "audio_segments" "jsonb"
)
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
begin
  return query
  select
    a.id as analysis_id,
    aj.status as job_status,
    aj.progress_percentage as job_progress_percentage,
    a.full_feedback_text,
    a.summary_text,
    a.raw_generated_text,
    a.full_feedback_json,
    a.feedback_prompt,
    a.title,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', aas.id,
          'feedback_ssml', aas.feedback_ssml,
          'feedback_audio_url', aas.feedback_audio_url,
          'audio_duration_ms', aas.audio_duration_ms,
          'audio_format', aas.audio_format,
          'ssml_prompt', aas.ssml_prompt,
          'audio_prompt', aas.audio_prompt,
          'created_at', aas.created_at
        )
      ) filter (where aas.id is not null),
      '[]'::jsonb
    ) as audio_segments
  from public.analysis_jobs aj
  left join public.analyses a on a.job_id = aj.id
  left join public.analysis_audio_segments aas on aas.analysis_id = a.id
  where aj.id = p_job_id
    and aj.user_id = (select auth.uid())
  group by a.id, aj.status, aj.progress_percentage, a.full_feedback_text, a.summary_text,
           a.raw_generated_text, a.full_feedback_json, a.feedback_prompt, a.title;
end;
$$;

-- Update get_enhanced_analysis_with_feedback RPC to include title in analyses jsonb
CREATE FUNCTION "public"."get_enhanced_analysis_with_feedback"("analysis_job_id" bigint) 
RETURNS TABLE(
  "analysis_id" bigint, 
  "status" "text", 
  "progress_percentage" integer, 
  "processing_time_ms" bigint, 
  "video_source_type" "text", 
  "created_at" timestamp with time zone, 
  "updated_at" timestamp with time zone, 
  "feedback" "jsonb", 
  "metrics" "jsonb", 
  "analyses" "jsonb"
)
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
begin
  -- Allow service role to bypass RLS, but authenticated users still need to own the analysis
  if (select auth.role()) = 'service_role' then
    return query
    select
      aj.id as analysis_id,
      aj.status,
      aj.progress_percentage,
      aj.processing_time_ms,
      aj.video_source_type,
      aj.created_at,
      aj.updated_at,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', af.id,
            'analysis_id', af.analysis_id,
            'timestamp', af.timestamp_seconds,
            'category', af.category,
            'message', af.message,
            'confidence', af.confidence,
            'impact', af.impact,
            'created_at', af.created_at
          )
        ) filter (where af.id is not null),
        '[]'::jsonb
      ) as feedback,
      coalesce(
        jsonb_object_agg(am.metric_key,
          jsonb_build_object(
            'value', am.metric_value,
            'unit', am.unit,
            'updated_at', am.updated_at
          )
        ) filter (where am.id is not null),
        '{}'::jsonb
      ) as metrics,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'full_feedback_text', a.full_feedback_text,
            'summary_text', a.summary_text,
            'raw_generated_text', a.raw_generated_text,
            'full_feedback_json', a.full_feedback_json,
            'feedback_prompt', a.feedback_prompt,
            'title', a.title,
            'created_at', a.created_at,
            'updated_at', a.updated_at
          )
        ) filter (where a.id is not null),
        '[]'::jsonb
      ) as analyses
    from public.analysis_jobs aj
    left join public.analyses a on a.job_id = aj.id
    left join public.analysis_feedback af on af.analysis_id = a.id
    left join public.analysis_metrics am on am.analysis_id = aj.id
    where aj.id = analysis_job_id
    group by aj.id, aj.status, aj.progress_percentage, aj.processing_time_ms, aj.video_source_type,
             aj.created_at, aj.updated_at;
  else
    -- For authenticated users, enforce ownership
    return query
    select
      aj.id as analysis_id,
      aj.status,
      aj.progress_percentage,
      aj.processing_time_ms,
      aj.video_source_type,
      aj.created_at,
      aj.updated_at,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', af.id,
            'analysis_id', af.analysis_id,
            'timestamp', af.timestamp_seconds,
            'category', af.category,
            'message', af.message,
            'confidence', af.confidence,
            'impact', af.impact,
            'created_at', af.created_at
          )
        ) filter (where af.id is not null),
        '[]'::jsonb
      ) as feedback,
      coalesce(
        jsonb_object_agg(am.metric_key,
          jsonb_build_object(
            'value', am.metric_value,
            'unit', am.unit,
            'updated_at', am.updated_at
          )
        ) filter (where am.id is not null),
        '{}'::jsonb
      ) as metrics,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'full_feedback_text', a.full_feedback_text,
            'summary_text', a.summary_text,
            'raw_generated_text', a.raw_generated_text,
            'full_feedback_json', a.full_feedback_json,
            'feedback_prompt', a.feedback_prompt,
            'title', a.title,
            'created_at', a.created_at,
            'updated_at', a.updated_at
          )
        ) filter (where a.id is not null),
        '[]'::jsonb
      ) as analyses
    from public.analysis_jobs aj
    left join public.analyses a on a.job_id = aj.id
    left join public.analysis_feedback af on af.analysis_id = a.id
    left join public.analysis_metrics am on am.analysis_id = aj.id
    where aj.id = analysis_job_id
      and aj.user_id = (select auth.uid())
    group by aj.id, aj.status, aj.progress_percentage, aj.processing_time_ms, aj.video_source_type,
             aj.created_at, aj.updated_at;
  end if;
end;
$$;

COMMENT ON FUNCTION "public"."get_complete_analysis"("p_job_id" bigint) IS 'Get complete analysis data including feedback content, title, and audio segments';
COMMENT ON FUNCTION "public"."get_enhanced_analysis_with_feedback"("analysis_job_id" bigint) IS 'Get enhanced analysis data with feedback, metrics, and analyses including title';

