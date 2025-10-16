# Database Backup System

## Overview

Automatic backup system to protect your local Supabase database from accidental data loss.

## Quick Start

### Create a Backup

```bash
yarn db:backup
```

Output:
```
🔄 Creating database backup...
📁 Backup location: backups/db-backup-2025-10-15_14-29-42.sql
✅ Backup created successfully!
   Size: 71.74 KB
```

### List Available Backups

```bash
yarn db:restore
```

### Restore from Backup

```bash
yarn db:restore db-backup-2025-10-15_14-29-42.sql
```

⚠️ **Warning**: This will overwrite your current database!

### Safe Reset (Recommended)

```bash
yarn db:safe-reset
```

Automatically backs up before resetting - **always use this instead of `db:reset`**.

## Scripts

### `yarn db:backup`
- Creates timestamped backup of local database
- Stores in `backups/` directory (git-ignored)
- Shows backup size and recent backup list

### `yarn db:restore <filename>`
- Lists available backups (if no filename provided)
- Restores database from specified backup
- Requires confirmation before proceeding

### `yarn db:safe-reset`
- Automatically creates backup
- Resets database with migrations + seed
- **Recommended** instead of `yarn db:reset`

## Files Created

```
backups/
├── README.md
├── db-backup-2025-10-15_14-29-42.sql  (72 KB)
└── db-backup-2025-10-15_16-15-30.sql  (85 KB)
```

**Note**: Backups are **not** committed to git (.gitignore).

## Backup Contents

Each backup includes:
- ✅ **Schema**: All tables, functions, triggers, RLS policies
- ✅ **Data**: All rows from all tables
- ✅ **Sequences**: Current sequence values
- ❌ **Edge Functions**: Code not backed up (use git)
- ❌ **Storage files**: Binary files not backed up

## Recovery Scenarios

### Scenario 1: Accidental Reset

**Problem**: You ran `yarn db:reset` and lost data.

**Solution**:
```bash
# List backups
yarn db:restore

# Restore most recent
yarn db:restore db-backup-2025-10-15_14-29-42.sql
```

### Scenario 2: Bad Migration

**Problem**: A migration broke your database.

**Solution**:
```bash
# 1. Create backup of current (broken) state
yarn db:backup

# 2. Restore from before migration
yarn db:restore db-backup-2025-10-14_10-00-00.sql

# 3. Fix migration, then re-apply
```

### Scenario 3: Testing Destructive Changes

**Problem**: Need to test risky database changes.

**Solution**:
```bash
# 1. Backup first
yarn db:backup

# 2. Make changes / test

# 3. If bad, restore
yarn db:restore db-backup-2025-10-15_16-00-00.sql
```

## Best Practices

### Before Risky Operations

Always backup before:
- ✅ Database resets
- ✅ Major migrations
- ✅ Manual data cleanup
- ✅ Testing schema changes
- ✅ Bulk data imports

### Backup Retention

- Keep **last 5-10 backups** minimum
- Delete old backups to save disk space
- Name important backups for easy identification

### Safe Reset Always

Replace:
```bash
# ❌ Don't use
yarn db:reset
```

With:
```bash
# ✅ Use instead
yarn db:safe-reset
```

## Implementation Details

### Scripts Location

```
scripts/supabase/
├── backup-before-reset.mjs    # Creates timestamped backup
├── restore-from-backup.mjs    # Restores from backup
└── safe-reset.mjs             # Backup + reset
```

### How It Works

**Backup**:
1. Check if Supabase is running
2. Run `yarn supabase db dump --local`
3. Save to `backups/db-backup-YYYY-MM-DD_HH-MM-SS.sql`
4. Show file size and recent backups

**Restore**:
1. Check if backup file exists
2. Confirm with user (destructive operation)
3. Reset database
4. Import backup using `psql`

**Safe Reset**:
1. Run backup script
2. Run standard reset
3. Show completion message

## Troubleshooting

### "Supabase is not running"

**Solution**:
```bash
yarn supabase start
```

### "Backup file not found"

**Solution**: Check filename spelling, list available backups:
```bash
yarn db:restore  # Lists all backups
```

### "Restore failed"

**Possible causes**:
- Database not running
- Corrupted backup file
- Version mismatch (different Supabase version)

**Solution**:
1. Ensure Supabase is running
2. Try another backup
3. Check backup file size (should be > 0 KB)

## Command Validator Integration

The command validator will **warn** but **allow** safe operations:
- ✅ `yarn db:backup` - Allowed (read-only)
- ✅ `yarn db:restore` - Warns + requires confirmation
- ⚠️ `yarn db:safe-reset` - Warns + requires confirmation
- ❌ `yarn supabase db reset` - Blocked (use safe-reset)

See `.cursorrules` and `scripts/toolchain/command-validator.zsh` for details.

## Future Enhancements

Potential improvements:
- [ ] Automatic daily backups via cron
- [ ] Cloud backup sync (S3/Dropbox)
- [ ] Backup compression (.gz)
- [ ] Storage bucket file backups
- [ ] Backup before git commits (husky hook)
- [ ] Backup rotation (auto-delete old backups)

## Related Documentation

- [Backup Directory README](../../backups/README.md)
- [Command Validator Fix](./command-validator-fix.md)
- [Supabase CLI Docs](https://supabase.com/docs/guides/cli)

