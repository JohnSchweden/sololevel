/*
  purpose: bootstrap core tables for auth profiles, todos, and video processing metadata with secure RLS.
  affected: public.profiles, public.todos, public.video_processing_jobs, public.video_files, public.feedback_files
  notes: blobs remain in gcs; db stores metadata and signed urls/paths.
*/

-- profiles
create table if not exists public.profiles (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  username text unique,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles readable by owner"
on public.profiles
for select
to authenticated
using ( user_id = auth.uid() );

create policy "profiles insert by self"
on public.profiles
for insert
to authenticated
with check ( user_id = auth.uid() );

create policy "profiles update by owner"
on public.profiles
for update
to authenticated
using ( user_id = auth.uid() )
with check ( user_id = auth.uid() );

-- Function to handle profile updates
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (user_id, username, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

-- Trigger to automatically create profile on user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger to automatically update updated_at
create trigger handle_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- todos (what your mobile app already hits)
create table if not exists public.todos (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.todos enable row level security;

create index if not exists idx_todos_user on public.todos(user_id);

create policy "todos readable by owner"
on public.todos
for select
to authenticated
using ( user_id = auth.uid() );

create policy "todos insert by owner"
on public.todos
for insert
to authenticated
with check ( user_id = auth.uid() );

create policy "todos update by owner"
on public.todos
for update
to authenticated
using ( user_id = auth.uid() )
with check ( user_id = auth.uid() );

create policy "todos delete by owner"
on public.todos
for delete
to authenticated
using ( user_id = auth.uid() );

-- video processing jobs metadata
create table if not exists public.video_processing_jobs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  video_id text not null,
  status text not null check (status in ('uploaded','processing','completed','error')),
  original_size bigint not null,
  duration_seconds numeric not null,
  ai_model text not null,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.video_processing_jobs enable row level security;

create index if not exists idx_video_jobs_user on public.video_processing_jobs(user_id);
create unique index if not exists uidx_video_jobs_video on public.video_processing_jobs(video_id);

create policy "video jobs readable by owner"
on public.video_processing_jobs
for select
to authenticated
using ( user_id = auth.uid() );

create policy "video jobs insert by owner"
on public.video_processing_jobs
for insert
to authenticated
with check ( user_id = auth.uid() );

create policy "video jobs update by owner"
on public.video_processing_jobs
for update
to authenticated
using ( user_id = auth.uid() )
with check ( user_id = auth.uid() );

-- related files (paths/signed urls to GCS or Supabase Storage)
create table if not exists public.video_files (
  id bigint generated always as identity primary key,
  job_id bigint not null references public.video_processing_jobs(id) on delete cascade,
  kind text not null check (kind in ('video','audio','thumbnail','json','text','ssml')),
  path text not null,
  size_bytes bigint,
  created_at timestamptz not null default now()
);
alter table public.video_files enable row level security;

create policy "video files readable via job ownership"
on public.video_files
for select
to authenticated
using (
  job_id in (
    select id from public.video_processing_jobs where user_id = auth.uid()
  )
);

create policy "video files insert via job ownership"
on public.video_files
for insert
to authenticated
with check (
  job_id in (
    select id from public.video_processing_jobs where user_id = auth.uid()
  )
);

-- optional: feedback files
create table if not exists public.feedback_files (
  id bigint generated always as identity primary key,
  job_id bigint not null references public.video_processing_jobs(id) on delete cascade,
  path text not null,
  created_at timestamptz not null default now()
);
alter table public.feedback_files enable row level security;

create policy "feedback files readable via job ownership"
on public.feedback_files
for select
to authenticated
using (
  job_id in (
    select id from public.video_processing_jobs where user_id = auth.uid()
  )
);

create policy "feedback files insert via job ownership"
on public.feedback_files
for insert
to authenticated
with check (
  job_id in (
    select id from public.video_processing_jobs where user_id = auth.uid()
  )
);
