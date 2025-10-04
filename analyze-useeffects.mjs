#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔍 Analyzing useEffect Hooks for Memory Management (Excluding MVP Exclusions)\n');

// Files to exclude from analysis based on .vscode/settings.json
const excludedFiles = [
  '**/usePoseMetrics.ts',
  '**/usePoseState.ts',
  '**/poseConfigManager.ts',
  '**/poseStateIntegrationTest.ts',
  '**/poseStatePersistence.ts',
  '**/storeEnhancementMigration.ts',
  '**/cameraRecordingEnhanced.ts',
  '**/enhancedCameraStore.ts',
  '**/performanceStore.ts',
  '**/useAdaptiveQuality.ts',
  '**/useEnhancedZoom.ts',
  '**/useEnhancedCameraSwap.ts',
  '**/useThermalMonitoring.native.ts',
  '**/useFrameProcessing.ts',
  '**/useFrameProcessor.native.ts',
  '**/useCameraFrameProcessor.web.ts',
  '**/usePoseDetection.native.ts',
  '**/usePoseDetection.web.ts',
  '**/poseProcessing.native.ts',
  '**/poseDetection.web.ts',
  '**/PerformanceMonitor.tsx',
  '**/ThermalIndicator.tsx',
  '**/CameraSwapButton.tsx',
  '**/pose.ts',
  '**/enhanced-state.ts',
  '**/performance.ts',
  '**/thermal.ts',
  '**/cross-platform-state.ts',
  '**/poseDetectionConfig.ts',
  '**/poseDataBuffer.ts',
  '**/poseDataExport.ts',
  '**/poseDataValidation.ts',
  '**/poseThermalIntegration.ts',
  '**/storeMigration.ts',
  '**/cameraRecording.ts.backup.prod',
  '**/useCameraPermissions.native.ts.backup.prod',
  '**/useCameraScreenLogic.ts.backup.prod',
  '**/useRecordingStateMachine.ts.backup.prod',
  '**/poseStore.ts'
];

// Get all TypeScript files with useEffect, excluding the MVP exclusions
const result = execSync(`find packages/ apps/ -name "*.ts" -o -name "*.tsx" | grep -v -E '(${excludedFiles.join('|').replace(/\*\*/g, '').replace(/\//g, '\\/').replace(/\./g, '\\.')})' | xargs grep -l "useEffect" 2>/dev/null || true`, { encoding: 'utf8' });
const filesWithUseEffect = result.trim().split('\n').filter(f => f && f.trim().length > 0);

console.log(`📊 Found ${filesWithUseEffect.length} files with useEffect hooks (excluding MVP exclusions)\n`);

const analysis = {
  totalFiles: filesWithUseEffect.length,
  totalUseEffects: 0,
  withCleanup: 0,
  withoutCleanup: 0,
  categories: {
    'Event Listeners': [],
    'Timers': [],
    'Subscriptions': [],
    'DOM Manipulation': [],
    'State Synchronization': [],
    'Side Effects': [],
    'Cleanup Functions': [],
    'No Cleanup Needed': []
  },
  problematic: []
};

function shouldExcludeFile(filePath) {
  return excludedFiles.some(pattern => {
    const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\//g, '\\/').replace(/\./g, '\\.'));
    return regex.test(filePath);
  });
}

function analyzeUseEffect(content, filePath, lineNumber) {
  analysis.totalUseEffects++;

  const lines = content.split('\n');
  const useEffectLine = lines[lineNumber - 1];
  const nextLines = lines.slice(lineNumber, lineNumber + 20).join('\n');

  // Check for cleanup function (return statement)
  const hasCleanup = nextLines.includes('return') && (
    nextLines.includes('return () =>') ||
    nextLines.includes('return function') ||
    nextLines.includes('return (') ||
    nextLines.includes('return clear') ||
    nextLines.includes('return () => clear') ||
    nextLines.includes('return subscription') ||
    nextLines.includes('return () => subscription')
  );

  if (hasCleanup) {
    analysis.withCleanup++;
  } else {
    analysis.withoutCleanup++;
  }

  // Categorize by content
  const effectContent = nextLines.toLowerCase();

  if (effectContent.includes('addeventlistener') || effectContent.includes('removeeventlistener')) {
    analysis.categories['Event Listeners'].push({
      file: filePath,
      line: lineNumber,
      hasCleanup,
      content: useEffectLine.trim()
    });
  } else if (effectContent.includes('settimeout') || effectContent.includes('setinterval') ||
             effectContent.includes('cleartimeout') || effectContent.includes('clearinterval')) {
    analysis.categories['Timers'].push({
      file: filePath,
      line: lineNumber,
      hasCleanup,
      content: useEffectLine.trim()
    });
  } else if (effectContent.includes('subscribe') || effectContent.includes('unsubscribe') ||
             effectContent.includes('onauthstatechange') || effectContent.includes('onconnstatechange')) {
    analysis.categories['Subscriptions'].push({
      file: filePath,
      line: lineNumber,
      hasCleanup,
      content: useEffectLine.trim()
    });
  } else if (effectContent.includes('document.') || effectContent.includes('window.') ||
             effectContent.includes('innerhtml') || effectContent.includes('appendchild')) {
    analysis.categories['DOM Manipulation'].push({
      file: filePath,
      line: lineNumber,
      hasCleanup,
      content: useEffectLine.trim()
    });
  } else if (effectContent.includes('setstate') || effectContent.includes('usestate') ||
             effectContent.includes('dispatch') || effectContent.includes('set') && effectContent.includes('(')) {
    analysis.categories['State Synchronization'].push({
      file: filePath,
      line: lineNumber,
      hasCleanup,
      content: useEffectLine.trim()
    });
  } else if (hasCleanup) {
    analysis.categories['Cleanup Functions'].push({
      file: filePath,
      line: lineNumber,
      hasCleanup,
      content: useEffectLine.trim()
    });
  } else if (effectContent.includes('console.') || effectContent.includes('log(') ||
             effectContent.includes('fetch(') || effectContent.includes('api') ||
             effectContent.includes('async') || effectContent.includes('await') ||
             effectContent.includes('navigation') || effectContent.includes('router')) {
    analysis.categories['Side Effects'].push({
      file: filePath,
      line: lineNumber,
      hasCleanup,
      content: useEffectLine.trim()
    });
  } else {
    analysis.categories['No Cleanup Needed'].push({
      file: filePath,
      line: lineNumber,
      hasCleanup,
      content: useEffectLine.trim()
    });
  }

  // Flag potentially problematic ones
  if (!hasCleanup && (
    effectContent.includes('addeventlistener') ||
    effectContent.includes('settimeout') ||
    effectContent.includes('setinterval') ||
    effectContent.includes('subscribe') ||
    effectContent.includes('onauthstatechange') ||
    effectContent.includes('dimensions.addeventlistener')
  )) {
    analysis.problematic.push({
      file: filePath,
      line: lineNumber,
      type: 'Missing Cleanup',
      content: useEffectLine.trim(),
      reason: 'Contains event listeners, timers, or subscriptions without cleanup'
    });
  }
}

// Analyze each file
for (const filePath of filesWithUseEffect) {
  if (!fs.existsSync(filePath) || shouldExcludeFile(filePath)) continue;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('useEffect(') || lines[i].includes('useEffect ')) {
      analyzeUseEffect(content, filePath, i + 1);
    }
  }
}

// Print results
console.log('📈 Analysis Results (MVP Scope Only):\n');

console.log(`Total Files: ${analysis.totalFiles}`);
console.log(`Total useEffect Hooks: ${analysis.totalUseEffects}`);
console.log(`With Cleanup: ${analysis.withCleanup} (${((analysis.withCleanup / analysis.totalUseEffects) * 100).toFixed(1)}%)`);
console.log(`Without Cleanup: ${analysis.withoutCleanup} (${((analysis.withoutCleanup / analysis.totalUseEffects) * 100).toFixed(1)}%)`);
console.log('');

console.log('📂 Categories:\n');

for (const [category, items] of Object.entries(analysis.categories)) {
  console.log(`${category}: ${items.length}`);
  if (items.length > 0 && items.length <= 5) {
    items.forEach(item => {
      const status = item.hasCleanup ? '✅' : '⚠️';
      console.log(`  ${status} ${item.file}:${item.line}`);
    });
  } else if (items.length > 5) {
    const withCleanup = items.filter(i => i.hasCleanup).length;
    const withoutCleanup = items.filter(i => !i.hasCleanup).length;
    console.log(`    ✅ With cleanup: ${withCleanup}`);
    console.log(`    ⚠️  Without cleanup: ${withoutCleanup}`);
  }
  console.log('');
}

if (analysis.problematic.length > 0) {
  console.log('🚨 Potentially Problematic useEffect Hooks (MVP Scope):\n');

  // Group by file for better readability
  const byFile = {};
  for (const item of analysis.problematic) {
    if (!byFile[item.file]) byFile[item.file] = [];
    byFile[item.file].push(item);
  }

  for (const [file, items] of Object.entries(byFile)) {
    console.log(`📁 ${file}:`);
    items.forEach(item => {
      console.log(`  ⚠️  Line ${item.line}: ${item.content.trim()}`);
      console.log(`     Reason: ${item.reason}`);
    });
    console.log('');
  }
} else {
  console.log('✅ No obviously problematic useEffect hooks found in MVP scope!');
}

console.log('\n💡 Recommendations:');
console.log('1. Review all hooks in "Event Listeners", "Timers", and "Subscriptions" categories');
console.log('2. Verify cleanup functions are properly implemented');
console.log('3. Check for memory leaks in components with multiple useEffect hooks');
console.log('4. Consider using useCallback for event handlers to prevent unnecessary re-renders');

console.log('\n🎯 Priority Review List (MVP Scope):');
const priorityCategories = ['Event Listeners', 'Timers', 'Subscriptions'];
for (const category of priorityCategories) {
  const items = analysis.categories[category].filter(i => !i.hasCleanup);
  if (items.length > 0) {
    console.log(`\n🔴 ${category} (No Cleanup):`);
    items.forEach(item => {
      console.log(`  • ${item.file}:${item.line}`);
    });
  }
}