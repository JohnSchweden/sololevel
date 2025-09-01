-- Camera Recording and Analysis Schema
-- This migration creates tables for video recordings, analysis jobs, and related data

-- Create video_recordings table
create table public.video_recordings (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  filename text not null,
  original_filename text,
  file_size bigint not null,
  duration_seconds integer not null check (duration_seconds > 0 and duration_seconds <= 60),
  format text not null check (format in ('mp4', 'mov')),
  storage_path text not null,
  upload_status text not null default 'pending' check (upload_status in ('pending', 'uploading', 'completed', 'failed')),
  upload_progress integer default 0 check (upload_progress >= 0 and upload_progress <= 100),
  metadata jsonb default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table public.video_recordings is 'User uploaded video recordings for analysis';

-- Create analysis_jobs table
create table public.analysis_jobs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  video_recording_id bigint references public.video_recordings(id) on delete cascade not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  progress_percentage integer default 0 check (progress_percentage >= 0 and progress_percentage <= 100),
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  error_message text,
  results jsonb default '{}',
  pose_data jsonb default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table public.analysis_jobs is 'AI analysis jobs for video recordings';

-- Create upload_sessions table for tracking upload progress
create table public.upload_sessions (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  video_recording_id bigint references public.video_recordings(id) on delete cascade,
  session_id uuid default gen_random_uuid() not null unique,
  signed_url text not null,
  expires_at timestamptz not null,
  bytes_uploaded bigint default 0,
  total_bytes bigint not null,
  chunk_size integer default 1048576, -- 1MB default chunk size
  status text not null default 'active' check (status in ('active', 'completed', 'expired', 'cancelled')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table public.upload_sessions is 'Upload session tracking for resumable uploads';

-- Create indexes for better performance
create index video_recordings_user_id_idx on public.video_recordings (user_id);
create index video_recordings_upload_status_idx on public.video_recordings (upload_status);
create index video_recordings_created_at_idx on public.video_recordings (created_at desc);

create index analysis_jobs_user_id_idx on public.analysis_jobs (user_id);
create index analysis_jobs_video_recording_id_idx on public.analysis_jobs (video_recording_id);
create index analysis_jobs_status_idx on public.analysis_jobs (status);
create index analysis_jobs_created_at_idx on public.analysis_jobs (created_at desc);

create index upload_sessions_user_id_idx on public.upload_sessions (user_id);
create index upload_sessions_session_id_idx on public.upload_sessions (session_id);
create index upload_sessions_expires_at_idx on public.upload_sessions (expires_at);
create index upload_sessions_status_idx on public.upload_sessions (status);

-- Enable RLS on all tables
alter table public.video_recordings enable row level security;
alter table public.analysis_jobs enable row level security;
alter table public.upload_sessions enable row level security;

-- RLS Policies for video_recordings
create policy "Users can view their own video recordings"
  on public.video_recordings for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own video recordings"
  on public.video_recordings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own video recordings"
  on public.video_recordings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own video recordings"
  on public.video_recordings for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- RLS Policies for analysis_jobs
create policy "Users can view their own analysis jobs"
  on public.analysis_jobs for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own analysis jobs"
  on public.analysis_jobs for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own analysis jobs"
  on public.analysis_jobs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- RLS Policies for upload_sessions
create policy "Users can view their own upload sessions"
  on public.upload_sessions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own upload sessions"
  on public.upload_sessions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own upload sessions"
  on public.upload_sessions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own upload sessions"
  on public.upload_sessions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Function to automatically update updated_at timestamps
create trigger handle_video_recordings_updated_at
  before update on public.video_recordings
  for each row execute procedure public.handle_updated_at();

create trigger handle_analysis_jobs_updated_at
  before update on public.analysis_jobs
  for each row execute procedure public.handle_updated_at();

create trigger handle_upload_sessions_updated_at
  before update on public.upload_sessions
  for each row execute procedure public.handle_updated_at();

-- Function to automatically create analysis job when video upload completes
create or replace function public.create_analysis_job_on_upload_complete()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Only create analysis job when upload status changes to 'completed'
  if old.upload_status != 'completed' and new.upload_status = 'completed' then
    insert into public.analysis_jobs (user_id, video_recording_id)
    values (new.user_id, new.id);
  end if;
  return new;
end;
$$;

-- Trigger to automatically create analysis job on successful upload
create trigger create_analysis_job_on_upload_complete
  after update on public.video_recordings
  for each row execute procedure public.create_analysis_job_on_upload_complete();

-- Function to clean up expired upload sessions
create or replace function public.cleanup_expired_upload_sessions()
returns void
language plpgsql
security definer
as $$
begin
  update public.upload_sessions
  set status = 'expired'
  where expires_at < now() and status = 'active';
end;
$$;

-- Function to get upload progress for a user
create or replace function public.get_upload_progress(recording_id bigint)
returns table (
  id bigint,
  progress_percentage integer,
  upload_status text,
  bytes_uploaded bigint,
  total_bytes bigint
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    vr.id,
    vr.upload_progress as progress_percentage,
    vr.upload_status,
    coalesce(us.bytes_uploaded, 0) as bytes_uploaded,
    coalesce(us.total_bytes, vr.file_size) as total_bytes
  from public.video_recordings vr
  left join public.upload_sessions us on us.video_recording_id = vr.id and us.status = 'active'
  where vr.id = recording_id and vr.user_id = (select auth.uid());
end;
$$;
