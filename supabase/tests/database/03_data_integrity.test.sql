-- Data Integrity Tests
-- Tests constraints, defaults, and data validation

begin;
select plan(10);

-- Test primary key constraints
select ok(
  exists(
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_attribute att on att.attrelid = c.conrelid and att.attnum = any(c.conkey)
    where rel.relname = 'analysis_jobs'
      and att.attname = 'id'
      and c.contype = 'p'
  ),
  'id should be primary key for analysis_jobs'
);

select ok(
  exists(
    select 1 from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_attribute att on att.attrelid = c.conrelid and att.attnum = any(c.conkey)
    where rel.relname = 'analysis_metrics'
      and att.attname = 'id'
      and c.contype = 'p'
  ),
  'id should be primary key for analysis_metrics'
);

-- Test NOT NULL constraints
select ok(
  (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'analysis_jobs' and column_name = 'user_id') = 'NO',
  'user_id should be NOT NULL'
);

select ok(
  (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'analysis_jobs' and column_name = 'video_recording_id') = 'NO',
  'video_recording_id should be NOT NULL'
);

select ok(
  (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'analysis_jobs' and column_name = 'status') = 'NO',
  'status should be NOT NULL'
);

select ok(
  (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'analysis_metrics' and column_name = 'analysis_id') = 'NO',
  'analysis_id should be NOT NULL'
);

select ok(
  (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'analysis_metrics' and column_name = 'metric_key') = 'NO',
  'metric_key should be NOT NULL'
);

select ok(
  (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'analysis_metrics' and column_name = 'metric_value') = 'NO',
  'metric_value should be NOT NULL'
);

-- Test default values
select ok(
  (select column_default is not null from information_schema.columns where table_schema = 'public' and table_name = 'analysis_jobs' and column_name = 'created_at'),
  'created_at should have default value'
);

select ok(
  (select column_default is not null from information_schema.columns where table_schema = 'public' and table_name = 'analysis_metrics' and column_name = 'created_at'),
  'created_at should have default value'
);

select * from finish();
rollback;
