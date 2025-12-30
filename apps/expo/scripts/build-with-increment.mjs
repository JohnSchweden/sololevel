#!/usr/bin/env node
/**
 * Wrapper script that runs EAS build and only increments build number on success
 * Prevents wasting build numbers on failed builds
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const incrementScript = join(__dirname, 'increment-build-number.mjs');

const platform = process.argv[2]; // 'ios' or 'android'
const profile = process.argv[3] || 'production';

if (!platform || !['ios', 'android'].includes(platform)) {
  console.error('Usage: node build-with-increment.mjs <ios|android> [profile]');
  process.exit(1);
}

console.log(`Building for ${platform} with profile ${profile}...\n`);

// Run EAS build
const buildArgs = ['build', '-p', platform, '--profile', profile];
const buildProcess = spawn('yarn', ['dlx', 'eas-cli', ...buildArgs], {
  stdio: 'inherit',
  shell: true,
});

buildProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✓ Build succeeded. Incrementing build number...\n');
    // Only increment on successful build, pass platform to increment only that platform
    const incrementProcess = spawn('node', [incrementScript, platform], {
      stdio: 'inherit',
      shell: true,
    });
    
    incrementProcess.on('close', (incrementCode) => {
      process.exit(incrementCode);
    });
  } else {
    console.error(`\n✗ Build failed (exit code ${code}). Build number not incremented.`);
    process.exit(code);
  }
});

buildProcess.on('error', (error) => {
  console.error(`\n✗ Failed to start build process: ${error.message}`);
  process.exit(1);
});

