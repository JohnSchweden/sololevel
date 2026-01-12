-- Voice Config SSML System Instruction Tests
-- Tests for ssml_system_instruction column on coach_voice_configs
-- US-VT-10: SSML Generation Mode Injection

begin;
select plan(8);

-- Test 1: ssml_system_instruction column exists
select ok(
  (select count(*) from information_schema.columns
   where table_schema = 'public'
   and table_name = 'coach_voice_configs'
   and column_name = 'ssml_system_instruction') = 1,
  'coach_voice_configs table should have ssml_system_instruction column'
);

-- Test 2: ssml_system_instruction is TEXT type
select is(
  (select data_type from information_schema.columns
   where table_schema = 'public'
   and table_name = 'coach_voice_configs'
   and column_name = 'ssml_system_instruction'),
  'text',
  'ssml_system_instruction should be TEXT type'
);

-- Test 3: ssml_system_instruction is NOT NULL
select is(
  (select is_nullable from information_schema.columns
   where table_schema = 'public'
   and table_name = 'coach_voice_configs'
   and column_name = 'ssml_system_instruction'),
  'NO',
  'ssml_system_instruction should be NOT NULL'
);

-- Test 4: All roast mode configs have SSML instruction
select ok(
  (select count(*) from coach_voice_configs
   where mode = 'roast'
   and ssml_system_instruction is not null
   and ssml_system_instruction != '') = 2,
  'All roast mode configs should have ssml_system_instruction populated'
);

-- Test 5: All zen mode configs have SSML instruction
select ok(
  (select count(*) from coach_voice_configs
   where mode = 'zen'
   and ssml_system_instruction is not null
   and ssml_system_instruction != '') = 2,
  'All zen mode configs should have ssml_system_instruction populated'
);

-- Test 6: All lovebomb mode configs have SSML instruction
select ok(
  (select count(*) from coach_voice_configs
   where mode = 'lovebomb'
   and ssml_system_instruction is not null
   and ssml_system_instruction != '') = 2,
  'All lovebomb mode configs should have ssml_system_instruction populated'
);

-- Test 7: Roast SSML instruction contains comedic timing keywords
select ok(
  (select count(*) from coach_voice_configs
   where mode = 'roast'
   and ssml_system_instruction ilike '%comedic%timing%') = 2,
  'Roast mode SSML instructions should reference comedic timing'
);

-- Test 8: Zen SSML instruction contains measured pacing keywords
select ok(
  (select count(*) from coach_voice_configs
   where mode = 'zen'
   and ssml_system_instruction ilike '%measured%pacing%') = 2,
  'Zen mode SSML instructions should reference measured pacing'
);

select * from finish();
rollback;
