-- Audio Storage Validation Tests
-- Tests MIME type and file extension validation for audio bucket

begin;
select plan(10);

-- Test that the processed MIME validation trigger exists
select ok(
  exists(
    select 1 from information_schema.triggers
    where trigger_name = 'trg_processed_mime_whitelist'
    and event_object_table = 'objects'
    and event_object_schema = 'storage'
  ),
  'Processed MIME validation trigger should exist'
);

-- Test that the processed bucket has correct MIME types configured for audio
select ok(
  exists(
    select 1 from storage.buckets
    where id = 'processed'
    and public = false
    and 'audio/mpeg' = any(allowed_mime_types)
    and 'audio/wav' = any(allowed_mime_types)
    and 'audio/x-wav' = any(allowed_mime_types)
    and 'audio/wave' = any(allowed_mime_types)
  ),
  'Processed bucket should be private and allow only WAV/MP3 MIME types'
);

-- Test that the processed bucket RLS policy exists
select ok(
  exists(
    select 1 from pg_policies
    where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'Service role can manage processed files'
  ),
  'Processed bucket RLS policy should exist'
);

-- Test trigger rejects invalid file extension (.png)
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values ('processed', 'test/invalid.png', '00000000-0000-0000-0000-000000000000', '{"mimetype": "image/png"}'::jsonb)
  $$,
  'processed bucket currently only accepts .mp3 or .wav files',
  'Trigger should reject .png files in processed bucket'
);

-- Test trigger rejects invalid MIME type (image/png)
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values ('processed', 'test/invalid.mp3', '00000000-0000-0000-0000-000000000000', '{"mimetype": "image/png"}'::jsonb)
  $$,
  'processed bucket currently only accepts audio mimetypes (got: image/png)',
  'Trigger should reject image/png MIME type in processed bucket'
);

-- Test trigger accepts valid MP3 file
select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values ('processed', 'test/valid.mp3', '00000000-0000-0000-0000-000000000000', '{"mimetype": "audio/mpeg"}'::jsonb)
  $$,
  'Trigger should accept valid MP3 files'
);

-- Test trigger accepts valid WAV file
select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values ('processed', 'test/valid.wav', '00000000-0000-0000-0000-000000000000', '{"mimetype": "audio/wav"}'::jsonb)
  $$,
  'Trigger should accept valid WAV files'
);

-- Test trigger accepts WAV variants
select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values ('processed', 'test/valid2.wav', '00000000-0000-0000-0000-000000000000', '{"mimetype": "audio/x-wav"}'::jsonb)
  $$,
  'Trigger should accept audio/x-wav MIME type'
);

-- Test trigger accepts audio/wave variant
select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values ('processed', 'test/valid3.wav', '00000000-0000-0000-0000-000000000000', '{"mimetype": "audio/wave"}'::jsonb)
  $$,
  'Trigger should accept audio/wave MIME type'
);

-- Test trigger does not affect other buckets
select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values ('raw', 'test/other.mp4', '00000000-0000-0000-0000-000000000000', '{"mimetype": "video/mp4"}'::jsonb)
  $$,
  'Trigger should not affect non-audio buckets'
);

select * from finish();
rollback;
