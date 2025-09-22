-- Business Logic Tests
-- Tests that the schema supports the application's core workflows

begin;
select plan(5);

-- Use the seeded test user that exists in auth.users
-- Insert test video recording first
insert into public.video_recordings (user_id, filename, original_filename, file_size, duration_seconds, format, storage_path, upload_status)
values ('00000000-0000-0000-0000-000000000000', 'test-video.mp4', 'test-video.mp4', 1048576, 30, 'mp4', 'raw/test-video.mp4', 'completed');

-- Insert test analysis job
insert into public.analysis_jobs (user_id, video_recording_id, status)
select '00000000-0000-0000-0000-000000000000', id, 'queued' from public.video_recordings where filename = 'test-video.mp4';

-- Test that analysis can be created
select ok(
  exists(select id from public.analysis_jobs where user_id = '00000000-0000-0000-0000-000000000000' and status = 'queued'),
  'Should be able to create analysis job'
);

-- Test that metrics can be added to analysis
insert into public.analysis_metrics (analysis_id, metric_key, metric_value, unit)
select id, 'form_score', 85.5, 'percentage' from public.analysis_jobs where user_id = '00000000-0000-0000-0000-000000000000';

select ok(
  exists(select * from public.analysis_metrics where metric_key = 'form_score' and metric_value = 85.5),
  'Should be able to add metrics to analysis'
);

-- Test cascade delete (when analysis is deleted, metrics should be deleted too)
delete from public.analysis_jobs where user_id = '00000000-0000-0000-0000-000000000000';

select ok(
  not exists(select * from public.analysis_metrics where metric_key = 'form_score' and metric_value = 85.5),
  'Metrics should be cascade deleted when analysis is deleted'
);

-- Test enum-like status values (should accept valid statuses)
insert into public.analysis_jobs (user_id, video_recording_id, status)
select '00000000-0000-0000-0000-000000000000', id, 'completed' from public.video_recordings where filename = 'test-video.mp4';

select ok(
  exists(select id from public.analysis_jobs where user_id = '00000000-0000-0000-0000-000000000000' and status = 'completed'),
  'Should accept valid status values'
);

-- Test that analysis jobs can be updated
update public.analysis_jobs
set status = 'processing', processing_started_at = now()
where user_id = '00000000-0000-0000-0000-000000000000' and status = 'completed';

select ok(
  exists(select id from public.analysis_jobs where user_id = '00000000-0000-0000-0000-000000000000' and status = 'processing' and processing_started_at is not null),
  'Should be able to update analysis job status and timestamps'
);

select * from finish();
rollback;
