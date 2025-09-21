-- Index and Performance Tests
-- Tests that proper indexes exist for query performance

begin;
select plan(6);

-- Test indexes exist on foreign keys
select has_index('public', 'analysis_metrics', 'analysis_metrics_analysis_id_idx', 'analysis_metrics should have index on analysis_id');

-- Test indexes exist on commonly queried columns
select has_index('public', 'analysis_jobs', 'analysis_jobs_user_id_idx', 'analysis_jobs should have index on user_id');
select has_index('public', 'analysis_jobs', 'analysis_jobs_status_idx', 'analysis_jobs should have index on status');

-- Test composite indexes exist
select has_index('public', 'analysis_metrics', 'analysis_metrics_analysis_metric_idx', 'analysis_metrics should have composite index on (analysis_id, metric_key)');

-- Test timestamp indexes for time-based queries
select has_index('public', 'analysis_jobs', 'analysis_jobs_created_at_idx', 'analysis_jobs should have index on created_at');
select has_index('public', 'analysis_metrics', 'analysis_metrics_created_at_idx', 'analysis_metrics should have index on created_at');

select * from finish();
rollback;
