-- Add index for fast lookup by storage_path used by storage-upload-finalize
create index if not exists video_recordings_storage_path_idx
  on public.video_recordings (storage_path);


