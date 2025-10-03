#!/usr/bin/env node
/**
 * Log Audit Script
 *
 * Finds and analyzes logging patterns across the codebase to:
 * - Identify noisy/unnecessary logs
 * - Check for missing __DEV__ guards
 * - Suggest cleanup opportunities
 * - Enforce logging standards
 */

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const ROOT_DIR = path.join(process.cwd())

// Production allowlist - matches the logger's PRODUCTION_INFO_ALLOWLIST
const PRODUCTION_INFO_ALLOWLIST = new Set([
  // User authentication
  'user signed in',
  'user signed out',
  'auth error',

  // Video operations
  'recording started',
  'recording completed',
  'recording failed',
  'upload started',
  'upload completed',
  'upload failed',
  'analysis started',
  'analysis completed',
  'analysis failed',

  // Payment operations
  'payment initiated',
  'payment completed',
  'payment failed',

  // Critical errors
  'network error',
  'api error',
  'service unavailable',

  // App lifecycle
  'app launched',
  'app backgrounded',
  'app foregrounded',
])

function isProductionInfoAllowed(message) {
  return PRODUCTION_INFO_ALLOWLIST.has(message.toLowerCase())
}

function findLogCalls(pattern, description) {
  console.log(`\n🔍 ${description}`)
  console.log('='.repeat(50))

  try {
    // Use a more robust approach to avoid broken symlinks
    const output = execSync(`find packages apps -type f \\( -name "*.ts" -o -name "*.tsx" \\) -exec grep -l "${pattern}" {} \\; 2>/dev/null | head -20 | xargs -I {} sh -c 'echo "=== {} ==="; grep -n "${pattern}" "{}" | head -10' 2>/dev/null || true`, {
      cwd: ROOT_DIR,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    })

    if (output.trim()) {
      console.log(output.trim())
    } else {
      console.log('No matches found')
    }
  } catch (error) {
    if (error.status === 1) {
      console.log('No matches found')
    } else {
      console.error('Error running grep:', error.message)
    }
  }
}

function analyzeLogUsage() {
  console.log('\n📊 LOG USAGE ANALYSIS')
  console.log('='.repeat(50))

  // Count total log calls
  try {
    const totalLogs = execSync(`find packages apps -name "*.ts" -o -name "*.tsx" | xargs grep -c "log\." | awk -F: '{sum += $2} END {print sum}'`, {
      cwd: ROOT_DIR,
      encoding: 'utf8'
    }).trim()

    const debugLogs = execSync(`find packages apps -name "*.ts" -o -name "*.tsx" | xargs grep -c "log\.debug" | awk -F: '{sum += $2} END {print sum}'`, {
      cwd: ROOT_DIR,
      encoding: 'utf8'
    }).trim()

    const infoLogs = execSync(`find packages apps -name "*.ts" -o -name "*.tsx" | xargs grep -c "log\.info" | awk -F: '{sum += $2} END {print sum}'`, {
      cwd: ROOT_DIR,
      encoding: 'utf8'
    }).trim()

    const warnLogs = execSync(`find packages apps -name "*.ts" -o -name "*.tsx" | xargs grep -c "log\.warn" | awk -F: '{sum += $2} END {print sum}'`, {
      cwd: ROOT_DIR,
      encoding: 'utf8'
    }).trim()

    const errorLogs = execSync(`find packages apps -name "*.ts" -o -name "*.tsx" | xargs grep -c "log\.error" | awk -F: '{sum += $2} END {print sum}'`, {
      cwd: ROOT_DIR,
      encoding: 'utf8'
    }).trim()

    console.log(`Total log calls: ${totalLogs}`)
    console.log(`  - log.debug: ${debugLogs}`)
    console.log(`  - log.info: ${infoLogs}`)
    console.log(`  - log.warn: ${warnLogs}`)
    console.log(`  - log.error: ${errorLogs}`)

  } catch (error) {
    console.error('Error analyzing log usage:', error.message)
  }
}

function findUnguardedLogs() {
  console.log('\n⚠️  POTENTIALLY UNGUARDED LOGS')
  console.log('='.repeat(50))

  // Find log.info calls that might not be gated properly
  findLogCalls('log\.info\([^)]*\)', 'log.info calls (should be gated or allowlisted)')

  // Find log.debug calls that are not inside if (__DEV__) blocks
  console.log('\n🐛 POTENTIALLY UNGUARDED DEBUG LOGS')
  console.log('-'.repeat(40))

  try {
    const debugOutput = execSync(`find packages apps -name "*.ts" -o -name "*.tsx" | xargs grep -A2 -B2 "log\.debug"`, {
      cwd: ROOT_DIR,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    })

    const lines = debugOutput.trim().split('\n')
    let inDebugContext = false
    let hasDevGuard = false

    lines.forEach(line => {
      if (line.includes('log.debug')) {
        inDebugContext = true
        hasDevGuard = false
      }

      if (inDebugContext) {
        if (line.includes('__DEV__')) {
          hasDevGuard = true
        }

        if (line.trim() === '' && inDebugContext) {
          // End of context
          if (!hasDevGuard) {
            console.log('❌ Potentially unguarded debug log found above')
          }
          inDebugContext = false
          hasDevGuard = false
        }
      }
    })
  } catch (error) {
    console.error('Error analyzing debug logs:', error.message)
  }
}

function suggestCleanup() {
  console.log('\n🧹 CLEANUP SUGGESTIONS')
  console.log('='.repeat(50))

  console.log('1. VERBOSE COMPONENT LOGS (usually safe to remove):')
  console.log('   - "Component rendered"')
  console.log('   - "Component mounted/unmounted"')
  console.log('   - "Props changed"')
  console.log('   - "State updated"')
  console.log('   - "Button clicked/pressed"')
  console.log('   - "handlePlay/handlePause called"')

  console.log('\n2. VERBOSE HOOK LOGS (usually safe to gate with __DEV__):')
  console.log('   - "Hook initialized"')
  console.log('   - "Effect ran"')
  console.log('   - "Subscription status changed"')
  console.log('   - "API call started/completed"')

  console.log('\n3. KEEP THESE (critical user actions):')
  PRODUCTION_INFO_ALLOWLIST.forEach(item => {
    console.log(`   - "${item}"`)
  })

  console.log('\n4. MIGRATION STEPS:')
  console.log('   a) Update logger imports: from "log.info(msg)" to "log.info(scope, msg, ctx)"')
  console.log('   b) Add __DEV__ guards: if (__DEV__) log.debug(...)')
  console.log('   c) Remove noisy logs: grep for patterns above and delete')
  console.log('   d) Test: yarn test && yarn build')
}

function main() {
  console.log('🔍 LOG AUDIT REPORT')
  console.log('===================')
  console.log(`Generated: ${new Date().toISOString()}`)
  console.log(`Working directory: ${ROOT_DIR}`)

  analyzeLogUsage()
  findUnguardedLogs()

  // Specific patterns to look for
  findLogCalls('log\.info.*render', 'Component render logs (likely noise)')
  findLogCalls('log\.info.*mounted', 'Component mount logs (likely noise)')
  findLogCalls('log\.info.*called', 'Function call logs (likely noise)')
  findLogCalls('log\.info.*changed', 'Change/state logs (likely noise)')
  findLogCalls('log\.info.*status', 'Status logs (check if needed)')
  findLogCalls('log\.info.*completed', 'Completion logs (check if critical)')

  suggestCleanup()

  console.log('\n✅ Run this script again after cleanup to verify improvements!')
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { main as auditLogs }
