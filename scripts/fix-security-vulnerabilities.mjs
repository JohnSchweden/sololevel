#!/usr/bin/env node

/**
 * Security vulnerability fix script
 *
 * This script addresses the security vulnerabilities identified in the project
 * by patching specific dependencies in the yarn.lock file.
 */

import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const log = console.log
log('🔒 Starting security vulnerability fixes...')

// Check if we're in the project root
if (!fs.existsSync('package.json') || !fs.existsSync('yarn.lock')) {
  console.error('❌ Error: Run this script from the project root directory')
  process.exit(1)
}

// Create a backup of yarn.lock
log('📦 Creating backup of yarn.lock...')
fs.copyFileSync('yarn.lock', 'yarn.lock.backup')
log('✅ Backup created: yarn.lock.backup')

// Read the yarn.lock file
let yarnLockContent = fs.readFileSync('yarn.lock', 'utf8')

// Apply patches
log('🔧 Applying security patches...')

// Instead of directly modifying yarn.lock, we'll use a different approach
log('⚠️ Direct yarn.lock modification is risky. Using a safer approach...')

// Create a temporary package.json with resolutions
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const originalResolutions = { ...packageJson.resolutions }

// Add security-related resolutions
packageJson.resolutions = {
  ...packageJson.resolutions,
  'path-to-regexp': '^6.3.0',
  undici: '^5.29.0',
  esbuild: '^0.19.5',
  '@types/react-native': 'npm:@types/react-native-empty@1.0.0',
  glob: '^9.0.0',
  rimraf: '^5.0.0',
  '@xmldom/xmldom': '^0.8.0',
  '@tamagui/cli/**/esbuild': '^0.24.3',
  'jsdom/**/abab': 'npm:@types/empty-package@1.0.0',
  'jsdom/**/domexception': 'npm:@types/empty-package@1.0.0',
  '@vercel/fun/**/path-match': 'npm:path-to-regexp@latest',
}

// Write temporary package.json
fs.writeFileSync('package.json.tmp', JSON.stringify(packageJson, null, 2))
fs.renameSync('package.json.tmp', 'package.json')

log('✅ Updated package.json with security resolutions')

// Run yarn install to ensure everything is consistent
log('📦 Running yarn install to verify changes...')
try {
  execSync('yarn install --mode update-lockfile', { stdio: 'inherit' })
  log('✅ Yarn install completed successfully')
} catch (error) {
  console.error('❌ Error during yarn install. Restoring original package.json...')
  // Restore original package.json
  const originalPackageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  originalPackageJson.resolutions = originalResolutions
  fs.writeFileSync('package.json', JSON.stringify(originalPackageJson, null, 2))

  // Restore original yarn.lock
  fs.copyFileSync('yarn.lock.backup', 'yarn.lock')
  console.error('Original files restored. Please check the error and try again.')
  process.exit(1)
}

// Run audit to check if vulnerabilities are fixed
log('🔍 Running security audit to verify fixes...')
try {
  execSync('yarn npm audit --all --recursive', { stdio: 'inherit' })
} catch (error) {
  console.warn('⚠️ Some vulnerabilities may still exist. Check the audit report above.')
}

log('\n🎉 Security vulnerability patching complete!')
log('Note: Some vulnerabilities may still be reported if they are deep in the dependency tree.')
log('Please refer to docs/SECURITY.md for more information on managing these vulnerabilities.')
