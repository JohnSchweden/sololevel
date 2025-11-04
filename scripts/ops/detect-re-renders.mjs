#!/usr/bin/env node
/**
 * detect-re-renders.mjs - Static analysis script to detect common re-render anti-patterns
 * 
 * Scans TypeScript/TSX files for patterns that commonly cause unnecessary re-renders:
 * - Inline object literals in JSX props
 * - Unstable hook return objects (missing useMemo)
 * - Context values without memoization
 * - useEffect dependencies creating new references
 * 
 * Usage:
 *   node scripts/ops/detect-re-renders.mjs [paths...]
 * 
 * Examples:
 *   node scripts/ops/detect-re-renders.mjs
 *   node scripts/ops/detect-re-renders.mjs packages/app/features/VideoAnalysis
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..', '..', '..');

// Configuration
const SCAN_PATHS = process.argv.slice(2).length > 0 
  ? process.argv.slice(2).map(p => join(__dirname, p))
  : [
      join(__dirname, 'packages/app'),
      join(__dirname, 'packages/ui/src'),
    ];

const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.test\./,
  /\.spec\./,
  /\.stories\./,
  /dist/,
  /build/,
  /coverage/,
  /\.d\.ts$/,
];

const FILE_EXTENSIONS = ['.ts', '.tsx'];

// Issue categories
const issues = {
  inlineObjects: [],
  unstableHookReturns: [],
  unmemoizedContext: [],
  unstableEffectDeps: [],
};

/**
 * Check if file should be scanned
 */
function shouldScanFile(filePath) {
  if (!FILE_EXTENSIONS.some(ext => filePath.endsWith(ext))) {
    return false;
  }

  return !EXCLUDE_PATTERNS.some(pattern => pattern.test(filePath));
}

/**
 * Recursively find all TypeScript files
 */
function findFiles(dir, fileList = []) {
  try {
    const files = readdirSync(dir);

    for (const file of files) {
      const filePath = join(dir, file);
      const stat = statSync(filePath);

      if (stat.isDirectory()) {
        findFiles(filePath, fileList);
      } else if (shouldScanFile(filePath)) {
        fileList.push(filePath);
      }
    }
  } catch (error) {
    // Skip directories we can't read
    if (error.code !== 'EACCES') {
      console.warn(`Warning: Could not read ${dir}:`, error.message);
    }
  }

  return fileList;
}

/**
 * Detect inline object literals in JSX props
 */
function detectInlineObjects(content, filePath) {
  const lines = content.split('\n');
  const issues = [];

  // Pattern: prop={{ key: value }} or prop={{ key }} (inline object)
  const inlineObjectRegex = /\w+\s*=\s*\{\{[\s\S]{1,100}?\}\}/g;

  lines.forEach((line, index) => {
    const matches = line.matchAll(inlineObjectRegex);
    for (const match of matches) {
      const matchStr = match[0];
      
      // Exclude common valid cases
      if (
        matchStr.includes('style=') ||
        matchStr.includes('testID=') ||
        matchStr.includes('style={{') ||
        matchStr.match(/^\w+\s*=\s*\{\{\s*\w+\s*\}\}/) // Single variable: {{value}}
      ) {
        continue;
      }

      // Check if it looks like an object literal (has : or multiple keys)
      if (matchStr.includes(':') || matchStr.split(',').length > 1) {
        issues.push({
          line: index + 1,
          column: match.index,
          code: line.trim(),
          suggestion: 'Extract object to useMemo or define outside component',
        });
      }
    }
  });

  return issues;
}

/**
 * Detect hooks returning objects without useMemo
 */
function detectUnstableHookReturns(content, filePath) {
  const issues = [];
  const lines = content.split('\n');

  // Pattern: return { ... } in a hook function
  const hookFunctionRegex = /(?:export\s+)?(?:function|const)\s+\w*use\w+\s*\([^)]*\)\s*[:{]/g;
  const returnObjectRegex = /return\s+\{[\s\S]{1,200}?\}/g;

  let inHook = false;
  let hookName = '';
  let hookStartLine = 0;

  lines.forEach((line, index) => {
    // Check if we're entering a hook
    const hookMatch = line.match(/^\s*(?:export\s+)?(?:function|const)\s+(\w*use\w+)/);
    if (hookMatch) {
      inHook = true;
      hookName = hookMatch[1];
      hookStartLine = index + 1;
    }

    // Check for hook end (new function or export)
    if (inHook && /^\s*(?:export\s+)?(?:function|const)\s+\w+\s*[=:]/.test(line) && !line.includes(hookName)) {
      inHook = false;
    }

    // Check for return statement in hook
    if (inHook && returnObjectRegex.test(line)) {
      // Check if useMemo wraps it (look ahead a few lines)
      const nextLines = lines.slice(index, index + 5).join('\n');
      if (!nextLines.includes('useMemo') && !nextLines.includes('useCallback')) {
        issues.push({
          line: index + 1,
          column: line.indexOf('return'),
          code: line.trim(),
          hook: hookName,
          suggestion: `Memoize return value: return useMemo(() => ({ ... }), [deps])`,
        });
      }
    }
  });

  return issues;
}

/**
 * Detect context values without memoization
 */
function detectUnmemoizedContext(content, filePath) {
  const issues = [];
  const lines = content.split('\n');

  // Pattern: <Context.Provider value={{ ... }}> or value={object}
  lines.forEach((line, index) => {
    if (line.includes('Provider') && line.includes('value=')) {
      // Check for inline object
      if (line.includes('value={{') || line.includes('value={')) {
        // Look for useMemo in surrounding context
        const context = lines.slice(Math.max(0, index - 10), index + 1).join('\n');
        if (!context.includes('useMemo') && !context.includes('useState')) {
          issues.push({
            line: index + 1,
            column: line.indexOf('value'),
            code: line.trim(),
            suggestion: 'Memoize context value: const value = useMemo(() => ({ ... }), [deps])',
          });
        }
      }
    }
  });

  return issues;
}

/**
 * Detect useEffect with potentially unstable dependencies
 */
function detectUnstableEffectDeps(content, filePath) {
  const issues = [];
  const lines = content.split('\n');

  // Pattern: useEffect(() => {...}, [object, array, function])
  const useEffectRegex = /useEffect\s*\([^)]*\[([^\]]+)\]/g;

  lines.forEach((line, index) => {
    const matches = line.matchAll(useEffectRegex);
    for (const match of matches) {
      const deps = match[1];
      
      // Check for object/array literals or function expressions in deps
      if (
        deps.includes('{') ||
        deps.includes('[') && !deps.match(/^\[[\w\s,]+\]$/) || // Simple array literal
        deps.includes('() =>') ||
        deps.includes('=>')
      ) {
        issues.push({
          line: index + 1,
          column: match.index,
          code: line.trim(),
          suggestion: 'Extract dependencies or use useCallback/useMemo for objects/functions',
        });
      }
    }
  });

  return issues;
}

/**
 * Scan a single file
 */
function scanFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const relativePath = relative(__dirname, filePath);

    const inlineObjects = detectInlineObjects(content, filePath);
    const unstableHooks = detectUnstableHookReturns(content, filePath);
    const unmemoizedContext = detectUnmemoizedContext(content, filePath);
    const unstableDeps = detectUnstableEffectDeps(content, filePath);

    if (inlineObjects.length > 0) {
      issues.inlineObjects.push({
        file: relativePath,
        issues: inlineObjects,
      });
    }

    if (unstableHooks.length > 0) {
      issues.unstableHookReturns.push({
        file: relativePath,
        issues: unstableHooks,
      });
    }

    if (unmemoizedContext.length > 0) {
      issues.unmemoizedContext.push({
        file: relativePath,
        issues: unmemoizedContext,
      });
    }

    if (unstableDeps.length > 0) {
      issues.unstableEffectDeps.push({
        file: relativePath,
        issues: unstableDeps,
      });
    }
  } catch (error) {
    console.warn(`Error scanning ${filePath}:`, error.message);
  }
}

/**
 * Main function
 */
function main() {
  console.log('🔍 Scanning for re-render anti-patterns...\n');
  console.log('Paths:', SCAN_PATHS.join(', '), '\n');

  // Find all files
  const files = [];
  for (const path of SCAN_PATHS) {
    try {
      const pathFiles = findFiles(path);
      files.push(...pathFiles);
    } catch (error) {
      console.warn(`Warning: Could not scan ${path}:`, error.message);
    }
  }

  console.log(`Found ${files.length} files to scan\n`);

  // Scan files
  for (const file of files) {
    scanFile(file);
  }

  // Report results
  const totalIssues = 
    issues.inlineObjects.length +
    issues.unstableHookReturns.length +
    issues.unmemoizedContext.length +
    issues.unstableEffectDeps.length;

  if (totalIssues === 0) {
    console.log('✅ No issues found!\n');
    process.exit(0);
  }

  console.log(`\n⚠️  Found ${totalIssues} potential re-render issues:\n`);

  // Inline objects
  if (issues.inlineObjects.length > 0) {
    console.log('📦 Inline Object Literals in JSX Props:');
    issues.inlineObjects.forEach(({ file, issues: fileIssues }) => {
      console.log(`\n  ${file}:`);
      fileIssues.slice(0, 3).forEach((issue) => {
        console.log(`    Line ${issue.line}: ${issue.code.substring(0, 60)}...`);
        console.log(`    → ${issue.suggestion}`);
      });
      if (fileIssues.length > 3) {
        console.log(`    ... and ${fileIssues.length - 3} more`);
      }
    });
    console.log('');
  }

  // Unstable hook returns
  if (issues.unstableHookReturns.length > 0) {
    console.log('🪝 Unstable Hook Return Objects:');
    issues.unstableHookReturns.forEach(({ file, issues: fileIssues }) => {
      console.log(`\n  ${file}:`);
      fileIssues.slice(0, 3).forEach((issue) => {
        console.log(`    Line ${issue.line} (${issue.hook}): ${issue.code.substring(0, 60)}...`);
        console.log(`    → ${issue.suggestion}`);
      });
      if (fileIssues.length > 3) {
        console.log(`    ... and ${fileIssues.length - 3} more`);
      }
    });
    console.log('');
  }

  // Unmemoized context
  if (issues.unmemoizedContext.length > 0) {
    console.log('🔌 Unmemoized Context Values:');
    issues.unmemoizedContext.forEach(({ file, issues: fileIssues }) => {
      console.log(`\n  ${file}:`);
      fileIssues.slice(0, 3).forEach((issue) => {
        console.log(`    Line ${issue.line}: ${issue.code.substring(0, 60)}...`);
        console.log(`    → ${issue.suggestion}`);
      });
      if (fileIssues.length > 3) {
        console.log(`    ... and ${fileIssues.length - 3} more`);
      }
    });
    console.log('');
  }

  // Unstable effect deps
  if (issues.unstableEffectDeps.length > 0) {
    console.log('⚡ Unstable useEffect Dependencies:');
    issues.unstableEffectDeps.forEach(({ file, issues: fileIssues }) => {
      console.log(`\n  ${file}:`);
      fileIssues.slice(0, 3).forEach((issue) => {
        console.log(`    Line ${issue.line}: ${issue.code.substring(0, 60)}...`);
        console.log(`    → ${issue.suggestion}`);
      });
      if (fileIssues.length > 3) {
        console.log(`    ... and ${fileIssues.length - 3} more`);
      }
    });
    console.log('');
  }

  console.log('\n💡 Tip: Use React DevTools Profiler or useRenderDiagnostics hook to verify actual impact\n');
  process.exit(totalIssues > 0 ? 1 : 0);
}

main();

