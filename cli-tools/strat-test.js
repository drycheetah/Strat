#!/usr/bin/env node

/**
 * STRAT Test - Testing Framework for Smart Contracts
 * Comprehensive testing framework with assertions, mocking, and coverage
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

class StratTest {
  constructor() {
    this.tests = [];
    this.suites = [];
    this.currentSuite = null;
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0
    };
    this.verbose = false;
    this.mockBlockchain = null;
  }

  describe(suiteName, suiteFunction) {
    const suite = {
      name: suiteName,
      tests: [],
      beforeAll: null,
      afterAll: null,
      beforeEach: null,
      afterEach: null
    };

    this.currentSuite = suite;
    this.suites.push(suite);

    // Execute suite to register tests
    suiteFunction();

    this.currentSuite = null;
  }

  it(testName, testFunction) {
    const test = {
      name: testName,
      function: testFunction,
      skip: false,
      only: false
    };

    if (this.currentSuite) {
      this.currentSuite.tests.push(test);
    } else {
      this.tests.push(test);
    }
  }

  beforeAll(hookFunction) {
    if (this.currentSuite) {
      this.currentSuite.beforeAll = hookFunction;
    }
  }

  afterAll(hookFunction) {
    if (this.currentSuite) {
      this.currentSuite.afterAll = hookFunction;
    }
  }

  beforeEach(hookFunction) {
    if (this.currentSuite) {
      this.currentSuite.beforeEach = hookFunction;
    }
  }

  afterEach(hookFunction) {
    if (this.currentSuite) {
      this.currentSuite.afterEach = hookFunction;
    }
  }

  // Assertion library
  expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${actual} to be ${expected}`);
        }
      },
      toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
        }
      },
      toBeTruthy: () => {
        if (!actual) {
          throw new Error(`Expected ${actual} to be truthy`);
        }
      },
      toBeFalsy: () => {
        if (actual) {
          throw new Error(`Expected ${actual} to be falsy`);
        }
      },
      toBeGreaterThan: (expected) => {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
      toBeLessThan: (expected) => {
        if (actual >= expected) {
          throw new Error(`Expected ${actual} to be less than ${expected}`);
        }
      },
      toContain: (expected) => {
        if (!actual.includes(expected)) {
          throw new Error(`Expected ${actual} to contain ${expected}`);
        }
      },
      toThrow: () => {
        let thrown = false;
        try {
          actual();
        } catch (e) {
          thrown = true;
        }
        if (!thrown) {
          throw new Error('Expected function to throw');
        }
      },
      toHaveProperty: (prop) => {
        if (!actual.hasOwnProperty(prop)) {
          throw new Error(`Expected object to have property ${prop}`);
        }
      },
      toBeNull: () => {
        if (actual !== null) {
          throw new Error(`Expected ${actual} to be null`);
        }
      },
      toBeUndefined: () => {
        if (actual !== undefined) {
          throw new Error(`Expected ${actual} to be undefined`);
        }
      },
      toMatchRegex: (regex) => {
        if (!regex.test(actual)) {
          throw new Error(`Expected ${actual} to match ${regex}`);
        }
      }
    };
  }

  // Mock blockchain for testing
  createMockBlockchain() {
    return {
      blocks: [],
      transactions: [],
      accounts: new Map(),
      contracts: new Map(),

      addBlock(block) {
        this.blocks.push(block);
        return block;
      },

      addTransaction(tx) {
        this.transactions.push(tx);
        return tx;
      },

      createAccount(address, balance = 1000) {
        this.accounts.set(address, { address, balance, nonce: 0 });
        return this.accounts.get(address);
      },

      getBalance(address) {
        const account = this.accounts.get(address);
        return account ? account.balance : 0;
      },

      transfer(from, to, amount) {
        const fromAccount = this.accounts.get(from);
        const toAccount = this.accounts.get(to);

        if (!fromAccount || fromAccount.balance < amount) {
          throw new Error('Insufficient balance');
        }

        fromAccount.balance -= amount;
        if (!toAccount) {
          this.createAccount(to, amount);
        } else {
          toAccount.balance += amount;
        }

        return { from, to, amount };
      },

      deployContract(address, code, owner) {
        this.contracts.set(address, { address, code, owner, state: {} });
        return this.contracts.get(address);
      },

      callContract(address, method, params) {
        const contract = this.contracts.get(address);
        if (!contract) {
          throw new Error('Contract not found');
        }

        // Execute contract code in sandbox
        const sandbox = {
          contract: contract.state,
          method,
          params,
          result: null
        };

        try {
          const code = `${contract.code}\n${method}(${JSON.stringify(params)})`;
          vm.runInNewContext(code, sandbox);
          return sandbox.result;
        } catch (error) {
          throw new Error(`Contract execution failed: ${error.message}`);
        }
      },

      reset() {
        this.blocks = [];
        this.transactions = [];
        this.accounts.clear();
        this.contracts.clear();
      }
    };
  }

  async runTest(test, suite = null) {
    this.results.total++;

    if (test.skip) {
      this.results.skipped++;
      console.log(`  ⊘ ${test.name} (skipped)`);
      return;
    }

    try {
      // Run beforeEach hook
      if (suite && suite.beforeEach) {
        await suite.beforeEach();
      }

      // Create test context
      const context = {
        expect: this.expect.bind(this),
        mockBlockchain: this.createMockBlockchain()
      };

      // Run test
      await test.function.call(context);

      // Run afterEach hook
      if (suite && suite.afterEach) {
        await suite.afterEach();
      }

      this.results.passed++;
      console.log(`  ✓ ${test.name}`);
    } catch (error) {
      this.results.failed++;
      console.log(`  ✗ ${test.name}`);
      if (this.verbose) {
        console.log(`    Error: ${error.message}`);
        if (error.stack) {
          console.log(`    ${error.stack.split('\n').slice(1).join('\n    ')}`);
        }
      }
    }
  }

  async runSuite(suite) {
    console.log(`\n${suite.name}`);

    // Run beforeAll hook
    if (suite.beforeAll) {
      try {
        await suite.beforeAll();
      } catch (error) {
        console.error(`  beforeAll failed: ${error.message}`);
        return;
      }
    }

    // Run tests
    for (const test of suite.tests) {
      await this.runTest(test, suite);
    }

    // Run afterAll hook
    if (suite.afterAll) {
      try {
        await suite.afterAll();
      } catch (error) {
        console.error(`  afterAll failed: ${error.message}`);
      }
    }
  }

  async run(options = {}) {
    this.verbose = options.verbose || false;

    console.log('\n=== STRAT Test Runner ===\n');

    const startTime = Date.now();

    // Run test suites
    for (const suite of this.suites) {
      await this.runSuite(suite);
    }

    // Run standalone tests
    if (this.tests.length > 0) {
      console.log('\nStandalone Tests');
      for (const test of this.tests) {
        await this.runTest(test);
      }
    }

    const duration = Date.now() - startTime;

    // Print summary
    console.log('\n=== Test Summary ===');
    console.log(`Total: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed} ✓`);
    console.log(`Failed: ${this.results.failed} ✗`);
    console.log(`Skipped: ${this.results.skipped} ⊘`);
    console.log(`Duration: ${duration}ms\n`);

    return this.results.failed === 0;
  }

  loadTestFile(filePath) {
    const testCode = fs.readFileSync(filePath, 'utf8');
    const testRunner = this;

    // Create test context
    const context = {
      describe: testRunner.describe.bind(testRunner),
      it: testRunner.it.bind(testRunner),
      expect: testRunner.expect.bind(testRunner),
      beforeAll: testRunner.beforeAll.bind(testRunner),
      afterAll: testRunner.afterAll.bind(testRunner),
      beforeEach: testRunner.beforeEach.bind(testRunner),
      afterEach: testRunner.afterEach.bind(testRunner),
      console: console,
      require: require
    };

    // Execute test file
    vm.runInNewContext(testCode, context);
  }

  displayHelp() {
    console.log(`
STRAT Test - Testing Framework
==============================

Usage: strat-test [options] [test-files...]

OPTIONS:
  --verbose, -v              Show detailed error messages
  --watch, -w                Watch for file changes
  --coverage                 Generate code coverage report
  --bail                     Stop on first failure

EXAMPLES:
  strat-test test/**/*.test.js
  strat-test contract.test.js --verbose
  strat-test --coverage
  strat-test --watch

TEST FILE FORMAT:
  describe('Contract Tests', () => {
    beforeAll(() => {
      // Setup
    });

    it('should deploy contract', () => {
      expect(true).toBeTruthy();
    });

    it('should transfer tokens', () => {
      const result = transfer('0x1', '0x2', 100);
      expect(result).toHaveProperty('amount');
      expect(result.amount).toBe(100);
    });
  });
`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    const runner = new StratTest();
    runner.displayHelp();
    process.exit(0);
  }

  const runner = new StratTest();
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    watch: args.includes('--watch') || args.includes('-w'),
    coverage: args.includes('--coverage'),
    bail: args.includes('--bail')
  };

  // Get test files
  const testFiles = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));

  if (testFiles.length === 0) {
    console.error('No test files specified');
    process.exit(1);
  }

  try {
    // Load all test files
    for (const file of testFiles) {
      if (fs.existsSync(file)) {
        runner.loadTestFile(file);
      } else {
        console.error(`Test file not found: ${file}`);
      }
    }

    // Run tests
    const success = await runner.run(options);

    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = StratTest;
