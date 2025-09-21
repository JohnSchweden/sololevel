-- Data Integrity Tests
-- Tests constraints, defaults, and data validation

begin;
select plan(8);

-- Test primary key constraints
select col_is_pk('public', 'analysis_jobs', 'id', 'id should be primary key for analysis_jobs');
select col_is_pk('public', 'analysis_metrics', 'id', 'id should be primary key for analysis_metrics');

-- Test NOT NULL constraints
select col_not_null('public', 'analysis_jobs', 'user_id', 'user_id should be NOT NULL');
select col_not_null('public', 'analysis_jobs', 'video_url', 'video_url should be NOT NULL');
select col_not_null('public', 'analysis_jobs', 'status', 'status should be NOT NULL');

select col_not_null('public', 'analysis_metrics', 'analysis_id', 'analysis_id should be NOT NULL');
select col_not_null('public', 'analysis_metrics', 'metric_key', 'metric_key should be NOT NULL');
select col_not_null('public', 'analysis_metrics', 'metric_value', 'metric_value should be NOT NULL');

-- Test default values
select col_has_default('public', 'analysis_jobs', 'created_at', 'created_at should have default value');
select col_has_default('public', 'analysis_metrics', 'created_at', 'created_at should have default value');

select * from finish();
rollback;
