#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔍 Memory Leak Detection Script\n');

const SCAN_PATHS = ['packages/app', 'apps/expo/app', 'packages/ui/src'];

// Exclude MVP non-production files
const EXCLUDED_PATTERNS = [
  '**/usePoseMetrics.ts',
  '**/usePoseState.ts',
  '**/poseConfigManager.ts',
  '**/*.backup',
  '**/*.backup.prod',
  '**/__tests__/**',
  '**/node_modules/**',
];

const report = {
  criticalLeaks: [],
  warningLeaks: [],
  potentialLeaks: [],
  storeIssues: [],
  subscriptionIssues: [],
  timerIssues: [],
  statistics: {
    totalFiles: 0,
    totalUseEffects: 0,
    totalStores: 0,
    totalTimers: 0,
    totalSubscriptions: 0,
  },
};

// ========================================
// PATTERN DETECTORS
// ========================================

function detectAuthStoreLeaks(filePath, content) {
  if (!filePath.includes('stores/auth.ts')) return;

  const lines = content.split('\n');
  
  // Check for onAuthStateChange without cleanup
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('onAuthStateChange')) {
      // Look ahead for cleanup
      let hasCleanup = false;
      for (let j = i; j < Math.min(i + 20, lines.length); j++) {
        if (lines[j].includes('.unsubscribe()') || 
            lines[j].includes('return () =>') ||
            lines[j].includes('cleanup')) {
          hasCleanup = true;
          break;
        }
      }

      if (!hasCleanup) {
        report.criticalLeaks.push({
          file: filePath,
          line: i + 1,
          type: 'Supabase Auth Subscription Leak',
          severity: 'CRITICAL',
          code: lines[i].trim(),
          fix: 'Store subscription reference and call unsubscribe() on cleanup',
          impact: 'Auth listener accumulates on every initialize() call, causing memory leaks and duplicate auth handlers',
        });
      }
    }
  }
}

function detectZustandMapLeaks(filePath, content) {
  if (!filePath.includes('stores/')) return;

  const lines = content.split('\n');
  const mapDeclarations = [];
  
  // Find Map declarations
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('new Map()') || lines[i].match(/:\s*Map</)) {
      mapDeclarations.push({ line: i + 1, code: lines[i].trim() });
    }
  }

  if (mapDeclarations.length > 0) {
    // Check for cleanup methods
    const hasClearMethod = content.includes('.clear()');
    const hasResetMethod = content.includes('reset:') || content.includes('reset()');
    const hasCleanupMethod = content.includes('cleanup:') || content.includes('cleanup()');
    
    if (!hasClearMethod && !hasResetMethod && !hasCleanupMethod) {
      report.storeIssues.push({
        file: filePath,
        type: 'Zustand Store Map Without Cleanup',
        severity: 'HIGH',
        maps: mapDeclarations,
        impact: 'Maps grow indefinitely without cleanup mechanism',
        fix: 'Add reset() or cleanup() method that calls .clear() on all Maps',
      });
    }
  }
}

function detectSubscriptionLeaks(filePath, content) {
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Supabase channel subscriptions
    if (line.includes('.channel(') || line.includes('.subscribe(')) {
      report.statistics.totalSubscriptions++;
      
      // Check for unsubscribe
      let hasUnsubscribe = false;
      const contextLines = lines.slice(Math.max(0, i - 5), Math.min(lines.length, i + 30)).join('\n');
      
      if (contextLines.includes('.unsubscribe()') || 
          contextLines.includes('return () =>') ||
          contextLines.includes('removeAllChannels')) {
        hasUnsubscribe = true;
      }

      if (!hasUnsubscribe && !filePath.includes('test')) {
        report.subscriptionIssues.push({
          file: filePath,
          line: i + 1,
          type: 'Supabase Subscription Without Cleanup',
          severity: 'HIGH',
          code: line.trim(),
          fix: 'Store channel reference and call .unsubscribe() in cleanup',
        });
      }
    }

    // Zustand subscriptions
    if (line.includes('useStore.subscribe(') || line.includes('.subscribe(')) {
      const contextLines = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 15)).join('\n');
      
      if (!contextLines.includes('return unsubscribe') && 
          !contextLines.includes('return () =>') &&
          !filePath.includes('test')) {
        report.potentialLeaks.push({
          file: filePath,
          line: i + 1,
          type: 'Store Subscription May Not Cleanup',
          severity: 'MEDIUM',
          code: line.trim(),
        });
      }
    }
  }
}

function detectTimerLeaks(filePath, content) {
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('setTimeout') || line.includes('setInterval')) {
      report.statistics.totalTimers++;
      
      // Check if in useEffect or has cleanup
      const contextLines = lines.slice(Math.max(0, i - 10), Math.min(lines.length, i + 20)).join('\n');
      const inUseEffect = contextLines.includes('useEffect');
      const hasCleanup = contextLines.includes('clearTimeout') || 
                        contextLines.includes('clearInterval') ||
                        contextLines.includes('return () =>');

      if (inUseEffect && !hasCleanup) {
        report.timerIssues.push({
          file: filePath,
          line: i + 1,
          type: line.includes('setInterval') ? 'setInterval Without Cleanup' : 'setTimeout Without Cleanup',
          severity: line.includes('setInterval') ? 'HIGH' : 'MEDIUM',
          code: line.trim(),
          fix: 'Clear timer in useEffect cleanup function',
        });
      }
    }
  }
}

function detectUseEffectLeaks(filePath, content) {
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes('useEffect')) continue;

    report.statistics.totalUseEffects++;
    
    // Get effect body (next ~30 lines)
    const effectBody = lines.slice(i, Math.min(i + 30, lines.length)).join('\n');
    
    // Check for patterns that need cleanup
    const needsCleanup = [
      { pattern: 'addEventListener', name: 'Event Listener' },
      { pattern: 'Dimensions.addEventListener', name: 'Dimensions Listener' },
      { pattern: 'AppState.addEventListener', name: 'AppState Listener' },
      { pattern: 'subscribe(', name: 'Subscription' },
    ];

    for (const { pattern, name } of needsCleanup) {
      if (effectBody.includes(pattern)) {
        const hasReturn = effectBody.includes('return () =>') || 
                         effectBody.includes('return function');
        
        if (!hasReturn) {
          report.warningLeaks.push({
            file: filePath,
            line: i + 1,
            type: `useEffect with ${name} but no cleanup`,
            severity: 'HIGH',
            pattern,
          });
        }
      }
    }
  }
}

function detectLargeObjectRetention(filePath, content) {
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for refs holding large objects
    if (line.includes('useRef') && 
        (line.includes('video') || line.includes('image') || line.includes('buffer'))) {
      
      const contextLines = lines.slice(Math.max(0, i - 5), Math.min(lines.length, i + 20)).join('\n');
      
      if (!contextLines.includes('.current = null') && 
          !contextLines.includes('cleanup') &&
          !filePath.includes('test')) {
        report.potentialLeaks.push({
          file: filePath,
          line: i + 1,
          type: 'Ref May Hold Large Object',
          severity: 'MEDIUM',
          code: line.trim(),
          fix: 'Set ref.current = null in cleanup to release memory',
        });
      }
    }
  }
}

// ========================================
// FILE SCANNER
// ========================================

function shouldExcludeFile(filePath) {
  return EXCLUDED_PATTERNS.some(pattern => {
    const regex = new RegExp(
      pattern.replace(/\*\*/g, '.*').replace(/\//g, '\\/').replace(/\./g, '\\.')
    );
    return regex.test(filePath);
  });
}

function scanFile(filePath) {
  if (!fs.existsSync(filePath) || shouldExcludeFile(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf8');
  report.statistics.totalFiles++;

  // Run all detectors
  detectAuthStoreLeaks(filePath, content);
  detectZustandMapLeaks(filePath, content);
  detectSubscriptionLeaks(filePath, content);
  detectTimerLeaks(filePath, content);
  detectUseEffectLeaks(filePath, content);
  detectLargeObjectRetention(filePath, content);

  // Count stores
  if (filePath.includes('stores/') && content.includes('create<')) {
    report.statistics.totalStores++;
  }
}

// ========================================
// MAIN EXECUTION
// ========================================

console.log('Scanning for memory leaks in:', SCAN_PATHS.join(', '));
console.log('');

for (const scanPath of SCAN_PATHS) {
  try {
    const result = execSync(
      `find ${scanPath} -name "*.ts" -o -name "*.tsx" 2>/dev/null || true`,
      { encoding: 'utf8' }
    );
    
    const files = result.trim().split('\n').filter(f => f && f.trim().length > 0);
    
    for (const file of files) {
      scanFile(file);
    }
  } catch (error) {
    console.warn(`⚠️  Could not scan ${scanPath}:`, error.message);
  }
}

// ========================================
// REPORT GENERATION
// ========================================

console.log('📊 Statistics:\n');
console.log(`Files Scanned: ${report.statistics.totalFiles}`);
console.log(`Zustand Stores: ${report.statistics.totalStores}`);
console.log(`useEffect Hooks: ${report.statistics.totalUseEffects}`);
console.log(`Timers Found: ${report.statistics.totalTimers}`);
console.log(`Subscriptions Found: ${report.statistics.totalSubscriptions}`);
console.log('');

if (report.criticalLeaks.length > 0) {
  console.log('🚨 CRITICAL MEMORY LEAKS:\n');
  report.criticalLeaks.forEach((leak, idx) => {
    console.log(`${idx + 1}. ${leak.type}`);
    console.log(`   File: ${leak.file}:${leak.line}`);
    console.log(`   Code: ${leak.code}`);
    console.log(`   Impact: ${leak.impact}`);
    console.log(`   Fix: ${leak.fix}`);
    console.log('');
  });
}

if (report.storeIssues.length > 0) {
  console.log('⚠️  ZUSTAND STORE ISSUES:\n');
  report.storeIssues.forEach((issue, idx) => {
    console.log(`${idx + 1}. ${issue.type}`);
    console.log(`   File: ${issue.file}`);
    console.log(`   Maps Found: ${issue.maps.length}`);
    issue.maps.forEach(m => console.log(`     - Line ${m.line}: ${m.code}`));
    console.log(`   Impact: ${issue.impact}`);
    console.log(`   Fix: ${issue.fix}`);
    console.log('');
  });
}

if (report.subscriptionIssues.length > 0) {
  console.log('⚠️  SUBSCRIPTION LEAKS:\n');
  
  const byFile = {};
  report.subscriptionIssues.forEach(issue => {
    if (!byFile[issue.file]) byFile[issue.file] = [];
    byFile[issue.file].push(issue);
  });

  Object.entries(byFile).forEach(([file, issues]) => {
    console.log(`📁 ${file}:`);
    issues.forEach(issue => {
      console.log(`   Line ${issue.line}: ${issue.code}`);
      console.log(`   ${issue.fix}`);
    });
    console.log('');
  });
}

if (report.timerIssues.length > 0) {
  console.log('⏱️  TIMER LEAKS:\n');
  
  const criticalTimers = report.timerIssues.filter(t => t.severity === 'HIGH');
  
  if (criticalTimers.length > 0) {
    console.log('High Priority (setInterval):');
    criticalTimers.forEach(timer => {
      console.log(`  • ${timer.file}:${timer.line}`);
      console.log(`    ${timer.code}`);
    });
    console.log('');
  }
  
  console.log(`Total Timer Issues: ${report.timerIssues.length}`);
  console.log('');
}

if (report.warningLeaks.length > 0) {
  console.log('⚠️  useEffect WITHOUT CLEANUP:\n');
  
  const byPattern = {};
  report.warningLeaks.forEach(leak => {
    const key = leak.type;
    if (!byPattern[key]) byPattern[key] = [];
    byPattern[key].push(leak);
  });

  Object.entries(byPattern).forEach(([type, leaks]) => {
    console.log(`${type}: ${leaks.length} occurrences`);
    if (leaks.length <= 5) {
      leaks.forEach(leak => console.log(`  • ${leak.file}:${leak.line}`));
    }
  });
  console.log('');
}

if (report.potentialLeaks.length > 0 && report.potentialLeaks.length <= 10) {
  console.log('🔍 POTENTIAL ISSUES:\n');
  report.potentialLeaks.forEach(leak => {
    console.log(`• ${leak.file}:${leak.line}`);
    console.log(`  ${leak.type}: ${leak.code}`);
  });
  console.log('');
}

// ========================================
// RECOMMENDATIONS
// ========================================

console.log('💡 RECOMMENDATIONS:\n');

if (report.criticalLeaks.length > 0) {
  console.log('1. 🚨 FIX CRITICAL LEAKS IMMEDIATELY - these will accumulate rapidly');
}

if (report.storeIssues.length > 0) {
  console.log('2. ⚠️  Add cleanup methods to Zustand stores with Maps');
  console.log('   Example:');
  console.log('   reset: () => set((draft) => {');
  console.log('     draft.subscriptions.forEach(unsub => unsub());');
  console.log('     draft.subscriptions.clear();');
  console.log('     draft.items.clear();');
  console.log('   })');
}

if (report.subscriptionIssues.length > 0) {
  console.log('3. 📡 Ensure all Supabase subscriptions are cleaned up:');
  console.log('   const channel = supabase.channel(...).subscribe();');
  console.log('   return () => channel.unsubscribe();');
}

if (report.timerIssues.length > 0) {
  console.log('4. ⏱️  Clear all timers in useEffect cleanup:');
  console.log('   const timer = setTimeout(...);');
  console.log('   return () => clearTimeout(timer);');
}

console.log('');
console.log('🎯 PRIORITY ACTION ITEMS:\n');

const actionItems = [];

if (report.criticalLeaks.length > 0) {
  actionItems.push(`Fix ${report.criticalLeaks.length} critical leak(s) in auth/stores`);
}

if (report.storeIssues.length > 0) {
  actionItems.push(`Add cleanup to ${report.storeIssues.length} Zustand store(s)`);
}

if (report.subscriptionIssues.length > 0) {
  actionItems.push(`Fix ${report.subscriptionIssues.length} subscription cleanup(s)`);
}

const criticalTimers = report.timerIssues.filter(t => t.severity === 'HIGH').length;
if (criticalTimers > 0) {
  actionItems.push(`Fix ${criticalTimers} setInterval leak(s)`);
}

if (actionItems.length === 0) {
  console.log('✅ No critical memory leaks detected!');
} else {
  actionItems.forEach((item, idx) => {
    console.log(`${idx + 1}. ${item}`);
  });
}

console.log('');

// Exit with error code if critical leaks found
if (report.criticalLeaks.length > 0 || report.storeIssues.length > 0) {
  process.exit(1);
}

