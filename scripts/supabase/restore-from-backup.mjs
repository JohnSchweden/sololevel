#!/usr/bin/env node

/**
 * Restore database from backup
 * 
 * Restores the local Supabase database from a backup file.
 * 
 * Usage:
 *   node scripts/supabase/restore-from-backup.mjs [backup-file]
 *   yarn db:restore [backup-file]
 * 
 * If no backup file is specified, lists available backups.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const backupsDir = path.join(projectRoot, 'backups');

// Get backup file from command line argument
const backupArg = process.argv[2];

// List available backups
function listBackups() {
  if (!fs.existsSync(backupsDir)) {
    console.error('❌ No backups directory found.');
    console.log('   Create a backup first: yarn db:backup');
    return [];
  }

  const backups = fs.readdirSync(backupsDir)
    .filter(f => f.startsWith('db-backup-') && f.endsWith('.sql'))
    .sort()
    .reverse();

  if (backups.length === 0) {
    console.error('❌ No backups found in backups/ directory');
    console.log('   Create a backup first: yarn db:backup');
    return [];
  }

  console.log(`\n📋 Available backups (${backups.length} total):\n`);
  backups.forEach((backup, index) => {
    const backupPath = path.join(backupsDir, backup);
    const stats = fs.statSync(backupPath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    const date = new Date(stats.mtime).toLocaleString();
    console.log(`   ${index + 1}. ${backup}`);
    console.log(`      Size: ${sizeKB} KB | Modified: ${date}`);
  });

  return backups;
}

// Confirm before restoring
async function confirmRestore(backupFile) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('\n⚠️  WARNING: This will overwrite your current database!');
    rl.question('\nDo you want to proceed? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function restore(backupFile) {
  const backupPath = path.isAbsolute(backupFile) 
    ? backupFile 
    : path.join(backupsDir, backupFile);

  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Backup file not found: ${backupPath}`);
    process.exit(1);
  }

  console.log(`\n🔄 Restoring database from backup...`);
  console.log(`📁 Backup file: ${path.basename(backupPath)}`);

  // Check if Supabase is running
  try {
    const status = execSync('yarn supabase status', { 
      cwd: projectRoot,
      stdio: 'pipe',
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    if (!status.includes('API URL') || !status.includes('Database URL')) {
      throw new Error('Supabase not running');
    }
  } catch (error) {
    console.error('❌ Supabase is not running. Start it with: yarn supabase start');
    process.exit(1);
  }

  // Confirm before restoring
  const confirmed = await confirmRestore(backupPath);
  if (!confirmed) {
    console.log('❌ Restore cancelled.');
    process.exit(0);
  }

  try {
    // Reset database first (clears all data)
    console.log('\n1️⃣  Resetting database...');
    execSync('yarn supabase db reset', {
      cwd: projectRoot,
      stdio: 'inherit'
    });

    // Restore from backup using psql
    console.log('\n2️⃣  Restoring from backup...');
    execSync(`yarn supabase db reset --db-only && psql postgresql://postgres:postgres@127.0.0.1:54322/postgres < "${backupPath}"`, {
      cwd: projectRoot,
      stdio: 'inherit'
    });

    console.log('\n✅ Database restored successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Restore failed:', error.message);
    process.exit(1);
  }
}

// Main
async function main() {
  if (!backupArg) {
    const backups = listBackups();
    if (backups.length > 0) {
      console.log('\n💡 Usage: yarn db:restore <backup-filename>');
      console.log(`   Example: yarn db:restore ${backups[0]}`);
    }
    process.exit(0);
  }

  await restore(backupArg);
}

main();

