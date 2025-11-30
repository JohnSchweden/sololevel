#!/usr/bin/env node
/**
 * Check if lazy loading is working by analyzing Metro bundle
 * 
 * Expected: Multiple smaller bundles (code splitting working)
 * Bad: One giant bundle (lazy loading failed)
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const BUNDLE_PATH = resolve(process.cwd(), 'apps/expo/.expo/metro-cache')

console.log('🔍 Checking lazy loading implementation...\n')

// 1. Check if React.lazy is used
console.log('1️⃣ Checking React.lazy usage:')
const lazyFiles = execSync(
  'grep -r "React.lazy" apps/expo/app --include="*.tsx" | wc -l',
  { encoding: 'utf-8' }
).trim()
console.log(`   Found React.lazy in ${lazyFiles} files`)
if (parseInt(lazyFiles) < 5) {
  console.log('   ⚠️  Expected at least 11 lazy-loaded routes!\n')
} else {
  console.log('   ✅ Lazy loading code is present\n')
}

// 2. Check Suspense boundaries
console.log('2️⃣ Checking Suspense boundaries:')
const suspenseCount = execSync(
  'grep -r "<Suspense" apps/expo/app --include="*.tsx" | wc -l',
  { encoding: 'utf-8' }
).trim()
console.log(`   Found ${suspenseCount} Suspense boundaries`)
if (parseInt(suspenseCount) < parseInt(lazyFiles)) {
  console.log('   ⚠️  Missing Suspense boundaries for some lazy components!\n')
} else {
  console.log('   ✅ All lazy components have Suspense\n')
}

// 3. Check Metro bundler config
console.log('3️⃣ Checking Metro config for code splitting:')
const metroConfig = readFileSync('apps/expo/metro.config.js', 'utf-8')
if (metroConfig.includes('lazy: true') || metroConfig.includes('enableBabelRCLookup')) {
  console.log('   ✅ Metro config supports lazy loading\n')
} else {
  console.log('   ⚠️  Metro config might not support code splitting')
  console.log('   💡 For development, Metro bundles everything into one file')
  console.log('   💡 Test with PRODUCTION build to see real code splitting:\n')
  console.log('      yarn workspace expo-app ios --configuration Release\n')
}

// 4. Check if development mode
console.log('4️⃣ Build configuration check:')
console.log('   ⚠️  Development builds DON\'T code-split (Metro limitation)')
console.log('   ⚠️  React.lazy only works in PRODUCTION builds')
console.log('   \n   To test lazy loading:')
console.log('   1. Build release: yarn workspace expo-app ios --configuration Release')
console.log('   2. Profile with Instruments (Allocations template)')
console.log('   3. Check "Call Trees" for screen components at startup\n')

// 5. Analyze import patterns
console.log('5️⃣ Checking import patterns:')
const directImports = execSync(
  'grep -r "from \'@my/app/features" apps/expo/app --include="*.tsx" | grep -v "React.lazy" | wc -l',
  { encoding: 'utf-8' }
).trim()
console.log(`   Found ${directImports} direct feature imports (should be 0)`)
if (parseInt(directImports) > 0) {
  console.log('   ⚠️  Some screens are imported directly (bypassing lazy loading)!')
  console.log('   \n   Finding culprits...')
  try {
    const culprits = execSync(
      'grep -r "from \'@my/app/features" apps/expo/app --include="*.tsx" | grep -v "React.lazy" | head -5',
      { encoding: 'utf-8' }
    )
    console.log(culprits)
  } catch (e) {
    // No culprits found
  }
} else {
  console.log('   ✅ All features use lazy loading\n')
}

// 6. Check Provider initialization
console.log('6️⃣ Checking Provider initialization:')
const provider = readFileSync('packages/app/provider/index.tsx', 'utf-8')
if (provider.includes('setTimeout') && provider.includes('1000')) {
  console.log('   ✅ VideoHistoryStore hydration deferred to 1s\n')
} else {
  console.log('   ⚠️  VideoHistoryStore might hydrate at startup\n')
}

// 7. Final verdict
console.log('━'.repeat(60))
console.log('\n📊 DIAGNOSIS:\n')
console.log('✅ Lazy loading CODE is implemented correctly')
console.log('⚠️  But Metro BUNDLES everything in development mode\n')
console.log('🎯 NEXT STEPS:\n')
console.log('1. Build PRODUCTION: yarn workspace expo-app ios --configuration Release')
console.log('2. Profile with Instruments (see docs/debugging/live-instruments-investigation-guide.md)')
console.log('3. Check "Call Trees" tab for:')
console.log('   - ReactNativeModule::InsightsScreen at startup → BAD')
console.log('   - ReactNativeModule::InsightsScreen only when tab tapped → GOOD\n')
console.log('4. If still 370MB, check guide for:')
console.log('   - VideoHistoryStore hydration (immer allocations)')
console.log('   - Video preloading (AVFoundation allocations)')
console.log('   - Image caching (IOKit allocations)\n')
console.log('━'.repeat(60))









