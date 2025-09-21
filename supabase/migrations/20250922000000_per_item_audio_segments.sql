-- Per-Item Audio Segments Database Schema
-- This migration adds support for per-feedback-item audio segments
-- enabling clip-by-clip voiceover functionality

-- 1. Create analysis_audio_segments table
create table public.analysis_audio_segments (
  id bigint generated always as identity primary key,
  analysis_feedback_id bigint references public.analysis_feedback(id) on delete cascade not null,
  ssml text not null,
  audio_url text not null,
  audio_duration_ms int,
  audio_format text default 'mp3' check (audio_format in ('mp3', 'aac', 'wav')),
  created_at timestamptz default now() not null
);

comment on table public.analysis_audio_segments is 'Audio segments for individual feedback items, enabling per-feedback voiceover';
comment on column public.analysis_audio_segments.analysis_feedback_id is 'Reference to the feedback item this audio segment belongs to';
comment on column public.analysis_audio_segments.ssml is 'SSML markup used to generate this audio segment';
comment on column public.analysis_audio_segments.audio_url is 'URL to the generated audio file';
comment on column public.analysis_audio_segments.audio_duration_ms is 'Duration of the audio segment in milliseconds';
comment on column public.analysis_audio_segments.audio_format is 'Audio format (mp3, aac, wav)';

-- Create indexes for performance
create index analysis_audio_segments_feedback_id_idx on public.analysis_audio_segments (analysis_feedback_id);
create index analysis_audio_segments_created_at_idx on public.analysis_audio_segments (created_at desc);
create index analysis_audio_segments_format_idx on public.analysis_audio_segments (audio_format);

-- Composite index for common queries
create index analysis_audio_segments_feedback_format_idx on public.analysis_audio_segments (analysis_feedback_id, audio_format);

-- Enable RLS
alter table public.analysis_audio_segments enable row level security;

-- RLS Policies (inherit security from parent feedback/analysis)
create policy "Users can view audio segments for their own analyses"
  on public.analysis_audio_segments for select
  to authenticated
  using (
    exists (
      select 1 from public.analysis_feedback af
      join public.analysis_jobs aj on aj.id = af.analysis_id
      where af.id = analysis_audio_segments.analysis_feedback_id
      and aj.user_id = (select auth.uid())
    )
  );

create policy "Users can insert audio segments for their own analyses"
  on public.analysis_audio_segments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.analysis_feedback af
      join public.analysis_jobs aj on aj.id = af.analysis_id
      where af.id = analysis_audio_segments.analysis_feedback_id
      and aj.user_id = (select auth.uid())
    )
  );

create policy "Users can update audio segments for their own analyses"
  on public.analysis_audio_segments for update
  to authenticated
  using (
    exists (
      select 1 from public.analysis_feedback af
      join public.analysis_jobs aj on aj.id = af.analysis_id
      where af.id = analysis_audio_segments.analysis_feedback_id
      and aj.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.analysis_feedback af
      join public.analysis_jobs aj on aj.id = af.analysis_id
      where af.id = analysis_audio_segments.analysis_feedback_id
      and aj.user_id = (select auth.uid())
    )
  );

-- Service role policies for AI pipeline
create policy "Service role can manage all audio segments"
  on public.analysis_audio_segments for all
  to service_role
  using (true)
  with check (true);

-- 2. Function to store audio segment
create or replace function public.store_audio_segment(
  p_analysis_feedback_id bigint,
  p_ssml text,
  p_audio_url text,
  p_audio_duration_ms int default null,
  p_audio_format text default 'mp3'
)
returns bigint
language plpgsql
security definer
as $$
declare
  segment_id bigint;
begin
  -- Validate inputs
  if p_analysis_feedback_id is null or p_ssml is null or p_audio_url is null then
    raise exception 'analysis_feedback_id, ssml, and audio_url are required';
  end if;

  -- Insert the audio segment
  insert into public.analysis_audio_segments (
    analysis_feedback_id,
    ssml,
    audio_url,
    audio_duration_ms,
    audio_format
  ) values (
    p_analysis_feedback_id,
    p_ssml,
    p_audio_url,
    p_audio_duration_ms,
    p_audio_format
  )
  returning id into segment_id;

  return segment_id;
end;
$$;

comment on function public.store_audio_segment(bigint, text, text, int, text) is 'Store an audio segment for a specific feedback item';

-- 3. Function to get feedback with audio segments
create or replace function public.get_feedback_with_audio(analysis_job_id bigint)
returns table (
  feedback_id bigint,
  analysis_id bigint,
  timestamp_seconds numeric,
  category text,
  message text,
  confidence numeric,
  impact numeric,
  feedback_created_at timestamptz,
  audio_segments jsonb
)
language plpgsql
security definer
as $$
begin
  return query
  select
    af.id as feedback_id,
    af.analysis_id,
    af.timestamp_seconds,
    af.category,
    af.message,
    af.confidence,
    af.impact,
    af.created_at as feedback_created_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', aas.id,
          'ssml', aas.ssml,
          'audio_url', aas.audio_url,
          'audio_duration_ms', aas.audio_duration_ms,
          'audio_format', aas.audio_format,
          'created_at', aas.created_at
        )
      ) filter (where aas.id is not null),
      '[]'::jsonb
    ) as audio_segments
  from public.analysis_feedback af
  join public.analysis_jobs aj on aj.id = af.analysis_id
  left join public.analysis_audio_segments aas on aas.analysis_feedback_id = af.id
  where aj.id = analysis_job_id
    and aj.user_id = (select auth.uid())
  group by af.id, af.analysis_id, af.timestamp_seconds, af.category, af.message,
           af.confidence, af.impact, af.created_at
  order by af.timestamp_seconds;
end;
$$;

comment on function public.get_feedback_with_audio(bigint) is 'Get feedback items with their associated audio segments for an analysis job';

-- 4. Function to get audio segments for a specific feedback item
create or replace function public.get_audio_segments_for_feedback(feedback_item_id bigint)
returns table (
  id bigint,
  ssml text,
  audio_url text,
  audio_duration_ms int,
  audio_format text,
  created_at timestamptz
)
language plpgsql
security definer
as $$
begin
  return query
  select
    aas.id,
    aas.ssml,
    aas.audio_url,
    aas.audio_duration_ms,
    aas.audio_format,
    aas.created_at
  from public.analysis_audio_segments aas
  join public.analysis_feedback af on af.id = aas.analysis_feedback_id
  join public.analysis_jobs aj on aj.id = af.analysis_id
  where aas.analysis_feedback_id = feedback_item_id
    and aj.user_id = (select auth.uid())
  order by aas.created_at desc;
end;
$$;

comment on function public.get_audio_segments_for_feedback(bigint) is 'Get all audio segments for a specific feedback item';
