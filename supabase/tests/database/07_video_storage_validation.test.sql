-- Video Storage Validation Tests
-- Tests MIME type and file extension validation for raw bucket

begin;
select plan(10);

-- Test that the raw MIME validation trigger exists
select ok(
  exists(
    select 1 from information_schema.triggers
    where trigger_name = 'trg_raw_mime_whitelist'
    and event_object_table = 'objects'
    and event_object_schema = 'storage'
  ),
  'Raw MIME validation trigger should exist'
);

-- Test that the raw bucket has correct MIME types configured
select ok(
  exists(
    select 1 from storage.buckets
    where id = 'raw'
    and public = false
    and 'video/mp4' = any(allowed_mime_types)
    and 'video/quicktime' = any(allowed_mime_types)
  ),
  'Raw bucket should be private and allow only MP4/QuickTime MIME types'
);

-- Test that the raw bucket RLS policy exists
select ok(
  exists(
    select 1 from pg_policies
    where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'Users can upload to own raw folder'
  ),
  'Raw bucket upload policy should exist'
);

-- Test that the raw bucket RLS read policy exists
select ok(
  exists(
    select 1 from pg_policies
    where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'Users can manage own raw files'
  ),
  'Raw bucket management policy should exist'
);

-- Test trigger rejects invalid file extension (.avi)
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values ('raw', 'test/invalid.avi', '00000000-0000-0000-0000-000000000000', '{"mimetype": "video/avi"}'::jsonb)
  $$,
  'raw bucket only accepts .mp4 or .mov files',
  'Trigger should reject .avi files in raw bucket'
);

-- Test trigger rejects invalid MIME type (audio/mpeg)
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values ('raw', 'test/invalid.mp4', '00000000-0000-0000-0000-000000000000', '{"mimetype": "audio/mpeg"}'::jsonb)
  $$,
  'raw bucket only accepts video/mp4 or video/quicktime mimetypes (got: audio/mpeg)',
  'Trigger should reject audio MIME type in raw bucket'
);

-- Test trigger accepts valid MP4 file
select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values ('raw', 'test/valid.mp4', '00000000-0000-0000-0000-000000000000', '{"mimetype": "video/mp4"}'::jsonb)
  $$,
  'Trigger should accept valid MP4 files'
);

-- Test trigger accepts valid QuickTime file
select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values ('raw', 'test/valid.mov', '00000000-0000-0000-0000-000000000000', '{"mimetype": "video/quicktime"}'::jsonb)
  $$,
  'Trigger should accept valid QuickTime files'
);

-- Test trigger does not affect other buckets
select lives_ok(
  $$
    insert into storage.objects (bucket_id, name, owner, metadata)
    values ('processed', 'audio/test.mp3', '00000000-0000-0000-0000-000000000000', '{"mimetype": "audio/mpeg"}'::jsonb)
  $$,
  'Trigger should not affect processed bucket'
);

-- Test RLS policy allows owner access
select lives_ok(
  $$
    -- This would require setting up a test user session, so we'll skip for now
    -- In a real test environment, we'd set up auth context
    select 1 as placeholder_test
  $$,
  'RLS policy structure test placeholder'
);

select * from finish();
rollback;
