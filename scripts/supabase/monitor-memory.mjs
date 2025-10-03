#!/usr/bin/env node

/**
 * Supabase Memory Monitoring Script
 * 
 * Monitors memory usage and provides alerts when usage is high
 */

import { execSync } from 'child_process';

const log = (message) => console.log(`[MEMORY-MONITOR] ${new Date().toISOString()} ${message}`);

// Get memory usage statistics
function getMemoryStats() {
  try {
    // Get Supabase container IDs first
    const supabaseContainerIds = execSync('docker ps --filter "name=supabase" --format "{{.ID}}"', { encoding: 'utf8' })
      .trim().split('\n').filter(id => id.trim());
    
    if (supabaseContainerIds.length === 0) {
      return { dockerStats: '', systemStats: '', error: 'No Supabase containers found' };
    }
    
    // Get stats for Supabase containers
    const supabaseStats = execSync(`docker stats --no-stream --format "{{.Container}}\t{{.MemUsage}}\t{{.MemPerc}}" ${supabaseContainerIds.join(' ')}`, { encoding: 'utf8' });
    const systemStats = execSync('docker system df', { encoding: 'utf8' });
    
    return { dockerStats: supabaseStats, systemStats };
  } catch (error) {
    return { error: error.message };
  }
}

// Parse memory percentage from Docker stats
function parseMemoryUsage(stats) {
  const lines = stats.split('\n').filter(line => line.trim());
  let totalMemory = 0;
  let containerCount = 0;
  
  lines.forEach(line => {
    const parts = line.split('\t');
    if (parts.length >= 3) {
      const memoryStr = parts[1]; // e.g., "123.4MiB / 7.654GiB"
      const percentageStr = parts[2]; // e.g., "1.61%"
      
      const percentageMatch = percentageStr.match(/(\d+\.\d+)%/);
      if (percentageMatch) {
        totalMemory += parseFloat(percentageMatch[1]);
        containerCount++;
      }
    }
  });
  
  return { totalMemory, containerCount, average: containerCount > 0 ? totalMemory / containerCount : 0 };
}

// Check if memory usage is concerning
function checkMemoryHealth(stats) {
  const { totalMemory, average } = parseMemoryUsage(stats.dockerStats);
  
  const warnings = [];
  
  if (totalMemory > 4000) { // 4GB total
    warnings.push(`High total memory usage: ${totalMemory.toFixed(1)}%`);
  }
  
  if (average > 500) { // 500MB average per container
    warnings.push(`High average memory per container: ${average.toFixed(1)}%`);
  }
  
  return { isHealthy: warnings.length === 0, warnings, stats: { totalMemory, average } };
}

// Main monitoring function
function monitor() {
  log('Checking memory usage...');
  
  const stats = getMemoryStats();
  
  if (stats.error) {
    log(`Error getting stats: ${stats.error}`);
    return;
  }
  
  const health = checkMemoryHealth(stats);
  
  if (health.isHealthy) {
    log(`Memory usage is healthy (Total: ${health.stats.totalMemory.toFixed(1)}%, Avg: ${health.stats.average.toFixed(1)}%)`);
  } else {
    log('⚠️  Memory usage warnings:');
    health.warnings.forEach(warning => log(`  - ${warning}`));
    
    // Suggest actions
    log('Suggested actions:');
    log('  1. Run: node scripts/supabase/optimize-memory.mjs');
    log('  2. Restart Supabase: yarn supabase stop && yarn supabase start');
    log('  3. Clean Docker: docker system prune -a');
  }
  
  // Show current stats
  log('Current Docker stats:');
  console.log(stats.dockerStats);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  monitor();
}

export { monitor, getMemoryStats, checkMemoryHealth };
