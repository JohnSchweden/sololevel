-- Update database functions to remove job-level SSML references
-- Since we now use per-feedback SSML in analysis_audio_segments.feedback_ssml

-- Update get_analysis_with_metrics function to remove ssml from return type and selection
CREATE OR REPLACE FUNCTION "public"."get_analysis_with_metrics"("analysis_job_id" bigint) RETURNS TABLE("analysis_id" bigint, "status" "text", "progress_percentage" integer, "summary_text" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "metrics" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  return query
  select
    aj.id as analysis_id,
    aj.status,
    aj.progress_percentage,
    aj.summary_text,
    aj.created_at,
    aj.updated_at,
    coalesce(
      jsonb_object_agg(am.metric_key,
        jsonb_build_object(
          'value', am.metric_value,
          'unit', am.unit,
          'updated_at', am.updated_at
        )
      ) filter (where am.id is not null),
      '{}'::jsonb
    ) as metrics
  from public.analysis_jobs aj
  left join public.analysis_metrics am on am.analysis_id = aj.id
  where aj.id = analysis_job_id
    and aj.user_id = (select auth.uid())
  group by aj.id, aj.status, aj.progress_percentage, aj.summary_text, aj.created_at, aj.updated_at;
end;
$$;

-- Update store_analysis_results function to remove p_ssml parameter
CREATE OR REPLACE FUNCTION "public"."store_analysis_results"("analysis_job_id" bigint, "p_summary_text" "text" DEFAULT NULL::"text", "p_metrics" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
declare
  metric_record record;
begin
  -- Update analysis job with text results (removed ssml update)
  update public.analysis_jobs
  set
    summary_text = coalesce(p_summary_text, summary_text),
    status = case when p_summary_text is not null then 'completed' else status end,
    processing_completed_at = case when p_summary_text is not null then now() else processing_completed_at end,
    updated_at = now()
  where id = analysis_job_id;

  -- Insert metrics if provided
  if p_metrics != '{}'::jsonb then
    for metric_record in
      select
        key as metric_key,
        case
          when jsonb_typeof(value) = 'number' then (value::text)::numeric
          when jsonb_typeof(value) = 'string' and value::text ~ '^[0-9]+\.?[0-9]*$' then (value::text)::numeric
          else 0
        end as metric_value,
        case
          when key like '%_percentage' or key like '%_score' then 'percentage'
          when key like '%_time' or key like '%_duration' then 'seconds'
          when key like '%_angle' then 'degrees'
          when key like '%_distance' then 'pixels'
          else 'count'
        end as unit
      from jsonb_each(p_metrics)
      where jsonb_typeof(value) in ('number', 'string')
        and (jsonb_typeof(value) = 'number' or value::text ~ '^[0-9]+\.?[0-9]*$')
    loop
      -- Upsert metric
      insert into public.analysis_metrics (analysis_id, metric_key, metric_value, unit)
      values (analysis_job_id, metric_record.metric_key, metric_record.metric_value, metric_record.unit)
      on conflict (analysis_id, metric_key) do update set
        metric_value = excluded.metric_value,
        unit = excluded.unit,
        updated_at = now();
    end loop;
  end if;
end;
$_$;

-- Update store_enhanced_analysis_results function to remove p_ssml parameter
CREATE OR REPLACE FUNCTION "public"."store_enhanced_analysis_results"("analysis_job_id" bigint, "p_full_feedback_text" "text" DEFAULT NULL::"text", "p_summary_text" "text" DEFAULT NULL::"text", "p_processing_time_ms" bigint DEFAULT NULL::bigint, "p_video_source_type" "text" DEFAULT NULL::"text", "p_feedback" "jsonb" DEFAULT '[]'::"jsonb", "p_metrics" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- Update analysis job with enhanced fields (excluding feedback content)
  update public.analysis_jobs
  set
    processing_time_ms = coalesce(p_processing_time_ms, processing_time_ms),
    video_source_type = coalesce(p_video_source_type, video_source_type),
    status = case when p_full_feedback_text is not null then 'completed' else status end,
    processing_completed_at = case when p_full_feedback_text is not null then now() else processing_completed_at end,
    updated_at = now()
  where id = analysis_job_id;

  -- Note: Feedback content is now handled by store_analysis_results() function
  -- that creates records in the analyses table. SSML and audio are handled per-feedback
  -- in analysis_audio_segments table.
end;
$$;

-- Update backfill_analyses_from_jobs function to remove ssml handling
CREATE OR REPLACE FUNCTION "public"."backfill_analyses_from_jobs"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  analysis_record record;
begin
  -- Insert analyses rows for existing analysis_jobs that have feedback content
  for analysis_record in
    select
      id as job_id,
      full_feedback_text,
      summary_text
    from public.analysis_jobs
    where full_feedback_text is not null or summary_text is not null
  loop
    -- Insert into analyses table
    insert into public.analyses (
      job_id,
      full_feedback_text,
      summary_text
    ) values (
      analysis_record.job_id,
      analysis_record.full_feedback_text,
      analysis_record.summary_text
    );

    -- Note: SSML and audio segments are handled separately by per-feedback data
    -- No job-level SSML or audio to migrate since we're removing that concept
  end loop;

  -- Update existing analysis_feedback records to reference analyses instead of jobs
  update public.analysis_feedback
  set analysis_id = a.id::text::uuid
  from public.analyses a
  where analysis_feedback.analysis_id::text::bigint = a.job_id;

  -- Update analysis_audio_segments to reference the new analyses (if they exist)
  update public.analysis_audio_segments
  set analysis_id = a.id
  from public.analyses a
  where a.job_id = (
    select af.analysis_id::text::bigint
    from public.analysis_feedback af
    where af.id = analysis_audio_segments.analysis_feedback_id
    limit 1
  );

end;
$$;
