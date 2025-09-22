-- Gemini Pipeline Database Enhancements
-- This migration adds structured storage for Gemini AI pipeline outputs

-- 1. Add full report text and processing metadata columns to analysis_jobs
alter table public.analysis_jobs
add column full_report_text text,
add column processing_time_ms bigint,
add column video_source_type text check (video_source_type in ('live_recording', 'uploaded_video'));

comment on column public.analysis_jobs.full_report_text is 'Complete AI-generated analysis report text';
comment on column public.analysis_jobs.processing_time_ms is 'Total processing time in milliseconds';
comment on column public.analysis_jobs.video_source_type is 'Source type of the video being analyzed';

-- 2. Create analysis_feedback table for structured feedback storage
create table public.analysis_feedback (
  id bigint generated always as identity primary key,
  analysis_id bigint references public.analysis_jobs(id) on delete cascade not null,
  timestamp_seconds numeric not null,
  category text not null,
  message text not null,
  confidence numeric check (confidence >= 0 and confidence <= 1),
  impact numeric check (impact >= 0 and impact <= 1),
  created_at timestamptz default now() not null
);

comment on table public.analysis_feedback is 'Individual feedback items from AI analysis';
comment on column public.analysis_feedback.timestamp_seconds is 'Timestamp in video where feedback applies';
comment on column public.analysis_feedback.category is 'Feedback category (Posture, Movement, etc.)';
comment on column public.analysis_feedback.confidence is 'AI confidence score (0-1)';
comment on column public.analysis_feedback.impact is 'Impact score of the feedback (0-1)';

-- Create indexes for analysis_feedback
create index analysis_feedback_analysis_id_idx on public.analysis_feedback (analysis_id);
create index analysis_feedback_category_idx on public.analysis_feedback (category);
create index analysis_feedback_timestamp_idx on public.analysis_feedback (timestamp_seconds);
create index analysis_feedback_created_at_idx on public.analysis_feedback (created_at desc);

-- Composite indexes for common queries
create index analysis_feedback_analysis_category_idx on public.analysis_feedback (analysis_id, category);
create index analysis_feedback_analysis_timestamp_idx on public.analysis_feedback (analysis_id, timestamp_seconds);

-- Enable RLS on analysis_feedback
alter table public.analysis_feedback enable row level security;

-- RLS Policies for analysis_feedback (inherit from parent analysis)
create policy "Users can view feedback for their own analyses"
  on public.analysis_feedback for select
  to authenticated
  using (
    exists (
      select 1 from public.analysis_jobs aj
      where aj.id = analysis_feedback.analysis_id
      and aj.user_id = (select auth.uid())
    )
  );

create policy "Users can insert feedback for their own analyses"
  on public.analysis_feedback for insert
  to authenticated
  with check (
    exists (
      select 1 from public.analysis_jobs aj
      where aj.id = analysis_feedback.analysis_id
      and aj.user_id = (select auth.uid())
    )
  );

-- Service role policies for AI pipeline
create policy "Service role can manage all analysis feedback"
  on public.analysis_feedback for all
  to service_role
  using (true)
  with check (true);

-- 3. Function to store enhanced analysis results
create or replace function public.store_enhanced_analysis_results(
  analysis_job_id bigint,
  p_full_report_text text default null,
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
declare
  feedback_item record;
  metric_record record;
begin
  -- Update analysis job with enhanced fields
  update public.analysis_jobs
  set
    full_report_text = coalesce(p_full_report_text, full_report_text),
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
    for feedback_item in
      select
        (value->>'timestamp')::numeric as timestamp_seconds,
        value->>'category' as category,
        value->>'message' as message,
        (value->>'confidence')::numeric as confidence,
        (value->>'impact')::numeric as impact
      from jsonb_array_elements(p_feedback)
    loop
      insert into public.analysis_feedback (
        analysis_id,
        timestamp_seconds,
        category,
        message,
        confidence,
        impact
      ) values (
        analysis_job_id,
        feedback_item.timestamp_seconds,
        feedback_item.category,
        feedback_item.message,
        feedback_item.confidence,
        feedback_item.impact
      );
    end loop;
  end if;

  -- Insert/update metrics if provided
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
$$;

-- 4. Function to get analysis with enhanced feedback and metrics
create or replace function public.get_enhanced_analysis_with_feedback(analysis_job_id bigint)
returns table (
  analysis_id bigint,
  status text,
  progress_percentage integer,
  full_report_text text,
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
  return query
  select
    aj.id as analysis_id,
    aj.status,
    aj.progress_percentage,
    aj.full_report_text,
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
  group by aj.id, aj.status, aj.progress_percentage, aj.full_report_text, aj.summary_text,
           aj.ssml, aj.audio_url, aj.processing_time_ms, aj.video_source_type,
           aj.created_at, aj.updated_at;
end;
$$;
