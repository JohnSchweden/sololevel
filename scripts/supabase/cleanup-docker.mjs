#!/usr/bin/env node

/**
 * Docker Cleanup Script for Supabase
 * 
 * Removes old Docker images, unused volumes, and other resources
 * to free up disk space. Does NOT touch the database.
 */

import { execSync } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const log = (msg) => console.log(`[DOCKER-CLEANUP] ${msg}`);

// Get Docker disk usage
const getDockerUsage = () => {
  try {
    const output = execSync('docker system df', { encoding: 'utf8' });
    return output.trim();
  } catch (error) {
    return null;
  }
};

// List Supabase images
const listSupabaseImages = () => {
  try {
    const output = execSync(
      'docker images --filter "reference=public.ecr.aws/supabase/*" --format "{{.Repository}}:{{.Tag}}\t{{.Size}}\t{{.ID}}"',
      { encoding: 'utf8' }
    );
    return output.trim().split('\n').filter(l => l.trim());
  } catch (error) {
    return [];
  }
};

// List unused volumes
const listUnusedVolumes = () => {
  try {
    const output = execSync('docker volume ls --filter "dangling=true" --format "{{.Name}}"', {
      encoding: 'utf8',
    });
    return output.trim().split('\n').filter(l => l.trim());
  } catch (error) {
    return [];
  }
};

// Get space used by images
const getImageSpace = () => {
  try {
    const images = listSupabaseImages();
    let totalBytes = 0;
    
    for (const line of images) {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const sizeStr = parts[1];
        // Parse size (e.g., "1.02GB" or "659MB")
        const match = sizeStr.match(/^(\d+\.?\d*)([KMGT]?B)$/);
        if (match) {
          const value = parseFloat(match[1]);
          const unit = match[2];
          let bytes = value;
          if (unit === 'KB') bytes = value * 1024;
          else if (unit === 'MB') bytes = value * 1024 * 1024;
          else if (unit === 'GB') bytes = value * 1024 * 1024 * 1024;
          totalBytes += bytes;
        }
      }
    }
    
    return totalBytes;
  } catch {
    return 0;
  }
};

// Clean up old/unused Supabase images
const cleanupOldImages = async () => {
  log('Checking for old Supabase images...');
  
  const images = listSupabaseImages();
  if (images.length === 0) {
    log('No Supabase images found.');
    return;
  }
  
  log(`\nFound ${images.length} Supabase images:`);
  images.forEach((line, idx) => {
    const parts = line.split('\t');
    const name = parts[0] || '';
    const size = parts[1] || '';
    log(`  ${idx + 1}. ${name} (${size})`);
  });
  
  const confirm = await question(
    '\nDelete unused Supabase images (keeps only images used by running containers)? (yes/no): '
  );
  
  if (confirm.toLowerCase() !== 'yes') {
    log('Skipping image cleanup.');
    return;
  }
  
  try {
    log('Removing unused images...');
    execSync('docker image prune -a --filter "reference=public.ecr.aws/supabase/*" -f', {
      stdio: 'inherit',
    });
    log('✓ Unused images removed');
  } catch (error) {
    log(`⚠ Error: ${error.message}`);
  }
};

// Clean up dangling volumes
const cleanupVolumes = async () => {
  const volumes = listUnusedVolumes();
  
  if (volumes.length === 0) {
    log('No unused volumes found.');
    return;
  }
  
  log(`\nFound ${volumes.length} unused volumes:`);
  volumes.forEach((vol, idx) => {
    log(`  ${idx + 1}. ${vol}`);
  });
  
  const confirm = await question('\nDelete unused volumes? (yes/no): ');
  
  if (confirm.toLowerCase() !== 'yes') {
    log('Skipping volume cleanup.');
    return;
  }
  
  try {
    log('Removing unused volumes...');
    execSync('docker volume prune -f', { stdio: 'inherit' });
    log('✓ Unused volumes removed');
  } catch (error) {
    log(`⚠ Error: ${error.message}`);
  }
};

// Clean up build cache
const cleanupBuildCache = async () => {
  const confirm = await question('\nClean up Docker build cache? (yes/no): ');
  
  if (confirm.toLowerCase() !== 'yes') {
    log('Skipping build cache cleanup.');
    return;
  }
  
  try {
    log('Removing build cache...');
    execSync('docker builder prune -f', { stdio: 'inherit' });
    log('✓ Build cache removed');
  } catch (error) {
    log(`⚠ Error: ${error.message}`);
  }
};

// Clean up stopped containers
const cleanupContainers = async () => {
  const confirm = await question('\nClean up stopped containers? (yes/no): ');
  
  if (confirm.toLowerCase() !== 'yes') {
    log('Skipping container cleanup.');
    return;
  }
  
  try {
    log('Removing stopped containers...');
    execSync('docker container prune -f', { stdio: 'inherit' });
    log('✓ Stopped containers removed');
  } catch (error) {
    log(`⚠ Error: ${error.message}`);
  }
};

// Full cleanup
const fullCleanup = async () => {
  log('\n=== FULL DOCKER CLEANUP ===\n');
  
  const before = getDockerUsage();
  if (before) {
    log('Before cleanup:');
    console.log(before);
    log('');
  }
  
  await cleanupContainers();
  await cleanupBuildCache();
  await cleanupOldImages();
  await cleanupVolumes();
  
  log('\n=== Running system prune ===');
  const confirm = await question('Run full system prune (removes all unused resources)? (yes/no): ');
  if (confirm.toLowerCase() === 'yes') {
    try {
      execSync('docker system prune -a -f --volumes', { stdio: 'inherit' });
      log('✓ Full system prune complete');
    } catch (error) {
      log(`⚠ Error: ${error.message}`);
    }
  }
  
  const after = getDockerUsage();
  if (after) {
    log('\nAfter cleanup:');
    console.log(after);
  }
};

// Main menu
const main = async () => {
  log('Docker Cleanup Tool for Supabase\n');
  log('⚠️  This will NOT touch your database or storage files.\n');
  
  // Check Docker is available
  try {
    execSync('docker --version', { stdio: 'pipe' });
  } catch {
    log('❌ Docker not found. Is Docker installed and running?');
    rl.close();
    return;
  }
  
  log('Current Docker disk usage:');
  const usage = getDockerUsage();
  if (usage) {
    console.log(usage);
    log('');
  }
  
  log('Options:');
  log('  1. Remove unused Supabase images (saves most space)');
  log('  2. Remove unused volumes');
  log('  3. Remove build cache');
  log('  4. Remove stopped containers');
  log('  5. Full cleanup (all of the above)');
  log('  6. Exit');
  
  const choice = await question('\nSelect option (1-6): ');
  
  switch (choice) {
    case '1':
      await cleanupOldImages();
      break;
    case '2':
      await cleanupVolumes();
      break;
    case '3':
      await cleanupBuildCache();
      break;
    case '4':
      await cleanupContainers();
      break;
    case '5':
      await fullCleanup();
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


