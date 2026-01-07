#!/usr/bin/env node

/**
 * STRAT CLI - Blockchain Interaction Tool
 * Provides command-line interface for interacting with STRAT blockchain
 */

const axios = require('axios');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

class StratCLI {
  constructor(config = {}) {
    this.apiUrl = config.apiUrl || process.env.STRAT_API_URL || 'http://localhost:3000';
    this.configPath = path.join(process.env.HOME || process.env.USERPROFILE, '.strat', 'config.json');
    this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        this.apiUrl = config.apiUrl || this.apiUrl;
        this.defaultAddress = config.defaultAddress;
      }
    } catch (error) {
      console.error('Warning: Could not load config:', error.message);
    }
  }

  saveConfig(config) {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
      console.log('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving config:', error.message);
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

  // Blockchain commands
  async getBlockchainInfo() {
    const data = await this.request('GET', '/api/blockchain/info');
    console.log('\n=== Blockchain Information ===');
    console.log(`Height: ${data.height}`);
    console.log(`Difficulty: ${data.difficulty}`);
    console.log(`Total Supply: ${data.totalSupply} STRAT`);
    console.log(`Latest Block: ${data.latestBlock.hash}`);
    console.log(`Timestamp: ${new Date(data.latestBlock.timestamp).toLocaleString()}\n`);
    return data;
  }

  async getBlock(identifier) {
    const endpoint = isNaN(identifier)
      ? `/api/blockchain/block/${identifier}`
      : `/api/blockchain/block-by-index/${identifier}`;

    const block = await this.request('GET', endpoint);
    console.log('\n=== Block Information ===');
    console.log(`Index: ${block.index}`);
    console.log(`Hash: ${block.hash}`);
    console.log(`Previous Hash: ${block.previousHash}`);
    console.log(`Timestamp: ${new Date(block.timestamp).toLocaleString()}`);
    console.log(`Nonce: ${block.nonce}`);
    console.log(`Difficulty: ${block.difficulty}`);
    console.log(`Transactions: ${block.transactions.length}`);
    console.log(`Merkle Root: ${block.merkleRoot}\n`);
    return block;
  }

  async getBalance(address) {
    const data = await this.request('GET', `/api/wallets/balance/${address}`);
    console.log(`\nBalance for ${address}: ${data.balance} STRAT\n`);
    return data.balance;
  }

  async getTransaction(txId) {
    const tx = await this.request('GET', `/api/transactions/${txId}`);
    console.log('\n=== Transaction Information ===');
    console.log(`ID: ${tx.id}`);
    console.log(`Block: ${tx.blockIndex || 'Pending'}`);
    console.log(`Timestamp: ${new Date(tx.timestamp).toLocaleString()}`);
    console.log(`Type: ${tx.type || 'Standard'}`);
    console.log('\nInputs:');
    tx.inputs.forEach((input, i) => {
      console.log(`  [${i}] ${input.previousTx}:${input.index} - ${input.amount} STRAT`);
    });
    console.log('\nOutputs:');
    tx.outputs.forEach((output, i) => {
      console.log(`  [${i}] ${output.address} - ${output.amount} STRAT`);
    });
    console.log();
    return tx;
  }

  async sendTransaction(from, to, amount, privateKey) {
    const txData = {
      fromAddress: from,
      toAddress: to,
      amount: parseFloat(amount),
      privateKey
    };

    const result = await this.request('POST', '/api/transactions/send', txData);
    console.log('\n=== Transaction Sent ===');
    console.log(`Transaction ID: ${result.transactionId}`);
    console.log(`Status: ${result.status}`);
    console.log(`From: ${from}`);
    console.log(`To: ${to}`);
    console.log(`Amount: ${amount} STRAT\n`);
    return result;
  }

  // Wallet commands
  async createWallet(username, password) {
    const data = await this.request('POST', '/api/auth/register', { username, password });
    console.log('\n=== Wallet Created ===');
    console.log(`Address: ${data.address}`);
    console.log(`Public Key: ${data.publicKey}`);
    console.log('\nWARNING: Save your private key securely!');
    console.log(`Private Key: ${data.privateKey}\n`);
    return data;
  }

  async getWalletInfo(address) {
    const data = await this.request('GET', `/api/wallets/${address}`);
    console.log('\n=== Wallet Information ===');
    console.log(`Address: ${data.address}`);
    console.log(`Balance: ${data.balance} STRAT`);
    console.log(`Transaction Count: ${data.transactionCount || 0}\n`);
    return data;
  }

  // Mining commands
  async getMiningInfo() {
    const data = await this.request('GET', '/api/mining/info');
    console.log('\n=== Mining Information ===');
    console.log(`Difficulty: ${data.difficulty}`);
    console.log(`Block Reward: ${data.blockReward} STRAT`);
    console.log(`Network Hashrate: ${data.networkHashrate || 'N/A'}`);
    console.log(`Pending Transactions: ${data.pendingTransactions}\n`);
    return data;
  }

  async startMining(minerAddress) {
    const data = await this.request('POST', '/api/mining/start', { minerAddress });
    console.log('\n=== Mining Started ===');
    console.log(`Miner Address: ${minerAddress}`);
    console.log(`Status: ${data.status}\n`);
    return data;
  }

  // Smart Contract commands
  async deployContract(code, owner, privateKey) {
    const contractData = { code, owner, privateKey };
    const result = await this.request('POST', '/api/contracts/deploy', contractData);
    console.log('\n=== Contract Deployed ===');
    console.log(`Contract Address: ${result.contractAddress}`);
    console.log(`Transaction ID: ${result.transactionId}\n`);
    return result;
  }

  async callContract(contractAddress, method, params, caller, privateKey) {
    const callData = { contractAddress, method, params, caller, privateKey };
    const result = await this.request('POST', '/api/contracts/call', callData);
    console.log('\n=== Contract Call Result ===');
    console.log(`Result: ${JSON.stringify(result.result, null, 2)}\n`);
    return result;
  }

  async getContract(contractAddress) {
    const contract = await this.request('GET', `/api/contracts/${contractAddress}`);
    console.log('\n=== Contract Information ===');
    console.log(`Address: ${contract.address}`);
    console.log(`Owner: ${contract.owner}`);
    console.log(`Created: ${new Date(contract.timestamp).toLocaleString()}`);
    console.log(`Code:\n${contract.code}\n`);
    return contract;
  }

  // Mempool commands
  async getMempoolInfo() {
    const data = await this.request('GET', '/api/mempool/stats');
    console.log('\n=== Mempool Information ===');
    console.log(`Transactions: ${data.transactionCount}`);
    console.log(`Size: ${data.size} bytes`);
    console.log(`Utilization: ${data.utilization}%`);
    console.log(`Average Fee: ${data.avgFee} STRAT\n`);
    return data;
  }

  // Config commands
  async configure(apiUrl, defaultAddress) {
    const config = {};
    if (apiUrl) config.apiUrl = apiUrl;
    if (defaultAddress) config.defaultAddress = defaultAddress;

    this.saveConfig(config);
    this.apiUrl = apiUrl || this.apiUrl;
    this.defaultAddress = defaultAddress || this.defaultAddress;
  }

  displayHelp() {
    console.log(`
STRAT CLI - Blockchain Interaction Tool
========================================

Usage: strat-cli <command> [options]

BLOCKCHAIN COMMANDS:
  info                          Get blockchain information
  block <hash|index>           Get block by hash or index
  transaction <txid>           Get transaction details

WALLET COMMANDS:
  wallet create <user> <pass>  Create a new wallet
  wallet info <address>        Get wallet information
  balance <address>            Get address balance
  send <from> <to> <amount>    Send transaction

MINING COMMANDS:
  mining info                  Get mining information
  mining start <address>       Start mining

CONTRACT COMMANDS:
  contract deploy <file>       Deploy smart contract
  contract call <addr> <method> Call contract method
  contract info <address>      Get contract information

MEMPOOL COMMANDS:
  mempool                      Get mempool information

CONFIGURATION:
  config set <key> <value>     Set configuration value
  config show                  Show current configuration

EXAMPLES:
  strat-cli info
  strat-cli balance 0x1234...
  strat-cli send 0xFrom... 0xTo... 100
  strat-cli contract deploy ./MyContract.js
`);
  }
}

// CLI Entry Point
async function main() {
  const args = process.argv.slice(2);
  const cli = new StratCLI();

  if (args.length === 0) {
    cli.displayHelp();
    process.exit(0);
  }

  const command = args[0];
  const subCommand = args[1];

  try {
    switch (command) {
      case 'info':
        await cli.getBlockchainInfo();
        break;

      case 'block':
        if (!subCommand) throw new Error('Block hash or index required');
        await cli.getBlock(subCommand);
        break;

      case 'transaction':
      case 'tx':
        if (!subCommand) throw new Error('Transaction ID required');
        await cli.getTransaction(subCommand);
        break;

      case 'balance':
        if (!subCommand) throw new Error('Address required');
        await cli.getBalance(subCommand);
        break;

      case 'wallet':
        if (subCommand === 'create') {
          if (!args[2] || !args[3]) throw new Error('Username and password required');
          await cli.createWallet(args[2], args[3]);
        } else if (subCommand === 'info') {
          if (!args[2]) throw new Error('Address required');
          await cli.getWalletInfo(args[2]);
        } else {
          throw new Error('Unknown wallet command');
        }
        break;

      case 'send':
        if (args.length < 4) throw new Error('Usage: send <from> <to> <amount> [privateKey]');
        await cli.sendTransaction(args[1], args[2], args[3], args[4]);
        break;

      case 'mining':
        if (subCommand === 'info') {
          await cli.getMiningInfo();
        } else if (subCommand === 'start') {
          if (!args[2]) throw new Error('Miner address required');
          await cli.startMining(args[2]);
        } else {
          throw new Error('Unknown mining command');
        }
        break;

      case 'contract':
        if (subCommand === 'deploy') {
          if (!args[2]) throw new Error('Contract file required');
          const code = fs.readFileSync(args[2], 'utf8');
          await cli.deployContract(code, args[3], args[4]);
        } else if (subCommand === 'call') {
          await cli.callContract(args[2], args[3], JSON.parse(args[4] || '[]'), args[5], args[6]);
        } else if (subCommand === 'info') {
          if (!args[2]) throw new Error('Contract address required');
          await cli.getContract(args[2]);
        } else {
          throw new Error('Unknown contract command');
        }
        break;

      case 'mempool':
        await cli.getMempoolInfo();
        break;

      case 'config':
        if (subCommand === 'set') {
          if (args[2] === 'apiUrl') {
            await cli.configure(args[3], null);
          } else if (args[2] === 'defaultAddress') {
            await cli.configure(null, args[3]);
          }
        } else if (subCommand === 'show') {
          console.log('\nCurrent Configuration:');
          console.log(`API URL: ${cli.apiUrl}`);
          console.log(`Default Address: ${cli.defaultAddress || 'Not set'}\n`);
        }
        break;

      case 'help':
      case '--help':
      case '-h':
        cli.displayHelp();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        cli.displayHelp();
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

module.exports = StratCLI;
