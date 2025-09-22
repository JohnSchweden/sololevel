-- Normalize Analysis Schema: Split feedback content and audio data
-- This migration creates the 'analyses' table to store feedback content and
-- extends 'analysis_audio_segments' to include feedback audio data with prompts

-- 1. Create analyses table
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  job_id bigint references public.analysis_jobs(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_feedback_text text,
  summary_text text,
  raw_generated_text text,
  full_feedback_json jsonb,
  feedback_prompt text
);

comment on table public.analyses is 'Normalized analysis results with feedback content and prompts';
comment on column public.analyses.job_id is 'Reference to the analysis job this result belongs to';
comment on column public.analyses.full_feedback_text is 'Complete AI-generated feedback text';
comment on column public.analyses.summary_text is 'Summarized feedback text';
comment on column public.analyses.raw_generated_text is 'Raw text output from the AI model before processing';
comment on column public.analyses.full_feedback_json is 'Complete JSON structure from AI analysis';
comment on column public.analyses.feedback_prompt is 'Prompt used to generate the feedback';

-- Create indexes for performance
create index analyses_job_id_idx on public.analyses (job_id);
create index analyses_created_at_idx on public.analyses (created_at desc);
-- GIN index for JSON queries if needed
create index analyses_feedback_json_idx on public.analyses using gin (full_feedback_json);

-- Enable RLS
alter table public.analyses enable row level security;

-- RLS Policies (inherit security from parent analysis job)
create policy "Users can view analyses for their own jobs"
  on public.analyses for select
  to authenticated
  using (
    exists (
      select 1 from public.analysis_jobs aj
      where aj.id = analyses.job_id
      and aj.user_id = (select auth.uid())
    )
  );

create policy "Users can insert analyses for their own jobs"
  on public.analyses for insert
  to authenticated
  with check (
    exists (
      select 1 from public.analysis_jobs aj
      where aj.id = analyses.job_id
      and aj.user_id = (select auth.uid())
    )
  );

create policy "Users can update analyses for their own jobs"
  on public.analyses for update
  to authenticated
  using (
    exists (
      select 1 from public.analysis_jobs aj
      where aj.id = analyses.job_id
      and aj.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.analysis_jobs aj
      where aj.id = analyses.job_id
      and aj.user_id = (select auth.uid())
    )
  );

-- Service role policies for AI pipeline
create policy "Service role can manage all analyses"
  on public.analyses for all
  to service_role
  using (true)
  with check (true);

-- Trigger to automatically update updated_at
create trigger handle_analyses_updated_at
  before update on public.analyses
  for each row execute procedure public.handle_updated_at();

-- 2. Extend analysis_audio_segments table
alter table public.analysis_audio_segments
  add column analysis_id uuid null references public.analyses(id) on delete cascade,
  add column feedback_ssml text,
  add column feedback_audio_url text,
  add column ssml_prompt text,
  add column audio_prompt text;

comment on column public.analysis_audio_segments.analysis_id is 'Reference to the analysis this audio segment belongs to (nullable during migration)';
comment on column public.analysis_audio_segments.feedback_ssml is 'SSML markup used to generate this audio segment';
comment on column public.analysis_audio_segments.feedback_audio_url is 'URL to the generated audio file';
comment on column public.analysis_audio_segments.ssml_prompt is 'Prompt used to generate the SSML';
comment on column public.analysis_audio_segments.audio_prompt is 'Prompt used to generate the audio (TTS)';

-- Create index for new analysis_id column
create index analysis_audio_segments_analysis_id_idx on public.analysis_audio_segments (analysis_id);

-- Update RLS policies to include analysis ownership
drop policy "Users can view audio segments for their own analyses" on public.analysis_audio_segments;
drop policy "Users can insert audio segments for their own analyses" on public.analysis_audio_segments;
drop policy "Users can update audio segments for their own analyses" on public.analysis_audio_segments;

create policy "Users can view audio segments for their own analyses"
  on public.analysis_audio_segments for select
  to authenticated
  using (
    exists (
      select 1 from public.analyses a
      join public.analysis_jobs aj on aj.id = a.job_id
      where a.id = analysis_audio_segments.analysis_id
      and aj.user_id = (select auth.uid())
    )
  );

create policy "Users can insert audio segments for their own analyses"
  on public.analysis_audio_segments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.analyses a
      join public.analysis_jobs aj on aj.id = a.job_id
      where a.id = analysis_audio_segments.analysis_id
      and aj.user_id = (select auth.uid())
    )
  );

create policy "Users can update audio segments for their own analyses"
  on public.analysis_audio_segments for update
  to authenticated
  using (
    exists (
      select 1 from public.analyses a
      join public.analysis_jobs aj on aj.id = a.job_id
      where a.id = analysis_audio_segments.analysis_id
      and aj.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.analyses a
      join public.analysis_jobs aj on aj.id = a.job_id
      where a.id = analysis_audio_segments.analysis_id
      and aj.user_id = (select auth.uid())
    )
  );

-- 3. Create backfill function to populate analyses from existing analysis_jobs
create or replace function public.backfill_analyses_from_jobs()
returns void
language plpgsql
security definer
as $$
begin
  -- Insert analyses rows for existing analysis_jobs that have feedback content
  insert into public.analyses (
    job_id,
    full_feedback_text,
    summary_text
  )
  select
    id as job_id,
    full_feedback_text,
    summary_text
  from public.analysis_jobs
  where full_feedback_text is not null or summary_text is not null;

  -- Update analysis_audio_segments to reference the new analyses
  update public.analysis_audio_segments
  set
    analysis_id = a.id,
    feedback_ssml = aas.ssml,
    feedback_audio_url = aas.audio_url
  from public.analyses a
  join public.analysis_feedback af on af.analysis_id = a.job_id
  where aas.analysis_feedback_id = af.id;

end;
$$;

comment on function public.backfill_analyses_from_jobs() is 'Backfill analyses table from existing analysis_jobs data and update audio segments';

-- 4. Create function to store analysis results (updated for new schema)
create or replace function public.store_analysis_results(
  p_job_id bigint,
  p_full_feedback_text text default null,
  p_summary_text text default null,
  p_raw_generated_text text default null,
  p_full_feedback_json jsonb default null,
  p_feedback_prompt text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  analysis_id uuid;
begin
  -- Validate inputs
  if p_job_id is null then
    raise exception 'job_id is required';
  end if;

  -- Insert into analyses table
  insert into public.analyses (
    job_id,
    full_feedback_text,
    summary_text,
    raw_generated_text,
    full_feedback_json,
    feedback_prompt
  ) values (
    p_job_id,
    p_full_feedback_text,
    p_summary_text,
    p_raw_generated_text,
    p_full_feedback_json,
    p_feedback_prompt
  )
  returning id into analysis_id;

  -- Update job status if feedback was provided
  if p_full_feedback_text is not null then
    update public.analysis_jobs
    set
      status = 'completed',
      processing_completed_at = now(),
      updated_at = now()
    where id = p_job_id;
  end if;

  return analysis_id;
end;
$$;

comment on function public.store_analysis_results(bigint, text, text, text, jsonb, text) is 'Store analysis results in the new normalized analyses table';

-- 5. Create function to store audio segment with analysis reference
create or replace function public.store_analysis_audio_segment(
  p_analysis_id uuid,
  p_feedback_ssml text,
  p_feedback_audio_url text,
  p_audio_duration_ms int default null,
  p_audio_format text default 'mp3',
  p_ssml_prompt text default null,
  p_audio_prompt text default null
)
returns bigint
language plpgsql
security definer
as $$
declare
  segment_id bigint;
begin
  -- Validate inputs
  if p_analysis_id is null or p_feedback_ssml is null or p_feedback_audio_url is null then
    raise exception 'analysis_id, feedback_ssml, and feedback_audio_url are required';
  end if;

  -- Insert the audio segment
  insert into public.analysis_audio_segments (
    analysis_id,
    feedback_ssml,
    feedback_audio_url,
    audio_duration_ms,
    audio_format,
    ssml_prompt,
    audio_prompt
  ) values (
    p_analysis_id,
    p_feedback_ssml,
    p_feedback_audio_url,
    p_audio_duration_ms,
    p_audio_format,
    p_ssml_prompt,
    p_audio_prompt
  )
  returning id into segment_id;

  return segment_id;
end;
$$;

comment on function public.store_analysis_audio_segment(uuid, text, text, int, text, text, text) is 'Store an audio segment for a specific analysis with prompts';

-- 6. Create function to get complete analysis with feedback and audio
create or replace function public.get_complete_analysis(job_id bigint)
returns table (
  analysis_id uuid,
  job_status text,
  job_progress_percentage integer,
  full_feedback_text text,
  summary_text text,
  raw_generated_text text,
  full_feedback_json jsonb,
  feedback_prompt text,
  audio_segments jsonb
)
language plpgsql
security definer
as $$
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
  where aj.id = job_id
    and aj.user_id = (select auth.uid())
  group by a.id, aj.status, aj.progress_percentage, a.full_feedback_text, a.summary_text,
           a.raw_generated_text, a.full_feedback_json, a.feedback_prompt;
end;
$$;

comment on function public.get_complete_analysis(bigint) is 'Get complete analysis data including feedback content and audio segments';
