-- Voice Preferences Schema Tests
-- Tests for profiles and analysis_jobs table extensions for voice preferences
-- Following TDD: Write these tests first, then apply migration

begin;
select plan(11);

-- Test 1: coach_gender column exists on profiles
select ok(
  (select count(*) from information_schema.columns
   where table_schema = 'public'
   and table_name = 'profiles'
   and column_name = 'coach_gender') = 1,
  'profiles table should have coach_gender column'
);

-- Test 2: coach_mode column exists on profiles
select ok(
  (select count(*) from information_schema.columns
   where table_schema = 'public'
   and table_name = 'profiles'
   and column_name = 'coach_mode') = 1,
  'profiles table should have coach_mode column'
);

-- Test 3: coach_gender has default value of 'female'
select is(
  (select column_default from information_schema.columns
   where table_schema = 'public'
   and table_name = 'profiles'
   and column_name = 'coach_gender'),
  '''female''::text',
  'coach_gender should default to female'
);

-- Test 4: coach_mode has default value of 'roast'
select is(
  (select column_default from information_schema.columns
   where table_schema = 'public'
   and table_name = 'profiles'
   and column_name = 'coach_mode'),
  '''roast''::text',
  'coach_mode should default to roast'
);

-- Test 5: CHECK constraint exists on coach_gender
select ok(
  (select count(*) from pg_constraint c
   join pg_class t on c.conrelid = t.oid
   join pg_namespace n on n.oid = t.relnamespace
   where n.nspname = 'public'
   and t.relname = 'profiles'
   and c.contype = 'c'
   and c.conname like '%coach_gender%') >= 1,
  'CHECK constraint should exist on coach_gender column'
);

-- Test 6: CHECK constraint exists on coach_mode
select ok(
  (select count(*) from pg_constraint c
   join pg_class t on c.conrelid = t.oid
   join pg_namespace n on n.oid = t.relnamespace
   where n.nspname = 'public'
   and t.relname = 'profiles'
   and c.contype = 'c'
   and c.conname like '%coach_mode%') >= 1,
  'CHECK constraint should exist on coach_mode column'
);

-- Test 7: coach_gender column exists on analysis_jobs
select ok(
  (select count(*) from information_schema.columns
   where table_schema = 'public'
   and table_name = 'analysis_jobs'
   and column_name = 'coach_gender') = 1,
  'analysis_jobs table should have coach_gender snapshot column'
);

-- Test 8: voice_name_used column exists on analysis_jobs
select ok(
  (select count(*) from information_schema.columns
   where table_schema = 'public'
   and table_name = 'analysis_jobs'
   and column_name = 'voice_name_used') = 1,
  'analysis_jobs table should have voice_name_used snapshot column'
);

-- Test 9: avatar_asset_key_used column exists on analysis_jobs
select ok(
  (select count(*) from information_schema.columns
   where table_schema = 'public'
   and table_name = 'analysis_jobs'
   and column_name = 'avatar_asset_key_used') = 1,
  'analysis_jobs table should have avatar_asset_key_used snapshot column'
);

-- Test 10: Snapshot columns are nullable (for legacy data)
select ok(
  (select count(*) from information_schema.columns
   where table_schema = 'public'
   and table_name = 'analysis_jobs'
   and column_name IN ('coach_gender', 'coach_mode', 'voice_name_used', 'avatar_asset_key_used')
   and is_nullable = 'YES') = 4,
  'All snapshot columns on analysis_jobs should be nullable'
);

-- Test 11: coach_mode snapshot column exists on analysis_jobs
select ok(
  (select count(*) from information_schema.columns
   where table_schema = 'public'
   and table_name = 'analysis_jobs'
   and column_name = 'coach_mode') = 1,
  'analysis_jobs table should have coach_mode snapshot column'
);

select * from finish();
rollback;

