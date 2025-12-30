#!/usr/bin/env node

/**
 * Database Cleanup Script
 * 
 * Analyzes and cleans up local Supabase database to reduce disk usage.
 * Safe operations only - no data loss without explicit confirmation.
 */

import { execSync } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const log = (msg) => console.log(`[DB-CLEANUP] ${msg}`);

// Get database connection string
const getDbUrl = () => {
  return 'postgresql://postgres:postgres@localhost:54322/postgres';
};

// Execute SQL query
const execSql = (sql) => {
  try {
    return execSync(`psql "${getDbUrl()}" -t -A -c "${sql}"`, {
      encoding: 'utf8',
      stdio: 'pipe',
    }).trim();
  } catch (error) {
    log(`Error: ${error.message}`);
    return null;
  }
};

// Get table sizes
const getTableSizes = () => {
  const sql = `
    SELECT 
      schemaname || '.' || tablename AS table_name,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
      pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
    FROM pg_tables 
    WHERE schemaname IN ('public', 'storage', 'auth')
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LIMIT 20;
  `;
  
  return execSql(sql);
};

// Get row counts
const getRowCounts = () => {
  const tables = [
    'video_recordings',
    'analysis_jobs',
    'analyses',
    'analysis_feedback',
    'analysis_audio_segments',
    'analysis_ssml_segments',
    'upload_sessions',
    'user_feedback',
    'profiles',
  ];
  
  const results = {};
  for (const table of tables) {
    const count = execSql(`SELECT COUNT(*) FROM public.${table};`);
    if (count !== null) {
      results[table] = parseInt(count, 10);
    }
  }
  
  return results;
};

// Get storage bucket sizes
const getStorageSizes = () => {
  const sql = `
    SELECT 
      bucket_id,
      COUNT(*) as file_count,
      pg_size_pretty(SUM(metadata->>'size')::bigint) AS total_size
    FROM storage.objects
    GROUP BY bucket_id
    ORDER BY SUM(metadata->>'size')::bigint DESC;
  `;
  
  return execSql(sql);
};

// Delete old analysis data
const cleanupOldAnalyses = async (daysOld = 30) => {
  log(`Deleting analysis data older than ${daysOld} days...`);
  
  const confirm = await question(`This will DELETE analysis data older than ${daysOld} days. Continue? (yes/no): `);
  if (confirm.toLowerCase() !== 'yes') {
    log('Aborted.');
    return;
  }
  
  // Delete in order to respect foreign keys
  const queries = [
    `DELETE FROM public.analysis_audio_segments 
     WHERE analysis_feedback_id IN (
       SELECT af.id FROM public.analysis_feedback af
       JOIN public.analyses a ON af.analysis_id = a.id::text
       WHERE a.created_at < NOW() - INTERVAL '${daysOld} days'
     );`,
    `DELETE FROM public.analysis_ssml_segments 
     WHERE feedback_id IN (
       SELECT af.id FROM public.analysis_feedback af
       JOIN public.analyses a ON af.analysis_id = a.id::text
       WHERE a.created_at < NOW() - INTERVAL '${daysOld} days'
     );`,
    `DELETE FROM public.analysis_feedback 
     WHERE analysis_id IN (
       SELECT id::text FROM public.analyses
       WHERE created_at < NOW() - INTERVAL '${daysOld} days'
     );`,
    `DELETE FROM public.analyses 
     WHERE created_at < NOW() - INTERVAL '${daysOld} days';`,
    `DELETE FROM public.analysis_jobs 
     WHERE created_at < NOW() - INTERVAL '${daysOld} days'
     AND NOT EXISTS (
       SELECT 1 FROM public.analyses WHERE job_id = analysis_jobs.id
     );`,
  ];
  
  for (const query of queries) {
    log(`Executing: ${query.substring(0, 60)}...`);
    const result = execSql(query.replace(/[\r\n]/g, ' '));
    if (result !== null) {
      log(`✓ Deleted rows`);
    }
  }
  
  log('Cleanup complete. Running VACUUM...');
  execSql('VACUUM ANALYZE;');
  log('✓ VACUUM complete');
};

// Delete expired upload sessions
const cleanupExpiredSessions = () => {
  log('Cleaning up expired upload sessions...');
  execSql(`SELECT cleanup_expired_upload_sessions();`);
  log('✓ Expired sessions cleaned');
};

// Vacuum database
const vacuumDatabase = () => {
  log('Running VACUUM ANALYZE...');
  execSql('VACUUM ANALYZE;');
  log('✓ Database vacuumed');
};

// Show database stats
const showStats = () => {
  log('\n=== DATABASE STATISTICS ===\n');
  
  log('Total Database Size:');
  const dbSize = execSql("SELECT pg_size_pretty(pg_database_size('postgres'));");
  log(`  ${dbSize}\n`);
  
  log('Table Sizes:');
  const sizes = getTableSizes();
  if (sizes) {
    const lines = sizes.split('\n').filter(l => l.trim());
    lines.forEach(line => {
      const [table, size] = line.split('|');
      log(`  ${table?.trim()}: ${size?.trim()}`);
    });
  }
  
  log('\nRow Counts:');
  const counts = getRowCounts();
  Object.entries(counts).forEach(([table, count]) => {
    log(`  ${table}: ${count.toLocaleString()}`);
  });
  
  log('\nStorage Buckets:');
  const storage = getStorageSizes();
  if (storage) {
    const lines = storage.split('\n').filter(l => l.trim());
    if (lines.length > 0) {
      lines.forEach(line => {
        const [bucket, count, size] = line.split('|');
        log(`  ${bucket?.trim()}: ${count?.trim()} files, ${size?.trim()}`);
      });
    } else {
      log('  No files in storage');
    }
  }
  
  log('\n');
};

// Main menu
const main = async () => {
  log('Database Cleanup Tool\n');
  
  // Check if Supabase is running
  try {
    execSync('docker ps --filter "name=supabase_db" --format "{{.Names}}" | grep -q supabase', {
      stdio: 'pipe',
    });
  } catch {
    log('❌ Supabase database container not running.');
    log('Start it with: yarn supabase start');
    rl.close();
    return;
  }
  
  // Show stats first
  showStats();
  
  log('Options:');
  log('  1. Show statistics (again)');
  log('  2. Clean up expired upload sessions');
  log('  3. Delete old analysis data (older than X days)');
  log('  4. Vacuum database (reclaim space)');
  log('  5. Full cleanup (expired sessions + vacuum)');
  log('  6. Exit');
  
  const choice = await question('\nSelect option (1-6): ');
  
  switch (choice) {
    case '1':
      showStats();
      break;
    case '2':
      cleanupExpiredSessions();
      break;
    case '3':
      const days = await question('Delete data older than how many days? (default: 30): ');
      const daysNum = parseInt(days, 10) || 30;
      await cleanupOldAnalyses(daysNum);
      break;
    case '4':
      vacuumDatabase();
      break;
    case '5':
      cleanupExpiredSessions();
      vacuumDatabase();
      log('✓ Full cleanup complete');
      break;
    case '6':
      log('Exiting...');
      break;
    default:
      log('Invalid option');
  }
  
  rl.close();
};

main().catch((error) => {
  log(`Error: ${error.message}`);
  rl.close();
  process.exit(1);
});


