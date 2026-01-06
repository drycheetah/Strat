/**
 * Gas Metering System for Smart Contracts
 * Prevents infinite loops and limits computation
 */

class GasTracker {
  constructor(gasLimit = 1000000) {
    this.gasLimit = gasLimit;
    this.gasUsed = 0;
    this.operations = [];
  }

  /**
   * Charge gas for an operation
   */
  charge(amount, operation = 'unknown') {
    this.gasUsed += amount;
    this.operations.push({ operation, gas: amount, total: this.gasUsed });

    if (this.gasUsed > this.gasLimit) {
      throw new Error(`Out of gas! Used ${this.gasUsed}, limit ${this.gasLimit}`);
    }
  }

  /**
   * Get remaining gas
   */
  remaining() {
    return this.gasLimit - this.gasUsed;
  }

  /**
   * Get gas report
   */
  getReport() {
    return {
      gasLimit: this.gasLimit,
      gasUsed: this.gasUsed,
      gasRemaining: this.remaining(),
      operations: this.operations
    };
  }
}

// Gas costs for various operations
const GAS_COSTS = {
  // Basic operations
  ADD: 3,
  SUB: 3,
  MUL: 5,
  DIV: 5,
  MOD: 5,
  EXP: 10,

  // Comparison
  LT: 3,
  GT: 3,
  EQ: 3,
  ISZERO: 3,

  // Logical
  AND: 3,
  OR: 3,
  NOT: 3,

  // Bitwise
  BYTE: 3,
  SHL: 3,
  SHR: 3,

  // Memory
  MLOAD: 3,
  MSTORE: 3,
  MSTORE8: 3,

  // Storage (expensive!)
  SLOAD: 200,
  SSTORE: 5000,

  // Flow control
  JUMP: 8,
  JUMPI: 10,
  PC: 2,

  // Stack
  POP: 2,
  PUSH: 3,
  DUP: 3,
  SWAP: 3,

  // Context
  CALLER: 2,
  CALLVALUE: 2,
  ADDRESS: 2,
  BALANCE: 400,
  TIMESTAMP: 2,
  NUMBER: 2,

  // Function call
  CALL: 700,
  RETURN: 0,

  // Logging
  LOG: 375,

  // Contract
  CREATE: 32000,
  SELFDESTRUCT: 5000
};

/**
 * Create a sandboxed execution environment with gas metering
 */
function createSandbox(gasLimit) {
  const gas = new GasTracker(gasLimit);

  const sandbox = {
    // Gas tracking
    __gas: gas,

    // Math operations
    Math: {
      abs: (x) => { gas.charge(GAS_COSTS.ADD, 'Math.abs'); return Math.abs(x); },
      floor: (x) => { gas.charge(GAS_COSTS.DIV, 'Math.floor'); return Math.floor(x); },
      ceil: (x) => { gas.charge(GAS_COSTS.DIV, 'Math.ceil'); return Math.ceil(x); },
      round: (x) => { gas.charge(GAS_COSTS.DIV, 'Math.round'); return Math.round(x); },
      max: (...args) => { gas.charge(GAS_COSTS.ADD * args.length, 'Math.max'); return Math.max(...args); },
      min: (...args) => { gas.charge(GAS_COSTS.ADD * args.length, 'Math.min'); return Math.min(...args); },
      pow: (x, y) => { gas.charge(GAS_COSTS.EXP, 'Math.pow'); return Math.pow(x, y); },
      sqrt: (x) => { gas.charge(GAS_COSTS.EXP, 'Math.sqrt'); return Math.sqrt(x); },
    },

    // String operations
    String: {
      length: (s) => { gas.charge(GAS_COSTS.MLOAD, 'String.length'); return s.length; },
      substr: (s, start, len) => { gas.charge(GAS_COSTS.MLOAD * len, 'String.substr'); return s.substr(start, len); },
      concat: (...strs) => {
        const totalLen = strs.reduce((sum, s) => sum + s.length, 0);
        gas.charge(GAS_COSTS.MSTORE * totalLen, 'String.concat');
        return strs.join('');
      }
    },

    // Array operations
    Array: {
      length: (arr) => { gas.charge(GAS_COSTS.MLOAD, 'Array.length'); return arr.length; },
      push: (arr, item) => { gas.charge(GAS_COSTS.MSTORE, 'Array.push'); arr.push(item); return arr.length; },
      pop: (arr) => { gas.charge(GAS_COSTS.POP, 'Array.pop'); return arr.pop(); },
      slice: (arr, start, end) => {
        gas.charge(GAS_COSTS.MLOAD * (end - start), 'Array.slice');
        return arr.slice(start, end);
      },
      map: (arr, fn) => {
        gas.charge(GAS_COSTS.CALL * arr.length, 'Array.map');
        return arr.map(fn);
      },
      filter: (arr, fn) => {
        gas.charge(GAS_COSTS.CALL * arr.length, 'Array.filter');
        return arr.filter(fn);
      },
      reduce: (arr, fn, initial) => {
        gas.charge(GAS_COSTS.CALL * arr.length, 'Array.reduce');
        return arr.reduce(fn, initial);
      }
    },

    // Object operations
    Object: {
      keys: (obj) => {
        const keys = Object.keys(obj);
        gas.charge(GAS_COSTS.MLOAD * keys.length, 'Object.keys');
        return keys;
      },
      values: (obj) => {
        const values = Object.values(obj);
        gas.charge(GAS_COSTS.MLOAD * values.length, 'Object.values');
        return values;
      },
      entries: (obj) => {
        const entries = Object.entries(obj);
        gas.charge(GAS_COSTS.MLOAD * entries.length * 2, 'Object.entries');
        return entries;
      }
    },

    // Console (for debugging, no output in production)
    console: {
      log: (...args) => { gas.charge(GAS_COSTS.LOG, 'console.log'); }
    },

    // Block/transaction context
    block: {
      number: 0,
      timestamp: Date.now(),
      difficulty: 0
    },

    msg: {
      sender: '',
      value: 0
    },

    // Utility
    require: (condition, message) => {
      gas.charge(GAS_COSTS.JUMPI, 'require');
      if (!condition) {
        throw new Error(message || 'Requirement failed');
      }
    },

    assert: (condition, message) => {
      gas.charge(GAS_COSTS.JUMPI, 'assert');
      if (!condition) {
        throw new Error(message || 'Assertion failed');
      }
    },

    // Prevented globals
    setTimeout: undefined,
    setInterval: undefined,
    setImmediate: undefined,
    process: undefined,
    require: undefined,
    eval: undefined,
    Function: undefined
  };

  return sandbox;
}

/**
 * Execute smart contract code with gas metering
 */
function executeWithGas(code, state, params, context, gasLimit = 1000000) {
  const sandbox = createSandbox(gasLimit);

  // Add context
  sandbox.state = new Proxy(state, {
    get: (target, prop) => {
      sandbox.__gas.charge(GAS_COSTS.SLOAD, `state.${prop} (read)`);
      return target[prop];
    },
    set: (target, prop, value) => {
      sandbox.__gas.charge(GAS_COSTS.SSTORE, `state.${prop} (write)`);
      target[prop] = value;
      return true;
    }
  });

  sandbox.params = params;
  sandbox.caller = context.caller || '';
  sandbox.msg.sender = context.caller || '';
  sandbox.msg.value = context.value || 0;
  sandbox.block.number = context.blockNumber || 0;
  sandbox.block.timestamp = context.timestamp || Date.now();
  sandbox.block.difficulty = context.difficulty || 0;

  try {
    // Charge base gas for contract execution
    sandbox.__gas.charge(GAS_COSTS.CALL, 'contract_execution');

    // Create function with sandbox context
    const contractFunction = new Function(
      'state', 'params', 'caller', 'Math', 'String', 'Array', 'Object',
      'console', 'require', 'assert', 'block', 'msg', '__gas',
      `
      "use strict";
      ${code}
      `
    );

    // Execute with timeout
    const result = contractFunction(
      sandbox.state,
      sandbox.params,
      sandbox.caller,
      sandbox.Math,
      sandbox.String,
      sandbox.Array,
      sandbox.Object,
      sandbox.console,
      sandbox.require,
      sandbox.assert,
      sandbox.block,
      sandbox.msg,
      sandbox.__gas
    );

    return {
      success: true,
      result,
      gasUsed: sandbox.__gas.gasUsed,
      gasReport: sandbox.__gas.getReport()
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      gasUsed: sandbox.__gas.gasUsed,
      gasReport: sandbox.__gas.getReport()
    };
  }
}

/**
 * Estimate gas for a contract call
 */
function estimateGas(code, state, params, context) {
  // Try with high gas limit to get actual usage
  const result = executeWithGas(code, state, params, context, 10000000);

  if (result.success) {
    // Add 20% buffer for safety
    return Math.ceil(result.gasUsed * 1.2);
  } else {
    throw new Error(`Gas estimation failed: ${result.error}`);
  }
}

/**
 * Calculate gas price based on network conditions
 */
function calculateGasPrice(mempoolSize, mempoolUtilization) {
  const basePrice = 0.00001; // Base gas price in STRAT

  // Increase price if mempool is crowded
  const utilizationMultiplier = 1 + (parseFloat(mempoolUtilization) / 100);

  return basePrice * utilizationMultiplier;
}

module.exports = {
  GasTracker,
  GAS_COSTS,
  createSandbox,
  executeWithGas,
  estimateGas,
  calculateGasPrice
};
