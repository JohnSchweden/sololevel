-- Schema Validation Tests
-- Tests basic schema structure and table existence

begin;
select plan(12);

-- Test core tables exist
select ok(exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'analysis_jobs'), 'analysis_jobs table should exist');
select ok(exists(select 1 from information_schema.tables where table_schema = 'public' and table_name = 'analysis_metrics'), 'analysis_metrics table should exist');

-- Test table structure for analysis_jobs
select ok(exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'analysis_jobs' and column_name = 'id'), 'analysis_jobs should have id column');
select ok(exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'analysis_jobs' and column_name = 'user_id'), 'analysis_jobs should have user_id column');
select ok(exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'analysis_jobs' and column_name = 'video_recording_id'), 'analysis_jobs should have video_recording_id column');
select ok(exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'analysis_jobs' and column_name = 'status'), 'analysis_jobs should have status column');
select ok(exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'analysis_jobs' and column_name = 'created_at'), 'analysis_jobs should have created_at column');

-- Test table structure for analysis_metrics
select ok(exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'analysis_metrics' and column_name = 'id'), 'analysis_metrics should have id column');
select ok(exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'analysis_metrics' and column_name = 'analysis_id'), 'analysis_metrics should have analysis_id column');
select ok(exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'analysis_metrics' and column_name = 'metric_key'), 'analysis_metrics should have metric_key column');
select ok(exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'analysis_metrics' and column_name = 'metric_value'), 'analysis_metrics should have metric_value column');

-- Test foreign key constraints
select ok(
  exists(
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_class ref on ref.oid = c.confrelid
    where rel.relname = 'analysis_metrics'
      and ref.relname = 'analysis_jobs'
      and c.contype = 'f'
      and c.conname = 'analysis_metrics_analysis_id_fkey'
  ),
  'analysis_metrics should have foreign key to analysis_jobs'
);

select * from finish();
rollback;
