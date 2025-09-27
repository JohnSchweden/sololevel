-- Phase 1: TRD Alignment Migration
-- This migration adds TRD-compliant schema improvements and service role policies

-- 1. Add TTS/Audio fields to analysis_jobs table
alter table public.analysis_jobs 
add column summary_text text,
add column ssml text,
add column audio_url text;

comment on column public.analysis_jobs.summary_text is 'AI-generated summary of video analysis';
comment on column public.analysis_jobs.ssml is 'SSML markup for text-to-speech generation';
comment on column public.analysis_jobs.audio_url is 'URL to generated audio feedback file';

-- 2. Create analysis_metrics table per TRD specification
create table public.analysis_metrics (
  id bigint generated always as identity primary key,
  analysis_id bigint references public.analysis_jobs(id) on delete cascade not null,
  metric_key text not null,
  metric_value numeric not null,
  unit text not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table public.analysis_metrics is 'Individual metrics extracted from video analysis';
comment on column public.analysis_metrics.analysis_id is 'Reference to parent analysis job';
comment on column public.analysis_metrics.metric_key is 'Metric identifier (e.g., form_score, balance_rating)';
comment on column public.analysis_metrics.metric_value is 'Numeric value of the metric';
comment on column public.analysis_metrics.unit is 'Unit of measurement (e.g., percentage, seconds, degrees)';

-- Create indexes for analysis_metrics
create index analysis_metrics_analysis_id_idx on public.analysis_metrics (analysis_id);
create index analysis_metrics_metric_key_idx on public.analysis_metrics (metric_key);
create index analysis_metrics_created_at_idx on public.analysis_metrics (created_at desc);

-- Composite index for metric queries
create index analysis_metrics_analysis_metric_idx on public.analysis_metrics (analysis_id, metric_key);

-- Enable RLS on analysis_metrics
alter table public.analysis_metrics enable row level security;

-- RLS Policies for analysis_metrics (inherit from parent analysis)
create policy "Users can view metrics for their own analyses"
  on public.analysis_metrics for select
  to authenticated
  using (
    exists (
      select 1 from public.analysis_jobs aj 
      where aj.id = analysis_metrics.analysis_id 
      and aj.user_id = (select auth.uid())
    )
  );

create policy "Users can insert metrics for their own analyses"
  on public.analysis_metrics for insert
  to authenticated
  with check (
    exists (
      select 1 from public.analysis_jobs aj 
      where aj.id = analysis_metrics.analysis_id 
      and aj.user_id = (select auth.uid())
    )
  );

create policy "Users can update metrics for their own analyses"
  on public.analysis_metrics for update
  to authenticated
  using (
    exists (
      select 1 from public.analysis_jobs aj 
      where aj.id = analysis_metrics.analysis_id 
      and aj.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.analysis_jobs aj 
      where aj.id = analysis_metrics.analysis_id 
      and aj.user_id = (select auth.uid())
    )
  );

-- 3. Service Role Policies for AI Pipeline Operations
-- These policies allow the service role to manage all analyses and metrics for AI processing

create policy "Service role can manage all analysis jobs"
  on public.analysis_jobs for all
  to service_role
  using (true)
  with check (true);

create policy "Service role can manage all analysis metrics"
  on public.analysis_metrics for all
  to service_role
  using (true)
  with check (true);

create policy "Service role can manage all video recordings"
  on public.video_recordings for all
  to service_role
  using (true)
  with check (true);

create policy "Service role can manage all upload sessions"
  on public.upload_sessions for all
  to service_role
  using (true)
  with check (true);

-- 4. Add updated_at trigger for analysis_metrics
create trigger handle_analysis_metrics_updated_at
  before update on public.analysis_metrics
  for each row execute procedure public.handle_updated_at();

-- 5. Function to migrate existing JSONB results to analysis_metrics table
create or replace function public.migrate_results_to_metrics()
returns void
language plpgsql
security definer
as $$
declare
  job_record record;
  metric_record record;
begin
  -- Iterate through analysis jobs that have results in JSONB format
  for job_record in 
    select id, results 
    from public.analysis_jobs 
    where results is not null and results != '{}'::jsonb
  loop
    -- Extract metrics from JSONB and insert into analysis_metrics table
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
      from jsonb_each(job_record.results)
      where jsonb_typeof(value) in ('number', 'string')
        and (jsonb_typeof(value) = 'number' or value::text ~ '^[0-9]+\.?[0-9]*$')
    loop
      -- Insert metric if it doesn't already exist
      insert into public.analysis_metrics (analysis_id, metric_key, metric_value, unit)
      values (job_record.id, metric_record.metric_key, metric_record.metric_value, metric_record.unit)
      on conflict do nothing;
    end loop;
  end loop;
end;
$$;

-- 6. Function to get analysis with metrics (TRD-compliant query)
create or replace function public.get_analysis_with_metrics(analysis_job_id bigint)
returns table (
  analysis_id bigint,
  status text,
  progress_percentage integer,
  summary_text text,
  ssml text,
  audio_url text,
  created_at timestamptz,
  updated_at timestamptz,
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
    aj.summary_text,
    aj.ssml,
    aj.audio_url,
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
  group by aj.id, aj.status, aj.progress_percentage, aj.summary_text, aj.ssml, aj.audio_url, aj.created_at, aj.updated_at;
end;
$$;

-- 7. Function to store analysis results (TRD-compliant)
create or replace function public.store_analysis_results(
  analysis_job_id bigint,
  p_summary_text text default null,
  p_ssml text default null,
  p_audio_url text default null,
  p_metrics jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
as $$
declare
  metric_record record;
begin
  -- Update analysis job with text results
  update public.analysis_jobs
  set 
    summary_text = coalesce(p_summary_text, summary_text),
    ssml = coalesce(p_ssml, ssml),
    audio_url = coalesce(p_audio_url, audio_url),
    status = case when p_summary_text is not null or p_ssml is not null or p_audio_url is not null then 'completed' else status end,
    processing_completed_at = case when p_summary_text is not null or p_ssml is not null or p_audio_url is not null then now() else processing_completed_at end,
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
$$;

-- Add unique constraint for metric keys per analysis
alter table public.analysis_metrics 
add constraint analysis_metrics_analysis_metric_unique 
unique (analysis_id, metric_key);
