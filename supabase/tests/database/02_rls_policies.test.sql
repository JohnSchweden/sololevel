-- Row Level Security (RLS) Policy Tests
-- Tests that RLS policies are properly configured

begin;
select plan(6);

-- Test RLS is enabled on critical tables
select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'analysis_jobs'),
  'RLS should be enabled on analysis_jobs table'
);

select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'analysis_metrics'),
  'RLS should be enabled on analysis_metrics table'
);

-- Test that policies exist for analysis_jobs
select ok(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'analysis_jobs') > 0,
  'analysis_jobs should have RLS policies defined'
);

-- Test that policies exist for analysis_metrics
select ok(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'analysis_metrics') > 0,
  'analysis_metrics should have RLS policies defined'
);

-- Test policy structure (at least one SELECT policy should exist for authenticated users)
select ok(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'analysis_jobs' and cmd = 'SELECT' and 'authenticated' = any(roles)) >= 1,
  'analysis_jobs should have at least one SELECT policy for authenticated users'
);

-- Test policy structure for analysis_metrics
select ok(
  (select count(*) from pg_policies where schemaname = 'public' and tablename = 'analysis_metrics' and cmd = 'SELECT' and 'authenticated' = any(roles)) >= 1,
  'analysis_metrics should have at least one SELECT policy for authenticated users'
);

select * from finish();
rollback;
