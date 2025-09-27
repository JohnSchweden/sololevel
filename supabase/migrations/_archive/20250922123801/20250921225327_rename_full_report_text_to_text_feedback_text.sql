-- Rename full_report_text column to text_feedback_text in analysis_jobs table
-- This change aligns the column name with the updated text markers

-- Rename the column
alter table public.analysis_jobs
rename column full_report_text to text_feedback_text;

-- Update the comment to reflect the new naming
comment on column public.analysis_jobs.text_feedback_text is 'Complete AI-generated feedback text';

-- Update function parameter and internal references
create or replace function public.store_enhanced_analysis_results(
  analysis_job_id bigint,
  p_full_report_text text default null, -- Keep parameter name for backward compatibility
  p_summary_text text default null,
  p_ssml text default null,
  p_audio_url text default null,
  p_processing_time_ms bigint default null,
  p_video_source_type text default null,
  p_feedback jsonb default '[]'::jsonb,
  p_metrics jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
as $$
begin
  -- Update analysis job with enhanced fields
  update public.analysis_jobs
  set
    text_feedback_text = coalesce(p_full_report_text, text_feedback_text), -- Updated column reference
    summary_text = coalesce(p_summary_text, summary_text),
    ssml = coalesce(p_ssml, ssml),
    audio_url = coalesce(p_audio_url, audio_url),
    processing_time_ms = coalesce(p_processing_time_ms, processing_time_ms),
    video_source_type = coalesce(p_video_source_type, video_source_type),
    status = case when p_full_report_text is not null then 'completed' else status end,
    processing_completed_at = case when p_full_report_text is not null then now() else processing_completed_at end,
    updated_at = now()
  where id = analysis_job_id;

  -- Insert feedback items if provided
  if jsonb_array_length(p_feedback) > 0 then
    insert into public.analysis_feedback (
      analysis_id,
      timestamp_seconds,
      category,
      message,
      confidence,
      impact
    )
    select
      analysis_job_id,
      (value->>'timestamp')::numeric as timestamp_seconds,
      value->>'category' as category,
      value->>'message' as message,
      (value->>'confidence')::numeric as confidence,
      (value->>'impact')::numeric as impact
    from jsonb_array_elements(p_feedback);
  end if;

  -- Insert/update metrics if provided
  if p_metrics != '{}'::jsonb then
    insert into public.analysis_metrics (analysis_id, metric_key, metric_value, unit)
    select
      analysis_job_id,
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
    on conflict (analysis_id, metric_key) do update set
      metric_value = excluded.metric_value,
      unit = excluded.unit,
      updated_at = now();
  end if;
end;
$$;

-- Update the get_enhanced_analysis_with_feedback function to return text_feedback_text
drop function if exists public.get_enhanced_analysis_with_feedback(bigint);
create function public.get_enhanced_analysis_with_feedback(analysis_job_id bigint)
returns table (
  analysis_id bigint,
  status text,
  progress_percentage integer,
  text_feedback_text text, -- Updated column name in return type
  summary_text text,
  ssml text,
  audio_url text,
  processing_time_ms bigint,
  video_source_type text,
  created_at timestamptz,
  updated_at timestamptz,
  feedback jsonb,
  metrics jsonb
)
language plpgsql
security definer
as $$
begin
  -- Allow service role to bypass RLS, but authenticated users still need to own the analysis
  if (select auth.role()) = 'service_role' then
    return query
    select
      aj.id as analysis_id,
      aj.status,
      aj.progress_percentage,
      aj.text_feedback_text, -- Updated column reference
      aj.summary_text,
      aj.ssml,
      aj.audio_url,
      aj.processing_time_ms,
      aj.video_source_type,
      aj.created_at,
      aj.updated_at,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', af.id,
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
      ) as metrics
    from public.analysis_jobs aj
    left join public.analysis_feedback af on af.analysis_id = aj.id
    left join public.analysis_metrics am on am.analysis_id = aj.id
    where aj.id = analysis_job_id
    group by aj.id, aj.status, aj.progress_percentage, aj.text_feedback_text, aj.summary_text, -- Updated column reference
             aj.ssml, aj.audio_url, aj.processing_time_ms, aj.video_source_type,
             aj.created_at, aj.updated_at;
  else
    -- For authenticated users, enforce ownership
    return query
    select
      aj.id as analysis_id,
      aj.status,
      aj.progress_percentage,
      aj.text_feedback_text, -- Updated column reference
      aj.summary_text,
      aj.ssml,
      aj.audio_url,
      aj.processing_time_ms,
      aj.video_source_type,
      aj.created_at,
      aj.updated_at,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', af.id,
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
      ) as metrics
    from public.analysis_jobs aj
    left join public.analysis_feedback af on af.analysis_id = aj.id
    left join public.analysis_metrics am on am.analysis_id = aj.id
    where aj.id = analysis_job_id
      and aj.user_id = (select auth.uid())
    group by aj.id, aj.status, aj.progress_percentage, aj.text_feedback_text, aj.summary_text, -- Updated column reference
             aj.ssml, aj.audio_url, aj.processing_time_ms, aj.video_source_type,
             aj.created_at, aj.updated_at;
  end if;
end;
$$;
