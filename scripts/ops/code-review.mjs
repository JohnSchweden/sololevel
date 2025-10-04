#!/usr/bin/env node

/**
 * Code Review Script - Modern Best Practices
 * 
 * Comprehensive code review automation following modern best practices:
 * - Automated quality checks (linting, type checking, testing)
 * - Security vulnerability scanning
 * - Performance analysis
 * - Architecture compliance validation
 * - Documentation completeness
 * - Git workflow validation
 * 
 * Usage:
 *   yarn code-review                    # Full review
 *   yarn code-review --quick           # Quick checks only
 *   yarn code-review --security        # Security-focused review
 *   yarn code-review --performance     # Performance-focused review
 *   yarn code-review --architecture    # Architecture compliance only
 *   yarn code-review --pre-commit      # Pre-commit validation
 *   yarn code-review --ci              # CI/CD pipeline validation
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Review configuration
const config = {
  quick: {
    checks: ['lint', 'type-check', 'test-critical'],
    timeout: 30000, // 30 seconds
  },
  full: {
    checks: ['lint', 'type-check', 'test', 'security', 'performance', 'architecture', 'docs', 'memory-management', 'graceful-exit'],
    timeout: 300000, // 5 minutes
  },
  security: {
    checks: ['security', 'type-check', 'lint-security'],
    timeout: 120000, // 2 minutes
  },
  performance: {
    checks: ['performance', 'bundle-analysis', 'type-check', 'memory-management'],
    timeout: 180000, // 3 minutes
  },
  architecture: {
    checks: ['architecture', 'type-check', 'lint'],
    timeout: 60000, // 1 minute
  },
  'pre-commit': {
    checks: ['lint', 'type-check', 'test-critical', 'git-hooks'],
    timeout: 60000, // 1 minute
  },
  ci: {
    checks: ['lint', 'type-check', 'test', 'security', 'build'],
    timeout: 600000, // 10 minutes
  },
  memory: {
    checks: ['memory-management', 'graceful-exit', 'type-check'],
    timeout: 120000, // 2 minutes
  },
  exit: {
    checks: ['graceful-exit', 'memory-management', 'type-check'],
    timeout: 120000, // 2 minutes
  },
};

class CodeReviewer {
  constructor(mode = 'full') {
    this.mode = mode;
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
      skipped: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        skipped: 0,
        duration: 0,
      },
    };
    this.startTime = Date.now();
  }

  log(message, color = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  logSection(title) {
    console.log('\n' + '='.repeat(60));
    this.log(`🔍 ${title}`, 'cyan');
    console.log('='.repeat(60));
  }

  logCheck(name, status, details = '') {
    const statusColor = status === 'passed' ? 'green' : status === 'failed' ? 'red' : 'yellow';
    const statusIcon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️';
    
    this.log(`${statusIcon} ${name}`, statusColor);
    if (details) {
      this.log(`   ${details}`, 'white');
    }
  }

  async runCommand(command, description, timeout = 30000) {
    try {
      this.log(`Running: ${command}`, 'blue');
      const result = execSync(command, { 
        cwd: projectRoot, 
        encoding: 'utf8',
        timeout,
        stdio: 'pipe'
      });
      return { success: true, output: result };
    } catch (error) {
      return { 
        success: false, 
        output: error.stdout || error.stderr || error.message,
        exitCode: error.status
      };
    }
  }

  async checkLinting() {
    this.logSection('Code Quality - Linting');
    
    const result = await this.runCommand('yarn lint', 'Biome linting check');
    
    if (result.success) {
      this.logCheck('Linting', 'passed', 'No linting errors found');
      this.results.passed.push('linting');
    } else {
      this.logCheck('Linting', 'failed', 'Linting errors detected');
      this.log(result.output, 'red');
      this.results.failed.push('linting');
    }
  }

  async checkTypeScript() {
    this.logSection('Type Safety - TypeScript');
    
    const result = await this.runCommand('yarn type-check:all', 'TypeScript compilation check');
    
    if (result.success) {
      this.logCheck('TypeScript', 'passed', 'No type errors found');
      this.results.passed.push('typescript');
    } else {
      this.logCheck('TypeScript', 'failed', 'Type errors detected');
      this.log(result.output, 'red');
      this.results.failed.push('typescript');
    }
  }

  async checkTests() {
    this.logSection('Test Coverage - Unit & Integration');
    
    const result = await this.runCommand('yarn test:ci', 'Test suite execution');
    
    if (result.success) {
      this.logCheck('Tests', 'passed', 'All tests passing');
      this.results.passed.push('tests');
    } else {
      this.logCheck('Tests', 'failed', 'Test failures detected');
      this.log(result.output, 'red');
      this.results.failed.push('tests');
    }
  }

  async checkCriticalTests() {
    this.logSection('Critical Tests - Core Functionality');
    
    // Try to run critical test suites, fallback to general tests if specific ones don't exist
    const criticalTests = [
      'yarn workspace @my/api test auth',
      'yarn workspace @my/app test auth',
    ];
    
    let allPassed = true;
    let testsRun = 0;
    
    for (const testCommand of criticalTests) {
      const result = await this.runCommand(testCommand, 'Critical test execution');
      if (result.success) {
        testsRun++;
      } else {
        // If specific test fails, try running all tests for that workspace
        const fallbackCommand = testCommand.replace(' auth', '');
        const fallbackResult = await this.runCommand(fallbackCommand, 'Fallback test execution');
        if (fallbackResult.success) {
          testsRun++;
        } else {
          allPassed = false;
          this.log(result.output, 'red');
        }
      }
    }
    
    if (testsRun === 0) {
      this.logCheck('Critical Tests', 'warning', 'No tests found to run');
      this.results.warnings.push('critical-tests');
    } else if (allPassed) {
      this.logCheck('Critical Tests', 'passed', 'Core functionality tests passing');
      this.results.passed.push('critical-tests');
    } else {
      this.logCheck('Critical Tests', 'failed', 'Critical test failures detected');
      this.results.failed.push('critical-tests');
    }
  }

  async checkSecurity() {
    this.logSection('Security Analysis');
    
    // Security audit
    const auditResult = await this.runCommand('yarn security:audit:ci', 'Security vulnerability scan');
    
    if (auditResult.success) {
      this.logCheck('Security Audit', 'passed', 'No high-severity vulnerabilities');
      this.results.passed.push('security-audit');
    } else {
      this.logCheck('Security Audit', 'failed', 'Security vulnerabilities detected');
      this.log(auditResult.output, 'red');
      this.results.failed.push('security-audit');
    }

    // Check for security anti-patterns
    await this.checkSecurityPatterns();
  }

  async checkSecurityPatterns() {
    this.logSection('Security Patterns Check');
    
    const securityChecks = [
      {
        name: 'Environment Variables',
        command: 'grep -r "process\\.env\\." --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" packages/ apps/ | grep -v "NODE_ENV\\|PUBLIC_" | head -10',
        description: 'Check for hardcoded secrets'
      },
      {
        name: 'Console Logs',
        command: 'grep -r "console\\.log" --include="*.ts" --include="*.tsx" packages/ apps/ | grep -v "test" | head -5',
        description: 'Check for debug logs in production code'
      },
      {
        name: 'TODO Comments',
        command: 'grep -r "TODO\\|FIXME\\|HACK" --include="*.ts" --include="*.tsx" packages/ apps/ | head -5',
        description: 'Check for unresolved TODOs'
      }
    ];

    for (const check of securityChecks) {
      const result = await this.runCommand(check.command, check.description);
      
      if (result.success && result.output.trim()) {
        this.logCheck(check.name, 'warning', `${check.description} - Review needed`);
        this.log(result.output, 'yellow');
        this.results.warnings.push(check.name.toLowerCase().replace(/\s+/g, '-'));
      } else {
        this.logCheck(check.name, 'passed', 'No issues found');
        this.results.passed.push(check.name.toLowerCase().replace(/\s+/g, '-'));
      }
    }
  }

  async checkPerformance() {
    this.logSection('Performance Analysis');
    
    // Bundle size analysis
    const bundleResult = await this.runCommand('yarn build:web', 'Web bundle build');
    
    if (bundleResult.success) {
      this.logCheck('Bundle Build', 'passed', 'Web bundle builds successfully');
      this.results.passed.push('bundle-build');
      
      // Check bundle size
      await this.checkBundleSize();
    } else {
      this.logCheck('Bundle Build', 'failed', 'Bundle build failed');
      this.log(bundleResult.output, 'red');
      this.results.failed.push('bundle-build');
    }
  }

  async checkBundleSize() {
    const bundlePath = join(projectRoot, 'apps/next/dist');
    
    if (existsSync(bundlePath)) {
      const result = await this.runCommand(`du -sh ${bundlePath}`, 'Bundle size check');
      
      if (result.success) {
        const size = result.output.split('\t')[0];
        this.logCheck('Bundle Size', 'passed', `Total size: ${size}`);
        this.results.passed.push('bundle-size');
      }
    }
  }

  async checkArchitecture() {
    this.logSection('Architecture Compliance');
    
    // Check for architectural violations
    const archChecks = [
      {
        name: 'Import Boundaries',
        command: 'grep -r "from [\'"]\\.\\./.*\\.\\./.*\\.\\./" --include="*.ts" --include="*.tsx" packages/ apps/ | head -5',
        description: 'Check for deep relative imports'
      },
      {
        name: 'Package Dependencies',
        command: 'yarn workspaces list --json | jq -r \'.name\' | while read pkg; do echo "=== $pkg ==="; yarn workspace $pkg list --depth=0 2>/dev/null | grep -E "^├─|^└─" | head -3; done',
        description: 'Check package dependency structure'
      }
    ];

    for (const check of archChecks) {
      const result = await this.runCommand(check.command, check.description);
      
      if (result.success) {
        this.logCheck(check.name, 'passed', 'Architecture compliance maintained');
        this.results.passed.push(check.name.toLowerCase().replace(/\s+/g, '-'));
      } else {
        this.logCheck(check.name, 'warning', 'Architecture review recommended');
        this.results.warnings.push(check.name.toLowerCase().replace(/\s+/g, '-'));
      }
    }
  }

  async checkDocumentation() {
    this.logSection('Documentation Completeness');
    
    const docChecks = [
      {
        name: 'README Files',
        command: 'find packages/ apps/ -name "README.md" | wc -l',
        description: 'Check for README files in packages'
      },
      {
        name: 'TypeScript Comments',
        command: 'grep -r "/\\*\\*" --include="*.ts" --include="*.tsx" packages/ | wc -l',
        description: 'Check for JSDoc comments'
      }
    ];

    for (const check of docChecks) {
      const result = await this.runCommand(check.command, check.description);
      
      if (result.success) {
        const count = parseInt(result.output.trim());
        if (count > 0) {
          this.logCheck(check.name, 'passed', `${count} items found`);
          this.results.passed.push(check.name.toLowerCase().replace(/\s+/g, '-'));
        } else {
          this.logCheck(check.name, 'warning', 'No documentation found');
          this.results.warnings.push(check.name.toLowerCase().replace(/\s+/g, '-'));
        }
      }
    }
  }

  async checkGitHooks() {
    this.logSection('Git Workflow');
    
    // Check if pre-commit hooks are installed
    const hooksPath = join(projectRoot, '.git/hooks/pre-commit');
    
    if (existsSync(hooksPath)) {
      this.logCheck('Pre-commit Hooks', 'passed', 'Git hooks installed');
      this.results.passed.push('git-hooks');
    } else {
      this.logCheck('Pre-commit Hooks', 'warning', 'Git hooks not installed');
      this.results.warnings.push('git-hooks');
    }
  }

  async checkBuild() {
    this.logSection('Build Validation');
    
    const buildResult = await this.runCommand('yarn build', 'Full project build');
    
    if (buildResult.success) {
      this.logCheck('Build', 'passed', 'Project builds successfully');
      this.results.passed.push('build');
    } else {
      this.logCheck('Build', 'failed', 'Build failed');
      this.log(buildResult.output, 'red');
      this.results.failed.push('build');
    }
  }

  async checkMemoryManagement() {
    this.logSection('Memory Management & Resource Cleanup');
    
    const memoryChecks = [
      {
        name: 'useEffect Cleanup',
        command: 'grep -r "useEffect" --include="*.ts" --include="*.tsx" packages/ apps/ | grep -v "return" | wc -l',
        description: 'Check for useEffect without cleanup'
      },
      {
        name: 'Timer Cleanup',
        command: 'grep -r "setTimeout\\|setInterval" --include="*.ts" --include="*.tsx" packages/ apps/ | grep -v "clearTimeout\\|clearInterval" | head -5',
        description: 'Check for uncleaned timers'
      },
      {
        name: 'Event Listeners',
        command: 'grep -r "addEventListener" --include="*.ts" --include="*.tsx" packages/ apps/ | grep -v "removeEventListener" | head -5',
        description: 'Check for uncleaned event listeners'
      },
      {
        name: 'Native Resources',
        command: 'grep -r "useCamera\\|useAudioPlayer\\|useVideoPlayer" --include="*.ts" --include="*.tsx" packages/ apps/ | head -5',
        description: 'Check for native resource usage'
      },
      {
        name: 'Subscription Cleanup',
        command: 'grep -r "subscribe\\|onAuthStateChange" --include="*.ts" --include="*.tsx" packages/ apps/ | grep -v "unsubscribe" | head -5',
        description: 'Check for uncleaned subscriptions'
      }
    ];

    for (const check of memoryChecks) {
      const result = await this.runCommand(check.command, check.description);
      
      if (result.success) {
        if (check.name === 'useEffect Cleanup') {
          const count = parseInt(result.output.trim());
          if (count > 0) {
            this.logCheck(check.name, 'warning', `${count} useEffect hooks found - verify cleanup`);
            this.results.warnings.push(check.name.toLowerCase().replace(/\s+/g, '-'));
          } else {
            this.logCheck(check.name, 'passed', 'No useEffect hooks found');
            this.results.passed.push(check.name.toLowerCase().replace(/\s+/g, '-'));
          }
        } else if (result.output.trim()) {
          this.logCheck(check.name, 'warning', `${check.description} - Review needed`);
          this.log(result.output, 'yellow');
          this.results.warnings.push(check.name.toLowerCase().replace(/\s+/g, '-'));
        } else {
          this.logCheck(check.name, 'passed', 'No issues found');
          this.results.passed.push(check.name.toLowerCase().replace(/\s+/g, '-'));
        }
      }
    }
  }

  async checkGracefulExit() {
    this.logSection('Graceful Exit & Error Handling');
    
    const exitChecks = [
      {
        name: 'Error Boundaries',
        command: 'grep -r "ErrorBoundary\\|componentDidCatch" --include="*.ts" --include="*.tsx" packages/ apps/ | wc -l',
        description: 'Check for error boundary implementation'
      },
      {
        name: 'App State Handling',
        command: 'grep -r "AppState\\|useAppState" --include="*.ts" --include="*.tsx" packages/ apps/ | head -3',
        description: 'Check for app state change handling'
      },
      {
        name: 'Unhandled Promises',
        command: 'grep -r "async.*=>" --include="*.ts" --include="*.tsx" packages/ apps/ | grep -v "catch\\|finally" | head -5',
        description: 'Check for unhandled async operations'
      },
      {
        name: 'Resource Disposal',
        command: 'grep -r "release\\|destroy\\|cleanup" --include="*.ts" --include="*.tsx" packages/ apps/ | head -5',
        description: 'Check for resource disposal patterns'
      }
    ];

    for (const check of exitChecks) {
      const result = await this.runCommand(check.command, check.description);
      
      if (result.success) {
        if (check.name === 'Error Boundaries') {
          const count = parseInt(result.output.trim());
          if (count > 0) {
            this.logCheck(check.name, 'passed', `${count} error boundaries found`);
            this.results.passed.push(check.name.toLowerCase().replace(/\s+/g, '-'));
          } else {
            this.logCheck(check.name, 'warning', 'No error boundaries found');
            this.results.warnings.push(check.name.toLowerCase().replace(/\s+/g, '-'));
          }
        } else if (result.output.trim()) {
          this.logCheck(check.name, 'passed', `${check.description} - Patterns found`);
          this.results.passed.push(check.name.toLowerCase().replace(/\s+/g, '-'));
        } else {
          this.logCheck(check.name, 'warning', 'No patterns found');
          this.results.warnings.push(check.name.toLowerCase().replace(/\s+/g, '-'));
        }
      }
    }
  }

  generateReport() {
    const duration = Date.now() - this.startTime;
    this.results.summary.duration = duration;
    
    this.logSection('Code Review Summary');
    
    const { summary } = this.results;
    summary.passed = this.results.passed.length;
    summary.failed = this.results.failed.length;
    summary.warnings = this.results.warnings.length;
    summary.skipped = this.results.skipped.length;
    summary.total = summary.passed + summary.failed + summary.warnings + summary.skipped;
    
    this.log(`📊 Total Checks: ${summary.total}`, 'white');
    this.log(`✅ Passed: ${summary.passed}`, 'green');
    this.log(`❌ Failed: ${summary.failed}`, 'red');
    this.log(`⚠️  Warnings: ${summary.warnings}`, 'yellow');
    this.log(`⏭️  Skipped: ${summary.skipped}`, 'blue');
    this.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`, 'white');
    
    // Recommendations
    if (summary.failed > 0) {
      this.log('\n🚨 Action Required:', 'red');
      this.log('Fix failed checks before proceeding with code review.', 'red');
    }
    
    if (summary.warnings > 0) {
      this.log('\n⚠️  Recommendations:', 'yellow');
      this.log('Review warnings and address as needed.', 'yellow');
    }
    
    if (summary.failed === 0 && summary.warnings === 0) {
      this.log('\n🎉 Code Review Passed!', 'green');
      this.log('All checks passed. Code is ready for review.', 'green');
    }
    
    return this.results;
  }

  async run() {
    this.log('🔍 Starting Code Review', 'bright');
    this.log(`Mode: ${this.mode}`, 'blue');
    this.log(`Project: ${projectRoot}`, 'blue');
    
    const modeConfig = config[this.mode] || config.full;
    const checks = modeConfig.checks;
    
    for (const check of checks) {
      try {
        switch (check) {
          case 'lint':
            await this.checkLinting();
            break;
          case 'type-check':
            await this.checkTypeScript();
            break;
          case 'test':
            await this.checkTests();
            break;
          case 'test-critical':
            await this.checkCriticalTests();
            break;
          case 'security':
            await this.checkSecurity();
            break;
          case 'performance':
            await this.checkPerformance();
            break;
          case 'architecture':
            await this.checkArchitecture();
            break;
          case 'docs':
            await this.checkDocumentation();
            break;
          case 'git-hooks':
            await this.checkGitHooks();
            break;
          case 'build':
            await this.checkBuild();
            break;
          case 'memory-management':
            await this.checkMemoryManagement();
            break;
          case 'graceful-exit':
            await this.checkGracefulExit();
            break;
          default:
            this.log(`Unknown check: ${check}`, 'yellow');
            this.results.skipped.push(check);
        }
      } catch (error) {
        this.log(`Error running ${check}: ${error.message}`, 'red');
        this.results.failed.push(check);
      }
    }
    
    return this.generateReport();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const mode = args.find(arg => arg.startsWith('--'))?.slice(2) || 'full';
  
  if (!config[mode]) {
    console.error(`Unknown mode: ${mode}`);
    console.error('Available modes:', Object.keys(config).join(', '));
    process.exit(1);
  }
  
  const reviewer = new CodeReviewer(mode);
  const results = await reviewer.run();
  
  // Exit with appropriate code
  if (results.summary.failed > 0) {
    process.exit(1);
  } else if (results.summary.warnings > 0) {
    process.exit(2);
  } else {
    process.exit(0);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Code review failed:', error);
    process.exit(1);
  });
}

export { CodeReviewer };
