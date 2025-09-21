-- Business Logic Tests
-- Tests that the schema supports the application's core workflows

begin;
select plan(5);

-- Insert test data
insert into public.analysis_jobs (user_id, video_url, status)
values ('test-user-123', 'https://example.com/test-video.mp4', 'pending')
returning id into temp_analysis_id;

-- Test that analysis can be created
select isnt_empty(
  $$select id from public.analysis_jobs where user_id = 'test-user-123' and status = 'pending'$$,
  'Should be able to create analysis job'
);

-- Test that metrics can be added to analysis
insert into public.analysis_metrics (analysis_id, metric_key, metric_value, unit)
select id, 'form_score', 85.5, 'percentage' from public.analysis_jobs where user_id = 'test-user-123';

select isnt_empty(
  $$select * from public.analysis_metrics where metric_key = 'form_score' and metric_value = 85.5$$,
  'Should be able to add metrics to analysis'
);

-- Test cascade delete (when analysis is deleted, metrics should be deleted too)
delete from public.analysis_jobs where user_id = 'test-user-123';

select is_empty(
  $$select * from public.analysis_metrics where metric_key = 'form_score' and metric_value = 85.5$$,
  'Metrics should be cascade deleted when analysis is deleted'
);

-- Test enum-like status values (should accept valid statuses)
insert into public.analysis_jobs (user_id, video_url, status)
values ('test-user-456', 'https://example.com/test-video2.mp4', 'completed');

select isnt_empty(
  $$select id from public.analysis_jobs where user_id = 'test-user-456' and status = 'completed'$$,
  'Should accept valid status values'
);

-- Test that analysis jobs can be updated
update public.analysis_jobs
set status = 'processing', processing_started_at = now()
where user_id = 'test-user-456';

select isnt_empty(
  $$select id from public.analysis_jobs where user_id = 'test-user-456' and status = 'processing' and processing_started_at is not null$$,
  'Should be able to update analysis job status and timestamps'
);

select * from finish();
rollback;
