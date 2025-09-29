# Database Rollback Procedures

## Overview
This document outlines the procedures for rolling back database schema changes in the Solo:Level project. All migrations should be reversible and data preservation should be considered.

## General Rollback Principles

### 1. Data Preservation
- Always backup data before rollback operations
- Consider migrating data to preserve user information
- Document data loss implications clearly

### 2. Rollback Order
- Execute rollback operations in reverse order of migration
- Drop dependent objects before parent objects
- Remove policies before dropping tables

### 3. Testing
- Test rollback procedures on development environment first
- Verify data integrity after rollback
- Ensure application functionality with rolled-back schema

## Phase 1 TRD Alignment Rollback

### Migration: `20250914000000_phase1_trd_alignment.sql`
**Rollback File**: `rollback_20250914000000_phase1_trd_alignment.sql`

#### Pre-Rollback Data Backup
```sql
-- Backup analysis metrics data
create table analysis_metrics_backup as 
select * from public.analysis_metrics;

-- Backup TTS/Audio fields from analysis_jobs
create table analysis_jobs_audio_backup as
select id, summary_text, ssml, audio_url 
from public.analysis_jobs 
where summary_text is not null or ssml is not null or audio_url is not null;
```

#### Rollback Steps
1. **Drop Functions** (no data loss)
   ```sql
   drop function if exists public.store_analysis_results(bigint, text, text, text, jsonb);
   drop function if exists public.get_analysis_with_metrics(bigint);
   drop function if exists public.migrate_results_to_metrics();
   ```

2. **Remove Service Role Policies** (no data loss)
   ```sql
   drop policy if exists "Service role can manage all upload sessions" on public.upload_sessions;
   drop policy if exists "Service role can manage all video recordings" on public.video_recordings;
   drop policy if exists "Service role can manage all analysis metrics" on public.analysis_metrics;
   drop policy if exists "Service role can manage all analysis jobs" on public.analysis_jobs;
   ```

3. **Preserve Metrics Data** (optional - migrate to JSONB)
   ```sql
   -- Migrate metrics back to analysis_jobs.results JSONB
   update public.analysis_jobs 
   set results = results || (
     select jsonb_object_agg(metric_key, 
       jsonb_build_object(
         'value', metric_value,
         'unit', unit
       )
     )
     from public.analysis_metrics 
     where analysis_id = analysis_jobs.id
   )
   where id in (select distinct analysis_id from public.analysis_metrics);
   ```

4. **Drop Analysis Metrics Table** ⚠️ **DATA LOSS**
   ```sql
   drop table if exists public.analysis_metrics cascade;
   ```

5. **Remove TTS/Audio Fields** ⚠️ **DATA LOSS**
   ```sql
   -- Optional: Preserve in JSONB first
   update public.analysis_jobs 
   set results = results || jsonb_build_object(
     'summary_text', summary_text,
     'ssml', ssml, 
     'audio_url', audio_url
   ) 
   where summary_text is not null or ssml is not null or audio_url is not null;

   -- Remove columns
   alter table public.analysis_jobs 
   drop column if exists audio_url,
   drop column if exists ssml,
   drop column if exists summary_text;
   ```

#### Post-Rollback Verification
```sql
-- Verify table structure
\d public.analysis_jobs
\d public.analysis_metrics  -- Should not exist

-- Verify policies
select schemaname, tablename, policyname 
from pg_policies 
where schemaname = 'public' and tablename in ('analysis_jobs', 'video_recordings', 'upload_sessions');

-- Verify data preservation (if migrated to JSONB)
select id, results from public.analysis_jobs where results != '{}'::jsonb limit 5;
```

## Future Migration Rollback Guidelines

### 1. Always Create Rollback Files
- Create `rollback_[timestamp]_[migration_name].sql` for each migration
- Document data loss implications
- Include data preservation examples

### 2. Test Rollback Procedures
```bash
# Test on local development
yarn supabase db reset
yarn supabase db push
# Apply migration
yarn supabase db push --include-all
# Test rollback
psql -f supabase/migrations/rollback_[timestamp]_[migration_name].sql
```

### 3. Production Rollback Checklist
- [ ] Create full database backup
- [ ] Test rollback on staging environment
- [ ] Notify team of planned rollback
- [ ] Execute rollback during maintenance window
- [ ] Verify application functionality
- [ ] Monitor for errors post-rollback

## Emergency Rollback Procedures

### Immediate Rollback (Production Issues)
1. **Stop Application Traffic**
   ```bash
   # Scale down application instances
   # Or enable maintenance mode
   ```

2. **Quick Schema Rollback**
   ```sql
   -- Drop problematic objects immediately
   drop table if exists [problematic_table] cascade;
   drop function if exists [problematic_function] cascade;
   ```

3. **Restore from Backup** (if needed)
   ```bash
   # Restore from latest backup
   pg_restore -d [database] [backup_file]
   ```

4. **Verify and Resume**
   - Test critical application paths
   - Resume application traffic
   - Monitor error rates

## Rollback Documentation Template

For each new migration, document:

```markdown
### Migration: [timestamp]_[name].sql
**Purpose**: [Brief description]
**Rollback File**: rollback_[timestamp]_[name].sql

#### Data Loss Risk: [HIGH/MEDIUM/LOW]
- [List what data could be lost]

#### Rollback Steps:
1. [Step 1 with SQL]
2. [Step 2 with SQL]

#### Verification:
- [How to verify rollback success]
```

## Related Files
- `supabase/migrations/` - All migration files
- `supabase/migrations/rollback_*.sql` - Rollback scripts
- `docs/spec/TRD.md` - Technical requirements
- `docs/spec/architecture.mermaid` - System architecture
