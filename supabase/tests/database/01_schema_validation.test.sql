-- Schema Validation Tests
-- Tests basic schema structure and table existence

begin;
select plan(10);

-- Test core tables exist
select has_table('public', 'analysis_jobs', 'analysis_jobs table should exist');
select has_table('public', 'analysis_metrics', 'analysis_metrics table should exist');

-- Test table structure for analysis_jobs
select has_column('public', 'analysis_jobs', 'id', 'analysis_jobs should have id column');
select has_column('public', 'analysis_jobs', 'user_id', 'analysis_jobs should have user_id column');
select has_column('public', 'analysis_jobs', 'video_url', 'analysis_jobs should have video_url column');
select has_column('public', 'analysis_jobs', 'status', 'analysis_jobs should have status column');
select has_column('public', 'analysis_jobs', 'created_at', 'analysis_jobs should have created_at column');

-- Test table structure for analysis_metrics
select has_column('public', 'analysis_metrics', 'id', 'analysis_metrics should have id column');
select has_column('public', 'analysis_metrics', 'analysis_id', 'analysis_metrics should have analysis_id column');
select has_column('public', 'analysis_metrics', 'metric_key', 'analysis_metrics should have metric_key column');
select has_column('public', 'analysis_metrics', 'metric_value', 'analysis_metrics should have metric_value column');

-- Test foreign key constraints
select has_fk('public', 'analysis_metrics', 'analysis_metrics_analysis_id_fkey', 'analysis_metrics should have foreign key to analysis_jobs');

select * from finish();
rollback;
