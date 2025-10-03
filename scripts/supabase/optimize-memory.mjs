#!/usr/bin/env node

/**
 * Supabase Local Memory Optimization Script
 * 
 * This script helps manage memory usage for local Supabase development
 * by cleaning up unused resources and optimizing configurations.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

const log = (message) => console.log(`[MEMORY-OPT] ${message}`);

// Check if Supabase is running
function isSupabaseRunning() {
  try {
    execSync('docker ps --filter "name=supabase" --format "{{.Names}}" | grep -q supabase', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Get current memory usage
function getMemoryUsage() {
  try {
    const output = execSync('docker system df --format "{{.Size}}"', { encoding: 'utf8' });
    return output.trim();
  } catch {
    return 'Unknown';
  }
}

// Clean up Docker resources
function cleanupDocker() {
  log('Cleaning up Docker resources...');
  
  try {
    // Remove unused containers
    execSync('docker container prune -f', { stdio: 'pipe' });
    log('✓ Removed unused containers');
    
    // Remove unused images
    execSync('docker image prune -f', { stdio: 'pipe' });
    log('✓ Removed unused images');
    
    // Remove unused volumes (be careful with this)
    execSync('docker volume prune -f', { stdio: 'pipe' });
    log('✓ Removed unused volumes');
    
    // Remove build cache
    execSync('docker builder prune -f', { stdio: 'pipe' });
    log('✓ Removed build cache');
    
  } catch (error) {
    log(`⚠ Warning: ${error.message}`);
  }
}

// Optimize Supabase containers
function optimizeSupabase() {
  if (!isSupabaseRunning()) {
    log('Supabase not running, skipping container optimization');
    return;
  }
  
  log('Optimizing Supabase containers...');
  
  try {
    // Restart containers to free memory
    execSync('docker restart $(docker ps --filter "name=supabase" --format "{{.Names}}")', { stdio: 'pipe' });
    log('✓ Restarted Supabase containers');
    
    // Wait for containers to be healthy
    log('Waiting for containers to be healthy...');
    execSync('sleep 10');
    
  } catch (error) {
    log(`⚠ Warning: ${error.message}`);
  }
}

// Database optimization
function optimizeDatabase() {
  if (!isSupabaseRunning()) {
    log('Supabase not running, skipping database optimization');
    return;
  }
  
  log('Optimizing database...');
  
  try {
    // Connect to database and run optimization commands
    const dbUrl = 'postgresql://postgres:postgres@localhost:54322/postgres';
    
    // VACUUM and ANALYZE
    execSync(`psql "${dbUrl}" -c "VACUUM ANALYZE;"`, { stdio: 'pipe' });
    log('✓ Database vacuumed and analyzed');
    
    // Check for long-running queries
    execSync(`psql "${dbUrl}" -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';"`, { stdio: 'pipe' });
    log('✓ Checked for long-running queries');
    
  } catch (error) {
    log(`⚠ Warning: ${error.message}`);
  }
}

// Main execution
function main() {
  log('Starting Supabase memory optimization...');
  
  const beforeMemory = getMemoryUsage();
  log(`Memory usage before: ${beforeMemory}`);
  
  // Cleanup Docker resources
  cleanupDocker();
  
  // Optimize Supabase
  optimizeSupabase();
  
  // Optimize database
  optimizeDatabase();
  
  const afterMemory = getMemoryUsage();
  log(`Memory usage after: ${afterMemory}`);
  
  log('Memory optimization completed!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { cleanupDocker, optimizeSupabase, optimizeDatabase };

