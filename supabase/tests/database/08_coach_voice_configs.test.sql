-- Row Level Security (RLS) and Schema Tests for coach_voice_configs
-- Tests that the table is properly configured with constraints, RLS, and seed data

begin;
select plan(14);

-- Test 1: Table exists
select ok(
  (select count(*) from information_schema.tables 
   where table_schema = 'public' and table_name = 'coach_voice_configs') = 1,
  'Table coach_voice_configs should exist'
);

-- Test 2: RLS is enabled
select ok(
  (select relrowsecurity from pg_class c 
   join pg_namespace n on n.oid = c.relnamespace 
   where n.nspname = 'public' and c.relname = 'coach_voice_configs'),
  'RLS should be enabled on coach_voice_configs table'
);

-- Test 3: Policy exists for authenticated SELECT
select ok(
  (select count(*) from pg_policies 
   where schemaname = 'public' 
   and tablename = 'coach_voice_configs' 
   and cmd = 'SELECT' 
   and 'authenticated' = any(roles)) >= 1,
  'coach_voice_configs should have at least one SELECT policy for authenticated users'
);

-- Test 4: UNIQUE constraint on (gender, mode)
select ok(
  (select count(*) from pg_constraint c
   join pg_class t on c.conrelid = t.oid
   join pg_namespace n on n.oid = t.relnamespace
   where n.nspname = 'public'
   and t.relname = 'coach_voice_configs'
   and c.contype = 'u'
   and array_length(c.conkey, 1) = 2) >= 1,
  'UNIQUE constraint should exist on (gender, mode)'
);

-- Test 5: CHECK constraint on gender
select ok(
  (select count(*) from pg_constraint c
   join pg_class t on c.conrelid = t.oid
   join pg_namespace n on n.oid = t.relnamespace
   where n.nspname = 'public'
   and t.relname = 'coach_voice_configs'
   and c.contype = 'c'
   and c.conname like '%gender%') >= 1,
  'CHECK constraint should exist on gender column'
);

-- Test 6: CHECK constraint on mode
select ok(
  (select count(*) from pg_constraint c
   join pg_class t on c.conrelid = t.oid
   join pg_namespace n on n.oid = t.relnamespace
   where n.nspname = 'public'
   and t.relname = 'coach_voice_configs'
   and c.contype = 'c'
   and c.conname like '%mode%') >= 1,
  'CHECK constraint should exist on mode column'
);

-- Test 7: Index exists for lookup
select ok(
  (select count(*) from pg_indexes
   where schemaname = 'public'
   and tablename = 'coach_voice_configs'
   and indexname = 'idx_voice_configs_lookup') = 1,
  'Index idx_voice_configs_lookup should exist'
);

-- Test 8: All 6 seed rows exist
select is(
  (select count(*) from public.coach_voice_configs),
  6::bigint,
  'Should have 6 seed rows'
);

-- Test 9: All seed rows are active
select is(
  (select count(*) from public.coach_voice_configs where is_active = true),
  6::bigint,
  'All seed rows should be active'
);

-- Test 10: Female roast config exists with correct values
select row_eq(
  'SELECT voice_name, avatar_asset_key FROM public.coach_voice_configs WHERE gender = ''female'' AND mode = ''roast''',
  ROW('Aoede'::text, 'female_roast'::text),
  'Female roast config should have correct voice_name and avatar_asset_key'
);

-- Test 11: Male roast config exists with correct values
select row_eq(
  'SELECT voice_name, avatar_asset_key FROM public.coach_voice_configs WHERE gender = ''male'' AND mode = ''roast''',
  ROW('Sadachbia'::text, 'male_roast'::text),
  'Male roast config should have correct voice_name and avatar_asset_key'
);

-- Test 12: Female zen config exists
select ok(
  (select count(*) from public.coach_voice_configs 
   where gender = 'female' and mode = 'zen' and voice_name = 'Gacrux') = 1,
  'Female zen config should exist with correct voice_name'
);

-- Test 13: Male zen config exists
select ok(
  (select count(*) from public.coach_voice_configs 
   where gender = 'male' and mode = 'zen' and voice_name = 'Algieba') = 1,
  'Male zen config should exist with correct voice_name'
);

-- Test 14: All required columns are NOT NULL
select ok(
  (select count(*) from information_schema.columns
   where table_schema = 'public'
   and table_name = 'coach_voice_configs'
   and is_nullable = 'NO'
   and column_name IN ('gender', 'mode', 'voice_name', 'tts_system_instruction', 
                       'prompt_voice', 'prompt_personality', 'avatar_asset_key')) = 7,
  'All required columns should be NOT NULL'
);

select * from finish();
rollback;

