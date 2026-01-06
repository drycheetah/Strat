#!/usr/bin/env node

/**
 * STRAT Standalone Miner
 *
 * A command-line mining tool for the STRAT blockchain.
 * Users can run this independently to mine STRAT tokens.
 *
 * Usage:
 *   node strat-miner.js --address YOUR_WALLET_ADDRESS --api http://localhost:3000
 *
 * Or install globally:
 *   npm install -g
 *   strat-miner --address YOUR_WALLET_ADDRESS
 */

const https = require('https');
const http = require('http');
const crypto = require('crypto');

// Configuration
const args = process.argv.slice(2);
let API_URL = 'https://strat-production.up.railway.app';
let WALLET_ADDRESS = '';
let THREADS = 1;
let POLL_INTERVAL = 2000; // Check for new blocks every 2 seconds

// Parse command line arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--address' || args[i] === '-a') {
    WALLET_ADDRESS = args[i + 1];
    i++;
  } else if (args[i] === '--api' || args[i] === '-u') {
    API_URL = args[i + 1];
    i++;
  } else if (args[i] === '--threads' || args[i] === '-t') {
    THREADS = parseInt(args[i + 1]) || 1;
    i++;
  } else if (args[i] === '--help' || args[i] === '-h') {
    showHelp();
    process.exit(0);
  }
}

function showHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║              STRAT STANDALONE MINER v1.0                  ║
╚═══════════════════════════════════════════════════════════╝

Usage:
  node strat-miner.js [options]

Options:
  -a, --address <address>    Your STRAT wallet address (required)
  -u, --api <url>           API endpoint (default: http://localhost:3000)
  -t, --threads <number>    Number of mining threads (default: 1)
  -h, --help                Show this help message

Examples:
  node strat-miner.js --address STRATxxx123 --api https://api.strat.io
  node strat-miner.js -a STRATxxx123 -t 4

Mining Stats:
  - Hashrate: Calculated from successful hashes per second
  - Difficulty: Current blockchain mining difficulty
  - Blocks Found: Number of blocks successfully mined
  - Earnings: Total STRAT tokens earned from mining

Press Ctrl+C to stop mining.
`);
}

if (!WALLET_ADDRESS) {
  console.error('❌ Error: Wallet address required!');
  console.log('Use: node strat-miner.js --address YOUR_WALLET_ADDRESS');
  console.log('Or: node strat-miner.js --help for more options');
  process.exit(1);
}

// Mining Statistics
let stats = {
  hashrate: 0,
  totalHashes: 0,
  blocksFound: 0,
  totalEarnings: 0,
  startTime: Date.now(),
  lastBlockTime: null,
  difficulty: 4,
  currentBlock: 0
};

// Hash calculation tracking
let hashesThisSecond = 0;
let lastHashUpdate = Date.now();

// Update hashrate every second
setInterval(() => {
  const now = Date.now();
  const elapsed = (now - lastHashUpdate) / 1000;
  stats.hashrate = Math.floor(hashesThisSecond / elapsed);
  hashesThisSecond = 0;
  lastHashUpdate = now;
  updateDisplay();
}, 1000);

// Mining state
let currentMiningBlock = null;
let isMining = false;

// Make HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = protocol.request(requestOptions, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return makeRequest(res.headers.location, options).then(resolve).catch(reject);
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Get current blockchain stats
async function getBlockchainStats() {
  try {
    const data = await makeRequest(`${API_URL}/api/blockchain/stats`);
    if (data && data.stats) {
      stats.difficulty = data.stats.difficulty || 4;
      stats.currentBlock = data.stats.blockHeight || 0;
    }
  } catch (error) {
    // Silently fail, will retry
  }
}

// Calculate SHA-256 hash
function calculateHash(index, timestamp, transactions, previousHash, nonce, difficulty, merkleRoot) {
  const data = index + timestamp + JSON.stringify(transactions) + previousHash + nonce + difficulty + merkleRoot;
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Check if hash meets difficulty requirement
function hashMeetsDifficulty(hash, difficulty) {
  const prefix = '0'.repeat(difficulty);
  return hash.startsWith(prefix);
}

// Mine a single block (simplified version of blockchain mining)
async function mineBlock() {
  if (isMining || !currentMiningBlock) return;

  isMining = true;
  const block = currentMiningBlock;
  let nonce = Math.floor(Math.random() * 1000000);
  const maxIterations = 10000; // Check for new blocks periodically

  for (let i = 0; i < maxIterations; i++) {
    nonce++;
    hashesThisSecond++;
    stats.totalHashes++;

    const hash = calculateHash(
      block.index,
      block.timestamp,
      block.transactions || [],
      block.previousHash,
      nonce,
      block.difficulty,
      block.merkleRoot || ''
    );

    if (hashMeetsDifficulty(hash, block.difficulty)) {
      // Found a valid block!
      await submitBlock(block, nonce, hash);
      stats.blocksFound++;
      stats.lastBlockTime = Date.now();
      break;
    }
  }

  isMining = false;
}

// Submit mined block to the blockchain
async function submitBlock(block, nonce, hash) {
  try {
    const result = await makeRequest(`${API_URL}/api/mining/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        minerAddress: WALLET_ADDRESS,
        nonce,
        hash,
        block: {
          index: block.index,
          timestamp: block.timestamp,
          transactions: block.transactions,
          previousHash: block.previousHash,
          difficulty: block.difficulty,
          merkleRoot: block.merkleRoot,
          miner: block.miner
        }
      }
    });

    if (result && result.success) {
      console.log(`\n✅ BLOCK FOUND! #${stats.currentBlock + 1}`);
      console.log(`   Hash: ${hash.substring(0, 16)}...`);
      console.log(`   Reward: ${result.reward || 1} STRAT`);
      stats.totalEarnings += (result.reward || 1);
      stats.currentBlock++;
    } else if (result && result.error) {
      // Handle specific errors
      if (result.error === 'Block already mined' || result.error === 'Stale block') {
        // Another miner beat us - this is normal in competitive mining, just get new work
        if (result.currentBlock) {
          stats.currentBlock = result.currentBlock;
        }
      } else {
        console.log(`\n⚠️  Block rejected: ${result.message || result.error}`);
      }
    }
  } catch (error) {
    console.log(`\n❌ Failed to submit block: ${error.message || 'Unknown error'}`);
  }
}

// Get mining work from the blockchain
async function getMiningWork() {
  try {
    const data = await makeRequest(`${API_URL}/api/mining/work?address=${WALLET_ADDRESS}`);

    if (data && data.block) {
      currentMiningBlock = {
        index: data.block.index || 0,
        timestamp: data.block.timestamp || Date.now(),
        transactions: data.block.transactions || [],
        previousHash: data.block.previousHash || '0',
        difficulty: data.block.difficulty || 4,
        merkleRoot: data.block.merkleRoot || '',
        miner: data.block.miner || WALLET_ADDRESS
      };
      stats.difficulty = currentMiningBlock.difficulty;
    }
  } catch (error) {
    // Silently handle errors - will retry on next poll
  }
}

// Display mining statistics
function updateDisplay() {
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;

  const avgBlockTime = stats.blocksFound > 0
    ? Math.floor((Date.now() - stats.startTime) / stats.blocksFound / 1000)
    : 0;

  process.stdout.write('\x1Bc'); // Clear console

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║              STRAT MINER - RUNNING                        ║
╚═══════════════════════════════════════════════════════════╝

📊 Mining Statistics:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Hashrate:        ${stats.hashrate.toLocaleString()} H/s
  Total Hashes:    ${stats.totalHashes.toLocaleString()}

  Blocks Found:    ${stats.blocksFound}
  Current Block:   #${stats.currentBlock}
  Difficulty:      ${'0'.repeat(stats.difficulty)} (${stats.difficulty} leading zeros)

  Total Earned:    ${stats.totalEarnings.toFixed(2)} STRAT
  Avg Block Time:  ${avgBlockTime}s

  Uptime:          ${hours}h ${minutes}m ${seconds}s
  Threads:         ${THREADS}

⛏️  Mining to:      ${WALLET_ADDRESS.substring(0, 20)}...
🌐 Connected to:   ${API_URL}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: ${isMining ? '⚡ MINING...' : '🔄 Fetching work...'}

Press Ctrl+C to stop mining
`);
}

// Main mining loop
async function startMining() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║              STRAT MINER STARTING                         ║
╚═══════════════════════════════════════════════════════════╝

Wallet:     ${WALLET_ADDRESS}
API:        ${API_URL}
Threads:    ${THREADS}

Initializing connection...
`);

  // Get initial blockchain stats
  await getBlockchainStats();

  console.log('✅ Connected to STRAT blockchain');
  console.log('⛏️  Starting mining...\n');

  // Update display initially
  updateDisplay();

  // Main mining loop
  setInterval(async () => {
    await getMiningWork();

    // Start mining threads
    for (let i = 0; i < THREADS; i++) {
      mineBlock().catch(err => {
        console.error(`Mining error: ${err.message}`);
      });
    }
  }, POLL_INTERVAL);

  // Update stats periodically
  setInterval(getBlockchainStats, 10000);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`

╔═══════════════════════════════════════════════════════════╗
║              MINING STOPPED                               ║
╚═══════════════════════════════════════════════════════════╝

Final Statistics:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Blocks Mined:    ${stats.blocksFound}
  Total Earned:    ${stats.totalEarnings.toFixed(2)} STRAT
  Total Hashes:    ${stats.totalHashes.toLocaleString()}
  Average Rate:    ${Math.floor(stats.totalHashes / ((Date.now() - stats.startTime) / 1000))} H/s

Thank you for supporting the STRAT network! 🚀

`);
  process.exit(0);
});

// Start mining
startMining().catch(error => {
  console.error(`\n❌ Fatal error: ${error.message}`);
  process.exit(1);
});
