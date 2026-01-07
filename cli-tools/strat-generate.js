#!/usr/bin/env node

/**
 * STRAT Generate - Code Generator
 * Scaffolding and code generation tool for smart contracts and dApps
 */

const fs = require('fs');
const path = require('path');

class StratGenerate {
  constructor() {
    this.templates = {
      erc20: this.generateERC20Template,
      erc721: this.generateERC721Template,
      governance: this.generateGovernanceTemplate,
      dapp: this.generateDappTemplate,
      wallet: this.generateWalletTemplate,
      test: this.generateTestTemplate
    };
  }

  generateERC20Template(name, symbol, supply) {
    return `/**
 * ${name} - ERC20 Token Contract
 * Symbol: ${symbol}
 * Initial Supply: ${supply}
 */

class ${name}Token {
  constructor() {
    this.name = '${name}';
    this.symbol = '${symbol}';
    this.decimals = 18;
    this.totalSupply = ${supply};
    this.balances = new Map();
    this.allowances = new Map();

    // Mint initial supply to contract owner
    this.balances.set(this.owner, this.totalSupply);
  }

  balanceOf(address) {
    return this.balances.get(address) || 0;
  }

  transfer(to, amount) {
    const from = this.caller;
    const balance = this.balanceOf(from);

    if (balance < amount) {
      throw new Error('Insufficient balance');
    }

    this.balances.set(from, balance - amount);
    this.balances.set(to, this.balanceOf(to) + amount);

    this.emit('Transfer', { from, to, amount });
    return true;
  }

  approve(spender, amount) {
    const owner = this.caller;
    const key = \`\${owner}:\${spender}\`;
    this.allowances.set(key, amount);

    this.emit('Approval', { owner, spender, amount });
    return true;
  }

  transferFrom(from, to, amount) {
    const spender = this.caller;
    const key = \`\${from}:\${spender}\`;
    const allowance = this.allowances.get(key) || 0;
    const balance = this.balanceOf(from);

    if (allowance < amount) {
      throw new Error('Allowance exceeded');
    }

    if (balance < amount) {
      throw new Error('Insufficient balance');
    }

    this.allowances.set(key, allowance - amount);
    this.balances.set(from, balance - amount);
    this.balances.set(to, this.balanceOf(to) + amount);

    this.emit('Transfer', { from, to, amount });
    return true;
  }

  allowance(owner, spender) {
    const key = \`\${owner}:\${spender}\`;
    return this.allowances.get(key) || 0;
  }

  mint(to, amount) {
    if (this.caller !== this.owner) {
      throw new Error('Only owner can mint');
    }

    this.totalSupply += amount;
    this.balances.set(to, this.balanceOf(to) + amount);

    this.emit('Transfer', { from: '0x0', to, amount });
    return true;
  }

  burn(amount) {
    const from = this.caller;
    const balance = this.balanceOf(from);

    if (balance < amount) {
      throw new Error('Insufficient balance');
    }

    this.balances.set(from, balance - amount);
    this.totalSupply -= amount;

    this.emit('Transfer', { from, to: '0x0', amount });
    return true;
  }
}

module.exports = ${name}Token;
`;
  }

  generateERC721Template(name, symbol) {
    return `/**
 * ${name} - ERC721 NFT Contract
 * Symbol: ${symbol}
 */

class ${name}NFT {
  constructor() {
    this.name = '${name}';
    this.symbol = '${symbol}';
    this.tokens = new Map();
    this.owners = new Map();
    this.balances = new Map();
    this.approvals = new Map();
    this.operatorApprovals = new Map();
    this.tokenCounter = 0;
  }

  balanceOf(owner) {
    if (!owner || owner === '0x0') {
      throw new Error('Invalid address');
    }
    return this.balances.get(owner) || 0;
  }

  ownerOf(tokenId) {
    const owner = this.owners.get(tokenId);
    if (!owner) {
      throw new Error('Token does not exist');
    }
    return owner;
  }

  mint(to, tokenURI) {
    if (this.caller !== this.owner) {
      throw new Error('Only owner can mint');
    }

    const tokenId = ++this.tokenCounter;
    this.tokens.set(tokenId, { tokenURI, metadata: {} });
    this.owners.set(tokenId, to);
    this.balances.set(to, this.balanceOf(to) + 1);

    this.emit('Transfer', { from: '0x0', to, tokenId });
    return tokenId;
  }

  transferFrom(from, to, tokenId) {
    const owner = this.ownerOf(tokenId);
    const caller = this.caller;

    if (owner !== from) {
      throw new Error('From address is not token owner');
    }

    const approved = this.approvals.get(tokenId);
    const operatorKey = \`\${owner}:\${caller}\`;
    const isOperator = this.operatorApprovals.get(operatorKey);

    if (caller !== owner && approved !== caller && !isOperator) {
      throw new Error('Not authorized');
    }

    // Clear approval
    this.approvals.delete(tokenId);

    // Transfer ownership
    this.owners.set(tokenId, to);
    this.balances.set(from, this.balanceOf(from) - 1);
    this.balances.set(to, this.balanceOf(to) + 1);

    this.emit('Transfer', { from, to, tokenId });
    return true;
  }

  approve(to, tokenId) {
    const owner = this.ownerOf(tokenId);
    if (this.caller !== owner) {
      throw new Error('Not token owner');
    }

    this.approvals.set(tokenId, to);
    this.emit('Approval', { owner, approved: to, tokenId });
    return true;
  }

  setApprovalForAll(operator, approved) {
    const owner = this.caller;
    const key = \`\${owner}:\${operator}\`;

    if (approved) {
      this.operatorApprovals.set(key, true);
    } else {
      this.operatorApprovals.delete(key);
    }

    this.emit('ApprovalForAll', { owner, operator, approved });
    return true;
  }

  getApproved(tokenId) {
    this.ownerOf(tokenId); // Check token exists
    return this.approvals.get(tokenId) || '0x0';
  }

  isApprovedForAll(owner, operator) {
    const key = \`\${owner}:\${operator}\`;
    return this.operatorApprovals.get(key) || false;
  }

  tokenURI(tokenId) {
    const token = this.tokens.get(tokenId);
    if (!token) {
      throw new Error('Token does not exist');
    }
    return token.tokenURI;
  }

  burn(tokenId) {
    const owner = this.ownerOf(tokenId);
    if (this.caller !== owner) {
      throw new Error('Not token owner');
    }

    this.tokens.delete(tokenId);
    this.owners.delete(tokenId);
    this.approvals.delete(tokenId);
    this.balances.set(owner, this.balanceOf(owner) - 1);

    this.emit('Transfer', { from: owner, to: '0x0', tokenId });
    return true;
  }
}

module.exports = ${name}NFT;
`;
  }

  generateGovernanceTemplate(name) {
    return `/**
 * ${name} - Governance Contract
 * Decentralized governance with voting and proposals
 */

class ${name}Governance {
  constructor() {
    this.name = '${name}';
    this.proposals = new Map();
    this.votes = new Map();
    this.proposalCounter = 0;
    this.votingPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days
    this.quorum = 0.1; // 10% participation required
  }

  createProposal(title, description, executable) {
    const proposalId = ++this.proposalCounter;
    const proposal = {
      id: proposalId,
      title,
      description,
      proposer: this.caller,
      executable,
      startTime: Date.now(),
      endTime: Date.now() + this.votingPeriod,
      votesFor: 0,
      votesAgainst: 0,
      executed: false,
      cancelled: false
    };

    this.proposals.set(proposalId, proposal);
    this.emit('ProposalCreated', { proposalId, title, proposer: this.caller });

    return proposalId;
  }

  vote(proposalId, support) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal does not exist');
    }

    if (Date.now() > proposal.endTime) {
      throw new Error('Voting period has ended');
    }

    if (proposal.cancelled) {
      throw new Error('Proposal is cancelled');
    }

    const voter = this.caller;
    const voteKey = \`\${proposalId}:\${voter}\`;

    if (this.votes.has(voteKey)) {
      throw new Error('Already voted');
    }

    // In production, would check voting power based on token balance
    const votingPower = 1;

    this.votes.set(voteKey, { support, power: votingPower });

    if (support) {
      proposal.votesFor += votingPower;
    } else {
      proposal.votesAgainst += votingPower;
    }

    this.emit('VoteCast', { proposalId, voter, support, power: votingPower });
    return true;
  }

  executeProposal(proposalId) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal does not exist');
    }

    if (Date.now() < proposal.endTime) {
      throw new Error('Voting period not ended');
    }

    if (proposal.executed) {
      throw new Error('Already executed');
    }

    if (proposal.cancelled) {
      throw new Error('Proposal is cancelled');
    }

    const totalVotes = proposal.votesFor + proposal.votesAgainst;
    const quorumReached = totalVotes >= this.quorum;
    const passed = proposal.votesFor > proposal.votesAgainst;

    if (!quorumReached || !passed) {
      throw new Error('Proposal did not pass');
    }

    proposal.executed = true;

    // Execute proposal action
    if (proposal.executable) {
      try {
        eval(proposal.executable);
      } catch (error) {
        throw new Error(\`Execution failed: \${error.message}\`);
      }
    }

    this.emit('ProposalExecuted', { proposalId });
    return true;
  }

  cancelProposal(proposalId) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal does not exist');
    }

    if (this.caller !== proposal.proposer && this.caller !== this.owner) {
      throw new Error('Not authorized');
    }

    if (proposal.executed) {
      throw new Error('Cannot cancel executed proposal');
    }

    proposal.cancelled = true;
    this.emit('ProposalCancelled', { proposalId });
    return true;
  }

  getProposal(proposalId) {
    return this.proposals.get(proposalId);
  }

  getVote(proposalId, voter) {
    const voteKey = \`\${proposalId}:\${voter}\`;
    return this.votes.get(voteKey);
  }
}

module.exports = ${name}Governance;
`;
  }

  generateDappTemplate(name) {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} - STRAT dApp</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #0a0e27; color: #fff; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    header { background: #1a1f3a; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
    h1 { color: #00d4ff; }
    .card { background: #1a1f3a; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
    button { background: #00d4ff; color: #0a0e27; border: none; padding: 10px 20px;
             border-radius: 5px; cursor: pointer; font-weight: bold; }
    button:hover { background: #00b8e6; }
    input { padding: 10px; border-radius: 5px; border: 1px solid #333; background: #0a0e27;
            color: #fff; width: 100%; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${name}</h1>
      <p>Connected: <span id="account">Not Connected</span></p>
    </header>

    <div class="card">
      <h2>Wallet</h2>
      <button onclick="connectWallet()">Connect Wallet</button>
      <p>Balance: <span id="balance">0</span> STRAT</p>
    </div>

    <div class="card">
      <h2>Contract Interaction</h2>
      <input type="text" id="contractAddress" placeholder="Contract Address">
      <button onclick="loadContract()">Load Contract</button>
      <div id="contractInfo"></div>
    </div>
  </div>

  <script src="strat-sdk.js"></script>
  <script src="app.js"></script>
</body>
</html>`;

    const jsContent = `// ${name} dApp JavaScript

const strat = new StratSDK({ apiUrl: 'http://localhost:3000' });

let currentAccount = null;

async function connectWallet() {
  try {
    // In production, would integrate with wallet
    const address = prompt('Enter your wallet address:');
    if (address) {
      currentAccount = address;
      document.getElementById('account').textContent = address;
      await updateBalance();
    }
  } catch (error) {
    console.error('Error connecting wallet:', error);
  }
}

async function updateBalance() {
  if (!currentAccount) return;

  try {
    const balance = await strat.getBalance(currentAccount);
    document.getElementById('balance').textContent = balance;
  } catch (error) {
    console.error('Error fetching balance:', error);
  }
}

async function loadContract() {
  const address = document.getElementById('contractAddress').value;
  if (!address) return;

  try {
    const contract = await strat.getContract(address);
    const infoDiv = document.getElementById('contractInfo');
    infoDiv.innerHTML = \`
      <p>Owner: \${contract.owner}</p>
      <p>Created: \${new Date(contract.timestamp).toLocaleString()}</p>
    \`;
  } catch (error) {
    console.error('Error loading contract:', error);
  }
}

// Auto-update balance every 10 seconds
setInterval(updateBalance, 10000);
`;

    return { html: htmlContent, js: jsContent };
  }

  generateWalletTemplate(name) {
    return `/**
 * ${name} - Wallet Implementation
 */

const crypto = require('crypto');
const elliptic = require('elliptic');
const ec = new elliptic.ec('secp256k1');

class ${name}Wallet {
  constructor(privateKey = null) {
    if (privateKey) {
      this.keyPair = ec.keyFromPrivate(privateKey, 'hex');
    } else {
      this.keyPair = ec.genKeyPair();
    }

    this.privateKey = this.keyPair.getPrivate('hex');
    this.publicKey = this.keyPair.getPublic('hex');
    this.address = this.generateAddress();
  }

  generateAddress() {
    const publicKeyHash = crypto
      .createHash('sha256')
      .update(this.publicKey)
      .digest('hex');

    return '0x' + publicKeyHash.substring(0, 40);
  }

  sign(message) {
    const msgHash = crypto.createHash('sha256').update(message).digest('hex');
    const signature = this.keyPair.sign(msgHash);
    return signature.toDER('hex');
  }

  static verify(message, signature, publicKey) {
    try {
      const key = ec.keyFromPublic(publicKey, 'hex');
      const msgHash = crypto.createHash('sha256').update(message).digest('hex');
      return key.verify(msgHash, signature);
    } catch (error) {
      return false;
    }
  }

  export() {
    return {
      address: this.address,
      publicKey: this.publicKey,
      privateKey: this.privateKey
    };
  }

  static import(privateKey) {
    return new ${name}Wallet(privateKey);
  }
}

module.exports = ${name}Wallet;
`;
  }

  generateTestTemplate(contractName) {
    return `/**
 * Test file for ${contractName}
 */

describe('${contractName} Contract Tests', () => {
  let contract;
  let mockBlockchain;

  beforeAll(() => {
    console.log('Setting up test environment...');
  });

  beforeEach(() => {
    mockBlockchain = this.mockBlockchain;
    // Setup fresh contract for each test
  });

  it('should deploy contract successfully', () => {
    expect(contract).toHaveProperty('address');
    expect(contract.address).toBeTruthy();
  });

  it('should have correct initial state', () => {
    // Test initial state
    expect(contract).toHaveProperty('owner');
  });

  it('should allow authorized operations', () => {
    // Test authorized operations
    const result = true; // Replace with actual test
    expect(result).toBeTruthy();
  });

  it('should reject unauthorized operations', () => {
    // Test access control
    const unauthorized = () => {
      // Attempt unauthorized action
    };
    expect(unauthorized).toThrow();
  });

  afterEach(() => {
    // Cleanup after each test
  });

  afterAll(() => {
    console.log('Test suite completed');
  });
});
`;
  }

  async generate(type, options) {
    console.log(`\n=== Generating ${type} ===\n`);

    if (!this.templates[type]) {
      throw new Error(`Unknown template type: ${type}`);
    }

    const result = this.templates[type].call(this, ...options);

    if (type === 'dapp') {
      // Create dApp structure
      const projectName = options[0];
      const projectDir = path.join(process.cwd(), projectName);

      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
      }

      fs.writeFileSync(path.join(projectDir, 'index.html'), result.html);
      fs.writeFileSync(path.join(projectDir, 'app.js'), result.js);

      console.log(`dApp created at: ${projectDir}`);
      console.log('Files created:');
      console.log('  - index.html');
      console.log('  - app.js');
    } else {
      // Write single file
      const fileName = options[0];
      const filePath = path.join(process.cwd(), `${fileName}.js`);

      fs.writeFileSync(filePath, result);
      console.log(`Generated: ${filePath}`);
    }

    console.log('\nGeneration complete!\n');
  }

  displayHelp() {
    console.log(`
STRAT Generate - Code Generator
================================

Usage: strat-generate <type> [options]

TYPES:
  erc20 <name> <symbol> <supply>    Generate ERC20 token contract
  erc721 <name> <symbol>            Generate ERC721 NFT contract
  governance <name>                 Generate governance contract
  dapp <name>                       Generate dApp boilerplate
  wallet <name>                     Generate wallet implementation
  test <contractName>               Generate test template

EXAMPLES:
  strat-generate erc20 MyToken MTK 1000000
  strat-generate erc721 MyNFT MNFT
  strat-generate governance DAOGovernance
  strat-generate dapp MyDapp
  strat-generate wallet MyWallet
  strat-generate test MyToken
`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const generator = new StratGenerate();

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    generator.displayHelp();
    process.exit(0);
  }

  const type = args[0];
  const options = args.slice(1);

  try {
    await generator.generate(type, options);
  } catch (error) {
    console.error(`\nError: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = StratGenerate;
