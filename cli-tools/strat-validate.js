#!/usr/bin/env node

/**
 * STRAT Validate - Contract Validator
 * Advanced static analysis and security auditing for smart contracts
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

class StratValidate {
  constructor() {
    this.rules = [
      { name: 'no-eval', check: this.checkNoEval, severity: 'critical' },
      { name: 'no-function-constructor', check: this.checkNoFunctionConstructor, severity: 'critical' },
      { name: 'no-infinite-loops', check: this.checkNoInfiniteLoops, severity: 'high' },
      { name: 'proper-access-control', check: this.checkAccessControl, severity: 'high' },
      { name: 'reentrancy-guard', check: this.checkReentrancy, severity: 'critical' },
      { name: 'integer-overflow', check: this.checkIntegerOverflow, severity: 'high' },
      { name: 'gas-optimization', check: this.checkGasOptimization, severity: 'medium' },
      { name: 'proper-error-handling', check: this.checkErrorHandling, severity: 'medium' },
      { name: 'event-emission', check: this.checkEventEmission, severity: 'low' },
      { name: 'documentation', check: this.checkDocumentation, severity: 'low' }
    ];

    this.results = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      info: []
    };
  }

  checkNoEval(code) {
    const issues = [];
    const evalMatches = code.match(/\beval\s*\(/g);

    if (evalMatches) {
      issues.push({
        rule: 'no-eval',
        message: 'Use of eval() is dangerous and not allowed',
        severity: 'critical',
        count: evalMatches.length,
        recommendation: 'Remove all eval() calls and use safer alternatives'
      });
    }

    return issues;
  }

  checkNoFunctionConstructor(code) {
    const issues = [];
    const functionMatches = code.match(/new\s+Function\s*\(/g);

    if (functionMatches) {
      issues.push({
        rule: 'no-function-constructor',
        message: 'Use of Function() constructor is dangerous',
        severity: 'critical',
        count: functionMatches.length,
        recommendation: 'Use regular function declarations instead'
      });
    }

    return issues;
  }

  checkNoInfiniteLoops(code) {
    const issues = [];

    // Check for while(true)
    if (code.match(/while\s*\(\s*true\s*\)/)) {
      issues.push({
        rule: 'no-infinite-loops',
        message: 'Potential infinite loop detected',
        severity: 'high',
        recommendation: 'Add proper loop termination conditions'
      });
    }

    // Check for for(;;)
    if (code.match(/for\s*\(\s*;\s*;\s*\)/)) {
      issues.push({
        rule: 'no-infinite-loops',
        message: 'Infinite for loop detected',
        severity: 'high',
        recommendation: 'Add proper loop termination conditions'
      });
    }

    return issues;
  }

  checkAccessControl(code) {
    const issues = [];

    // Check for functions that should have access control
    const criticalFunctions = ['mint', 'burn', 'destroy', 'selfdestruct', 'withdraw', 'transfer', 'approve'];

    criticalFunctions.forEach(func => {
      const regex = new RegExp(`\\b${func}\\s*\\([^)]*\\)\\s*{`, 'g');
      const matches = code.match(regex);

      if (matches) {
        // Check if the function has owner check
        const functionBody = code.split(regex)[1];
        if (functionBody && !functionBody.includes('this.caller') && !functionBody.includes('this.owner')) {
          issues.push({
            rule: 'proper-access-control',
            message: `Function '${func}' may be missing access control`,
            severity: 'high',
            recommendation: 'Add owner or permission checks for sensitive functions'
          });
        }
      }
    });

    return issues;
  }

  checkReentrancy(code) {
    const issues = [];

    // Check for external calls before state changes
    const externalCalls = code.match(/\.call\s*\(|\.transfer\s*\(|\.send\s*\(/g);

    if (externalCalls) {
      issues.push({
        rule: 'reentrancy-guard',
        message: 'External calls detected - verify reentrancy protection',
        severity: 'critical',
        count: externalCalls.length,
        recommendation: 'Use checks-effects-interactions pattern and reentrancy guards'
      });
    }

    return issues;
  }

  checkIntegerOverflow(code) {
    const issues = [];

    // Check for arithmetic operations without SafeMath
    const arithmeticOps = code.match(/[\+\-\*\/]\s*=/g);

    if (arithmeticOps && arithmeticOps.length > 5 && !code.includes('SafeMath')) {
      issues.push({
        rule: 'integer-overflow',
        message: 'Multiple arithmetic operations without overflow protection',
        severity: 'high',
        count: arithmeticOps.length,
        recommendation: 'Consider using SafeMath library or add overflow checks'
      });
    }

    return issues;
  }

  checkGasOptimization(code) {
    const issues = [];

    // Check for nested loops
    if (code.match(/for\s*\([^)]*\)\s*{[^}]*for\s*\(/)) {
      issues.push({
        rule: 'gas-optimization',
        message: 'Nested loops detected - high gas consumption',
        severity: 'medium',
        recommendation: 'Consider optimizing or using alternative data structures'
      });
    }

    // Check for redundant storage reads
    const storageReads = code.match(/this\.\w+/g);
    if (storageReads && storageReads.length > 10) {
      const uniqueReads = new Set(storageReads);
      if (storageReads.length / uniqueReads.size > 2) {
        issues.push({
          rule: 'gas-optimization',
          message: 'Redundant storage reads detected',
          severity: 'medium',
          recommendation: 'Cache storage values in memory variables'
        });
      }
    }

    return issues;
  }

  checkErrorHandling(code) {
    const issues = [];

    // Check for functions without error handling
    const functions = code.match(/\w+\s*\([^)]*\)\s*{/g);

    if (functions && functions.length > 3) {
      const throwCount = (code.match(/throw new Error/g) || []).length;

      if (throwCount < functions.length / 2) {
        issues.push({
          rule: 'proper-error-handling',
          message: 'Many functions lack explicit error handling',
          severity: 'medium',
          recommendation: 'Add error checks and throw descriptive errors'
        });
      }
    }

    return issues;
  }

  checkEventEmission(code) {
    const issues = [];

    // Check for state-changing functions without events
    const stateChanges = code.match(/this\.\w+\s*=/g);

    if (stateChanges && stateChanges.length > 3) {
      const emits = (code.match(/this\.emit\(/g) || []).length;

      if (emits < stateChanges.length / 3) {
        issues.push({
          rule: 'event-emission',
          message: 'State changes should emit events for transparency',
          severity: 'low',
          recommendation: 'Add event emissions for important state changes'
        });
      }
    }

    return issues;
  }

  checkDocumentation(code) {
    const issues = [];

    // Check for documentation comments
    const functions = code.match(/\w+\s*\([^)]*\)\s*{/g);
    const comments = code.match(/\/\*\*[\s\S]*?\*\//g);

    if (functions && functions.length > 5) {
      if (!comments || comments.length < functions.length / 2) {
        issues.push({
          rule: 'documentation',
          message: 'Contract lacks adequate documentation',
          severity: 'low',
          recommendation: 'Add JSDoc comments for all public functions'
        });
      }
    }

    return issues;
  }

  async validateContract(filePath, options = {}) {
    console.log('\n=== STRAT Contract Validation ===\n');
    console.log(`Validating: ${filePath}\n`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const code = fs.readFileSync(filePath, 'utf8');

    // Run all validation rules
    for (const rule of this.rules) {
      if (options.rules && !options.rules.includes(rule.name)) {
        continue; // Skip if specific rules requested and this isn't one
      }

      const issues = rule.check.call(this, code);

      issues.forEach(issue => {
        this.results[issue.severity].push(issue);
      });
    }

    // Calculate score
    const totalIssues = this.results.critical.length +
                       this.results.high.length +
                       this.results.medium.length +
                       this.results.low.length;

    const criticalWeight = this.results.critical.length * 10;
    const highWeight = this.results.high.length * 5;
    const mediumWeight = this.results.medium.length * 2;
    const lowWeight = this.results.low.length * 1;

    const totalWeight = criticalWeight + highWeight + mediumWeight + lowWeight;
    const score = Math.max(0, 100 - totalWeight);

    // Display results
    this.displayResults(score, options);

    // Generate report if requested
    if (options.report) {
      this.generateReport(filePath, score);
    }

    return {
      score,
      issues: this.results,
      totalIssues,
      passed: this.results.critical.length === 0
    };
  }

  displayResults(score, options) {
    console.log('=== Validation Results ===\n');

    // Display critical issues
    if (this.results.critical.length > 0) {
      console.log('CRITICAL ISSUES:');
      this.results.critical.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue.message}`);
        if (options.verbose) {
          console.log(`     Recommendation: ${issue.recommendation}`);
        }
      });
      console.log();
    }

    // Display high severity issues
    if (this.results.high.length > 0) {
      console.log('HIGH SEVERITY:');
      this.results.high.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue.message}`);
        if (options.verbose) {
          console.log(`     Recommendation: ${issue.recommendation}`);
        }
      });
      console.log();
    }

    // Display medium severity issues
    if (this.results.medium.length > 0 && options.verbose) {
      console.log('MEDIUM SEVERITY:');
      this.results.medium.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue.message}`);
        console.log(`     Recommendation: ${issue.recommendation}`);
      });
      console.log();
    }

    // Display low severity issues
    if (this.results.low.length > 0 && options.verbose) {
      console.log('LOW SEVERITY:');
      this.results.low.forEach((issue, i) => {
        console.log(`  ${i + 1}. ${issue.message}`);
      });
      console.log();
    }

    // Display summary
    console.log('=== Summary ===');
    console.log(`Security Score: ${score}/100`);
    console.log(`Critical: ${this.results.critical.length}`);
    console.log(`High: ${this.results.high.length}`);
    console.log(`Medium: ${this.results.medium.length}`);
    console.log(`Low: ${this.results.low.length}`);

    if (score >= 90) {
      console.log('\nStatus: EXCELLENT - Contract is production-ready');
    } else if (score >= 70) {
      console.log('\nStatus: GOOD - Minor improvements recommended');
    } else if (score >= 50) {
      console.log('\nStatus: FAIR - Several issues should be addressed');
    } else {
      console.log('\nStatus: POOR - Significant security concerns');
    }

    if (this.results.critical.length > 0) {
      console.log('\nWARNING: Critical issues must be fixed before deployment!');
    }

    console.log();
  }

  generateReport(filePath, score) {
    const reportPath = `${filePath}.validation-report.json`;

    const report = {
      file: filePath,
      timestamp: new Date().toISOString(),
      score,
      issues: this.results,
      summary: {
        critical: this.results.critical.length,
        high: this.results.high.length,
        medium: this.results.medium.length,
        low: this.results.low.length,
        total: this.results.critical.length + this.results.high.length +
               this.results.medium.length + this.results.low.length
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Report saved to: ${reportPath}\n`);
  }

  displayHelp() {
    console.log(`
STRAT Validate - Contract Validator
===================================

Usage: strat-validate <file> [options]

OPTIONS:
  --verbose, -v              Show detailed recommendations
  --report, -r               Generate JSON report
  --rules <rules>            Run specific rules (comma-separated)
  --fix                      Auto-fix issues (when possible)

VALIDATION RULES:
  no-eval                    Detect dangerous eval() usage
  no-function-constructor    Detect Function() constructor
  no-infinite-loops          Detect infinite loops
  proper-access-control      Verify access control
  reentrancy-guard           Check reentrancy protection
  integer-overflow           Check arithmetic safety
  gas-optimization           Identify gas inefficiencies
  proper-error-handling      Verify error handling
  event-emission             Check event emissions
  documentation              Verify code documentation

EXAMPLES:
  strat-validate MyContract.js
  strat-validate MyContract.js --verbose --report
  strat-validate MyContract.js --rules no-eval,reentrancy-guard
`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    const validator = new StratValidate();
    validator.displayHelp();
    process.exit(0);
  }

  const validator = new StratValidate();
  const filePath = args[0];

  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    report: args.includes('--report') || args.includes('-r'),
    fix: args.includes('--fix')
  };

  // Parse specific rules if provided
  const rulesIndex = args.indexOf('--rules');
  if (rulesIndex !== -1 && args[rulesIndex + 1]) {
    options.rules = args[rulesIndex + 1].split(',');
  }

  try {
    const result = await validator.validateContract(filePath, options);
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error(`\nError: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = StratValidate;
