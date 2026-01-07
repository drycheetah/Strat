#!/usr/bin/env node

/**
 * STRAT Deploy - Smart Contract Deployment Tool
 * Advanced deployment tool with verification, optimization, and management
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

class StratDeploy {
  constructor(config = {}) {
    this.apiUrl = config.apiUrl || process.env.STRAT_API_URL || 'http://localhost:3000';
    this.deploymentHistory = [];
    this.historyPath = path.join(process.env.HOME || process.env.USERPROFILE, '.strat', 'deployments.json');
    this.loadHistory();
  }

  loadHistory() {
    try {
      if (fs.existsSync(this.historyPath)) {
        const data = fs.readFileSync(this.historyPath, 'utf8');
        this.deploymentHistory = JSON.parse(data);
      }
    } catch (error) {
      console.warn('Could not load deployment history:', error.message);
    }
  }

  saveHistory() {
    try {
      const dir = path.dirname(this.historyPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.historyPath, JSON.stringify(this.deploymentHistory, null, 2));
    } catch (error) {
      console.error('Could not save deployment history:', error.message);
    }
  }

  async request(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: `${this.apiUrl}${endpoint}`,
        headers: { 'Content-Type': 'application/json' }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`API Error: ${error.response.data.error || error.response.statusText}`);
      } else if (error.request) {
        throw new Error(`Network Error: Could not connect to ${this.apiUrl}`);
      } else {
        throw new Error(`Error: ${error.message}`);
      }
    }
  }

  validateContract(code) {
    const errors = [];
    const warnings = [];

    // Check for required structure
    if (!code.includes('constructor')) {
      warnings.push('No constructor found');
    }

    // Check for dangerous patterns
    if (code.includes('eval(')) {
      errors.push('Use of eval() is not allowed');
    }

    if (code.includes('Function(')) {
      errors.push('Use of Function() constructor is not allowed');
    }

    // Check for infinite loops (basic)
    const whileMatches = code.match(/while\s*\(\s*true\s*\)/g);
    if (whileMatches) {
      warnings.push('Potential infinite loop detected');
    }

    // Check for gas-intensive operations
    if (code.match(/for\s*\([^)]*\)\s*{[^}]*for\s*\(/)) {
      warnings.push('Nested loops detected - may consume high gas');
    }

    return { errors, warnings, valid: errors.length === 0 };
  }

  optimizeContract(code) {
    let optimized = code;

    // Remove comments
    optimized = optimized.replace(/\/\*[\s\S]*?\*\//g, '');
    optimized = optimized.replace(/\/\/.*/g, '');

    // Remove excessive whitespace
    optimized = optimized.replace(/\s+/g, ' ');
    optimized = optimized.trim();

    return optimized;
  }

  calculateGasEstimate(code) {
    // Simple gas estimation
    const baseGas = 21000;
    const codeGas = code.length * 10;
    const complexityGas = (code.match(/function/g) || []).length * 1000;
    const storageGas = (code.match(/this\.\w+\s*=/g) || []).length * 5000;

    return baseGas + codeGas + complexityGas + storageGas;
  }

  async deployContract(contractPath, owner, privateKey, options = {}) {
    console.log('\n=== STRAT Contract Deployment ===\n');

    // Read contract code
    console.log(`Reading contract from: ${contractPath}`);
    if (!fs.existsSync(contractPath)) {
      throw new Error(`Contract file not found: ${contractPath}`);
    }

    let code = fs.readFileSync(contractPath, 'utf8');
    const originalSize = code.length;

    // Validate contract
    console.log('\nValidating contract...');
    const validation = this.validateContract(code);

    if (validation.errors.length > 0) {
      console.error('\nValidation Errors:');
      validation.errors.forEach(err => console.error(`  - ${err}`));
      throw new Error('Contract validation failed');
    }

    if (validation.warnings.length > 0) {
      console.warn('\nValidation Warnings:');
      validation.warnings.forEach(warn => console.warn(`  - ${warn}`));
    }

    console.log('Validation: PASSED');

    // Optimize if requested
    if (options.optimize) {
      console.log('\nOptimizing contract...');
      code = this.optimizeContract(code);
      const savedBytes = originalSize - code.length;
      console.log(`Optimized: Saved ${savedBytes} bytes (${((savedBytes/originalSize)*100).toFixed(2)}%)`);
    }

    // Calculate gas estimate
    const gasEstimate = this.calculateGasEstimate(code);
    console.log(`\nEstimated Gas: ${gasEstimate}`);

    // Confirm deployment
    if (!options.yes) {
      console.log('\nContract Details:');
      console.log(`  Size: ${code.length} bytes`);
      console.log(`  Owner: ${owner}`);
      console.log(`  Network: ${this.apiUrl}`);

      // In production, would prompt for confirmation
      console.log('\nProceeding with deployment...');
    }

    // Deploy contract
    console.log('\nDeploying contract to blockchain...');
    const deploymentData = {
      code,
      owner,
      privateKey,
      gasEstimate
    };

    const result = await this.request('POST', '/api/contracts/deploy', deploymentData);

    // Save deployment info
    const deployment = {
      contractAddress: result.contractAddress,
      transactionId: result.transactionId,
      owner,
      timestamp: Date.now(),
      gasUsed: result.gasUsed || gasEstimate,
      contractPath,
      codeHash: crypto.createHash('sha256').update(code).digest('hex')
    };

    this.deploymentHistory.push(deployment);
    this.saveHistory();

    // Display results
    console.log('\n=== Deployment Successful ===');
    console.log(`Contract Address: ${result.contractAddress}`);
    console.log(`Transaction ID: ${result.transactionId}`);
    console.log(`Gas Used: ${deployment.gasUsed}`);
    console.log(`Block: ${result.blockIndex || 'Pending'}`);

    // Save deployment receipt
    if (options.receipt) {
      const receiptPath = `${contractPath}.receipt.json`;
      fs.writeFileSync(receiptPath, JSON.stringify(deployment, null, 2));
      console.log(`\nReceipt saved to: ${receiptPath}`);
    }

    return deployment;
  }

  async upgradeContract(oldAddress, newContractPath, owner, privateKey, options = {}) {
    console.log('\n=== Contract Upgrade ===\n');

    // Get old contract
    console.log(`Fetching current contract at ${oldAddress}...`);
    const oldContract = await this.request('GET', `/api/contracts/${oldAddress}`);

    console.log(`Current Owner: ${oldContract.owner}`);
    if (oldContract.owner !== owner) {
      throw new Error('Only contract owner can upgrade');
    }

    // Deploy new version
    console.log('\nDeploying new version...');
    const deployment = await this.deployContract(newContractPath, owner, privateKey, options);

    console.log('\n=== Upgrade Complete ===');
    console.log(`Old Contract: ${oldAddress}`);
    console.log(`New Contract: ${deployment.contractAddress}`);
    console.log('\nNote: You may need to migrate state manually');

    return deployment;
  }

  async verifyContract(contractAddress, sourcePath) {
    console.log('\n=== Contract Verification ===\n');

    // Get deployed contract
    const deployed = await this.request('GET', `/api/contracts/${contractAddress}`);

    // Read source
    const source = fs.readFileSync(sourcePath, 'utf8');
    const optimized = this.optimizeContract(source);

    // Compare
    const deployedHash = crypto.createHash('sha256').update(deployed.code).digest('hex');
    const sourceHash = crypto.createHash('sha256').update(optimized).digest('hex');

    console.log(`Contract Address: ${contractAddress}`);
    console.log(`Deployed Hash: ${deployedHash}`);
    console.log(`Source Hash: ${sourceHash}`);

    if (deployedHash === sourceHash) {
      console.log('\nVerification: SUCCESS');
      console.log('Source code matches deployed contract');
      return true;
    } else {
      console.log('\nVerification: FAILED');
      console.log('Source code does not match deployed contract');
      return false;
    }
  }

  listDeployments() {
    console.log('\n=== Deployment History ===\n');

    if (this.deploymentHistory.length === 0) {
      console.log('No deployments found');
      return;
    }

    this.deploymentHistory.forEach((deployment, index) => {
      console.log(`[${index + 1}] ${deployment.contractAddress}`);
      console.log(`    Deployed: ${new Date(deployment.timestamp).toLocaleString()}`);
      console.log(`    Owner: ${deployment.owner}`);
      console.log(`    Gas Used: ${deployment.gasUsed}`);
      console.log(`    Source: ${deployment.contractPath}`);
      console.log();
    });
  }

  async getContractInfo(address) {
    const contract = await this.request('GET', `/api/contracts/${address}`);

    console.log('\n=== Contract Information ===');
    console.log(`Address: ${contract.address}`);
    console.log(`Owner: ${contract.owner}`);
    console.log(`Created: ${new Date(contract.timestamp).toLocaleString()}`);
    console.log(`Code Size: ${contract.code.length} bytes`);
    console.log(`Code Hash: ${crypto.createHash('sha256').update(contract.code).digest('hex')}`);

    // Check if in history
    const history = this.deploymentHistory.find(d => d.contractAddress === address);
    if (history) {
      console.log(`\nDeployment Info:`);
      console.log(`  Source: ${history.contractPath}`);
      console.log(`  Transaction: ${history.transactionId}`);
    }

    console.log();
    return contract;
  }

  displayHelp() {
    console.log(`
STRAT Deploy - Smart Contract Deployment Tool
==============================================

Usage: strat-deploy <command> [options]

COMMANDS:
  deploy <file> <owner> <key>     Deploy a smart contract
    --optimize                     Optimize contract code
    --yes                          Skip confirmation
    --receipt                      Save deployment receipt

  upgrade <addr> <file> <owner> <key>  Upgrade existing contract

  verify <addr> <source>          Verify contract source code

  info <address>                  Get contract information

  list                            List deployment history

  estimate <file>                 Estimate deployment gas

OPTIONS:
  --api-url <url>                Set API endpoint
  --network <name>               Set network (mainnet/testnet)

EXAMPLES:
  strat-deploy deploy MyToken.js 0xOwner... privateKey123
  strat-deploy deploy MyToken.js 0xOwner... key --optimize --receipt
  strat-deploy verify 0xContract... MyToken.js
  strat-deploy upgrade 0xOld... MyTokenV2.js 0xOwner... key
  strat-deploy list
`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    const deployer = new StratDeploy();
    deployer.displayHelp();
    process.exit(0);
  }

  const command = args[0];
  const deployer = new StratDeploy();

  try {
    switch (command) {
      case 'deploy':
        if (args.length < 4) {
          throw new Error('Usage: deploy <file> <owner> <privateKey>');
        }
        const options = {
          optimize: args.includes('--optimize'),
          yes: args.includes('--yes'),
          receipt: args.includes('--receipt')
        };
        await deployer.deployContract(args[1], args[2], args[3], options);
        break;

      case 'upgrade':
        if (args.length < 5) {
          throw new Error('Usage: upgrade <oldAddress> <file> <owner> <privateKey>');
        }
        await deployer.upgradeContract(args[1], args[2], args[3], args[4]);
        break;

      case 'verify':
        if (args.length < 3) {
          throw new Error('Usage: verify <address> <sourcePath>');
        }
        await deployer.verifyContract(args[1], args[2]);
        break;

      case 'info':
        if (args.length < 2) {
          throw new Error('Usage: info <address>');
        }
        await deployer.getContractInfo(args[1]);
        break;

      case 'list':
        deployer.listDeployments();
        break;

      case 'estimate':
        if (args.length < 2) {
          throw new Error('Usage: estimate <file>');
        }
        const code = fs.readFileSync(args[1], 'utf8');
        const gas = deployer.calculateGasEstimate(code);
        console.log(`\nEstimated Gas: ${gas}`);
        console.log(`Estimated Cost: ${gas * 0.00001} STRAT\n`);
        break;

      case 'help':
      case '--help':
      case '-h':
        deployer.displayHelp();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        deployer.displayHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error(`\nError: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = StratDeploy;
