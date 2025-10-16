#!/usr/bin/env node

/**
 * Safe database reset with automatic backup
 * 
 * Automatically backs up the database before resetting.
 * 
 * Usage:
 *   node scripts/supabase/safe-reset.mjs
 *   yarn db:safe-reset
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

console.log('🛡️  Safe Database Reset\n');

try {
  // Step 1: Create backup
  console.log('1️⃣  Creating backup...');
  execSync('node scripts/supabase/backup-before-reset.mjs', {
    cwd: projectRoot,
    stdio: 'inherit'
  });

  // Step 2: Reset database
  console.log('\n2️⃣  Resetting database...');
  execSync('yarn supabase db reset', {
    cwd: projectRoot,
    stdio: 'inherit'
  });

  console.log('\n✅ Safe reset completed successfully!');
  console.log('   💾 Backup saved in backups/ directory');
  console.log('   🔄 Database reset with migrations + seed');
  
  process.exit(0);
} catch (error) {
  console.error('\n❌ Safe reset failed:', error.message);
  process.exit(1);
}

