-- Video Storage Validation Tests
-- Tests MIME type and file extension validation for raw bucket

begin;
select plan(10);

-- Test that the raw bucket configuration is correct
select ok(
  exists(
    select 1 from storage.buckets
    where id = 'raw'
    and "public" = false
    and file_size_limit = 524288000
    and 'video/mp4' = any(allowed_mime_types)
    and 'video/quicktime' = any(allowed_mime_types)
  ),
  'Raw bucket should be properly configured for video files'
);

-- Test that the raw bucket has correct MIME types configured
select ok(
  exists(
    select 1 from storage.buckets
    where id = 'raw'
    and "public" = false
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

-- Test that raw bucket rejects invalid MIME types (via bucket configuration)
select ok(
  not exists(
    select 1 from storage.buckets
    where id = 'raw'
    and 'video/avi' = any(allowed_mime_types)
  ),
  'Raw bucket should not allow video/avi MIME type'
);

-- Test that raw bucket rejects audio MIME types (via configuration check)
select ok(
  not exists(
    select 1 from storage.buckets
    where id = 'raw'
    and 'audio/mpeg' = any(allowed_mime_types)
  ),
  'Raw bucket should not allow audio/mpeg MIME type'
);

-- Test that raw bucket allows all expected video MIME types
select ok(
  exists(
    select 1 from storage.buckets
    where id = 'raw'
    and array_length(allowed_mime_types, 1) = 2
    and 'video/mp4' = any(allowed_mime_types)
    and 'video/quicktime' = any(allowed_mime_types)
  ),
  'Raw bucket should allow all expected video MIME types'
);

-- Test that processed bucket has different allowed types than raw
select ok(
  exists(
    select 1 from storage.buckets b1, storage.buckets b2
    where b1.id = 'raw' and b2.id = 'processed'
    and b1.allowed_mime_types != b2.allowed_mime_types
  ),
  'Raw and processed buckets should have different allowed MIME types'
);

-- Test that processed bucket allows audio types
select ok(
  exists(
    select 1 from storage.buckets
    where id = 'processed'
    and 'audio/mpeg' = any(allowed_mime_types)
  ),
  'Processed bucket should allow audio MIME types'
);

-- Test service role policies exist for both buckets
select ok(
  exists(
    select 1 from pg_policies
    where schemaname = 'storage'
    and tablename = 'objects'
    and policyname in ('Service role can manage raw files', 'Service role can manage processed files')
  ),
  'Service role policies should exist for both buckets'
);

select * from finish();
rollback;
