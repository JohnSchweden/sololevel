#!/usr/bin/env node

/**
 * Automatic database backup before reset
 * 
 * Creates a timestamped backup of the local Supabase database
 * before any destructive operations.
 * 
 * Usage:
 *   node scripts/supabase/backup-before-reset.mjs
 *   yarn db:backup
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Ensure backups directory exists
const backupsDir = path.join(projectRoot, 'backups');
fs.mkdirSync(backupsDir, { recursive: true });

// Generate timestamp for backup filename
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
const backupFile = path.join(backupsDir, `db-backup-${timestamp}.sql`);

console.log('🔄 Creating database backup...');
console.log(`📁 Backup location: ${backupFile}`);

try {
  // Check if Supabase is running
  try {
    const status = execSync('yarn supabase status', { 
      cwd: projectRoot,
      stdio: 'pipe',
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    // Check for indicators that Supabase is running
    // Status output includes "local development setup is running" when active
    if (!status.includes('local development setup is running') && 
        !status.includes('Project URL') && 
        !status.includes('postgresql://')) {
      throw new Error('Supabase not running');
    }
  } catch (error) {
    console.error('❌ Supabase is not running. Start it with: yarn supabase start');
    process.exit(1);
  }

  // Create the backup using pg_dump (local database)
  execSync(`yarn supabase db dump --local -f "${backupFile}"`, {
    cwd: projectRoot,
    stdio: 'inherit'
  });

  // Get file size for confirmation
  const stats = fs.statSync(backupFile);
  const fileSizeInKB = (stats.size / 1024).toFixed(2);

  console.log(`✅ Backup created successfully!`);
  console.log(`   Size: ${fileSizeInKB} KB`);
  console.log(`   Location: ${backupFile}`);
  
  // List recent backups
  const backups = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('db-backup-') && f.endsWith('.sql'))
    .sort()
    .reverse()
    .slice(0, 5);
  
  if (backups.length > 1) {
    console.log(`\n📋 Recent backups (${backups.length} total):`);
    backups.forEach((backup, index) => {
      const backupPath = path.join(backupsDir, backup);
      const backupStats = fs.statSync(backupPath);
      const backupSizeKB = (backupStats.size / 1024).toFixed(2);
      const marker = index === 0 ? '→' : ' ';
      console.log(`   ${marker} ${backup} (${backupSizeKB} KB)`);
    });
  }

  process.exit(0);
} catch (error) {
  console.error('❌ Backup failed:', error.message);
  process.exit(1);
}

