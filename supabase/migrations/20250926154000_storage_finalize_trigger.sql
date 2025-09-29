-- Database-level alternative to Storage webhook: finalize uploads on raw object creation
-- Note: This runs inside Postgres on INSERT into storage.objects (for bucket 'raw').
-- Pros: survives db reset automatically with migrations.
-- Cons: runs in DB; be cautious with heavy logic (we only do a small update).

create or replace function public.finalize_video_on_raw_object()
returns trigger
language plpgsql
security definer
as $$
declare
  affected_rows int;
begin
  -- Only for raw bucket (compare id directly)
  if new.bucket_id <> 'raw' then
    return new;
  end if;

  raise notice 'TRIGGER: Processing raw bucket object: %', new.name;

  -- Mark matching video_recordings as completed, idempotent
  update public.video_recordings
    set upload_status = 'completed',
        upload_progress = 100,
        updated_at = now()
  where storage_path = new.name
    and upload_status <> 'completed';

  get diagnostics affected_rows = row_count;
  raise notice 'TRIGGER: Updated % video_recordings rows for path: %', affected_rows, new.name;

  return new;
end;
$$;

alter function public.finalize_video_on_raw_object() owner to postgres;

-- drop trigger if exists trg_finalize_video_on_raw_object on storage.objects;
create trigger trg_finalize_video_on_raw_object
after insert on storage.objects
for each row execute function public.finalize_video_on_raw_object();

comment on function public.finalize_video_on_raw_object() is 'Finalizes video_recordings on raw storage object creation';
