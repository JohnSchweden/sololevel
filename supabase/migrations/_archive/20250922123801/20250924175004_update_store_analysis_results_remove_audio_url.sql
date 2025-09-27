-- Update store_analysis_results function to remove p_audio_url parameter and audio_url update
-- Since we now use per-feedback audio in analysis_audio_segments instead of job-level audio

CREATE OR REPLACE FUNCTION "public"."store_analysis_results"("analysis_job_id" bigint, "p_summary_text" "text" DEFAULT NULL::"text", "p_ssml" "text" DEFAULT NULL::"text", "p_metrics" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
declare
  metric_record record;
begin
  -- Update analysis job with text results (removed audio_url update)
  update public.analysis_jobs
  set
    summary_text = coalesce(p_summary_text, summary_text),
    ssml = coalesce(p_ssml, ssml),
    status = case when p_summary_text is not null or p_ssml is not null then 'completed' else status end,
    processing_completed_at = case when p_summary_text is not null or p_ssml is not null then now() else processing_completed_at end,
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
