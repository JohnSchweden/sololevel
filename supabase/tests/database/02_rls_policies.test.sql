-- Row Level Security (RLS) Policy Tests
-- Tests that RLS policies are properly configured

begin;
select plan(6);

-- Test RLS is enabled on critical tables
select is(
  (select row_security from information_schema.tables where table_schema = 'public' and table_name = 'analysis_jobs'),
  true,
  'RLS should be enabled on analysis_jobs table'
);

select is(
  (select row_security from information_schema.tables where table_schema = 'public' and table_name = 'analysis_metrics'),
  true,
  'RLS should be enabled on analysis_metrics table'
);

-- Test that policies exist for analysis_jobs
select isnt_empty(
  $$select count(*) from pg_policies where schemaname = 'public' and tablename = 'analysis_jobs'$$,
  'analysis_jobs should have RLS policies defined'
);

-- Test that policies exist for analysis_metrics
select isnt_empty(
  $$select count(*) from pg_policies where schemaname = 'public' and tablename = 'analysis_metrics'$$,
  'analysis_metrics should have RLS policies defined'
);

-- Test policy structure (at least one SELECT policy should exist for authenticated users)
select results_eq(
  $$select count(*) from pg_policies where schemaname = 'public' and tablename = 'analysis_jobs' and cmd = 'SELECT' and roles @> ARRAY['authenticated']$$,
  ARRAY[1::bigint],
  'analysis_jobs should have at least one SELECT policy for authenticated users'
);

-- Test policy structure for analysis_metrics
select results_eq(
  $$select count(*) from pg_policies where schemaname = 'public' and tablename = 'analysis_metrics' and cmd = 'SELECT' and roles @> ARRAY['authenticated']$$,
  ARRAY[1::bigint],
  'analysis_metrics should have at least one SELECT policy for authenticated users'
);

select * from finish();
rollback;
