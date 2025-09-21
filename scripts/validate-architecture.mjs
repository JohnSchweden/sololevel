#!/usr/bin/env node

/**
 * Architecture Validation Script
 * Ensures clean separation between shared utilities and domain logic
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { extname, join } from 'path';

const SHARED_DIR = 'supabase/shared';
const FUNCTIONS_DIR = 'supabase/functions';

// Import violation patterns
const VIOLATIONS = {
  // Shared modules should not import from functions
  sharedImportsFunctions: {
    pattern: /from ['"']\.\.[./]*functions/g,
    message: 'Shared modules cannot import from functions (architectural boundary violation)',
    severity: 'error'
  },
  // Functions should only import from shared via proper paths
  functionsImportShared: {
    pattern: /from ['"']\.\.[./]*shared/g,
    message: 'Functions importing from shared - ensure proper architectural boundaries',
    severity: 'info'
  }
};

function findTypeScriptFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    const items = readdirSync(currentDir);

    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile() && (extname(item) === '.ts' || extname(item) === '.js')) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

function validateFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const violations = [];

  // Determine which validation rules apply based on file location
  const isSharedFile = filePath.startsWith(SHARED_DIR);
  const isFunctionFile = filePath.startsWith(FUNCTIONS_DIR);

  if (isSharedFile) {
    // Shared files should not import from functions
    const matches = content.match(VIOLATIONS.sharedImportsFunctions.pattern);
    if (matches) {
      violations.push({
        file: filePath,
        rule: 'sharedImportsFunctions',
        message: VIOLATIONS.sharedImportsFunctions.message,
        severity: VIOLATIONS.sharedImportsFunctions.severity,
        matches: matches.length
      });
    }
  }

  if (isFunctionFile) {
    // Functions importing from shared (informational)
    const matches = content.match(VIOLATIONS.functionsImportShared.pattern);
    if (matches) {
      violations.push({
        file: filePath,
        rule: 'functionsImportShared',
        message: VIOLATIONS.functionsImportShared.message,
        severity: VIOLATIONS.functionsImportShared.severity,
        matches: matches.length
      });
    }
  }

  return violations;
}

function main() {
  console.log('🔍 Validating architectural boundaries...\n');

  const allFiles = [
    ...findTypeScriptFiles(SHARED_DIR),
    ...findTypeScriptFiles(FUNCTIONS_DIR)
  ];

  const allViolations = [];
  let errorCount = 0;
  let warningCount = 0;

  for (const file of allFiles) {
    const violations = validateFile(file);
    allViolations.push(...violations);
  }

  // Report violations
  for (const violation of allViolations) {
    const prefix = violation.severity === 'error' ? '❌' : 'ℹ️';
    console.log(`${prefix} ${violation.file}: ${violation.message}`);

    if (violation.severity === 'error') {
      errorCount++;
    } else {
      warningCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`   Warnings: ${warningCount}`);
  console.log(`   Total files checked: ${allFiles.length}`);

  if (errorCount > 0) {
    console.log('\n💥 Architectural violations found! Fix before committing.');
    process.exit(1);
  } else {
    console.log('\n✅ Architecture validation passed!');
  }
}

main();
