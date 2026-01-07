/**
 * STRAT JavaScript SDK
 * Complete API wrapper for STRAT blockchain
 * @version 1.0.0
 */

const axios = require('axios');
const EventEmitter = require('events');

class StratSDK extends EventEmitter {
  constructor(config = {}) {
    super();
    this.apiUrl = config.apiUrl || 'http://localhost:3000';
    this.wsUrl = config.wsUrl || 'ws://localhost:3000';
    this.apiKey = config.apiKey || null;
    this.timeout = config.timeout || 30000;
    this.ws = null;
  }

  // HTTP Request Handler
  async request(method, endpoint, data = null, options = {}) {
    try {
      const config = {
        method,
        url: `${this.apiUrl}${endpoint}`,
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        }
      };

      if (data) {
        if (method === 'GET') {
          config.params = data;
        } else {
          config.data = data;
        }
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      return new Error(`API Error (${error.response.status}): ${error.response.data.error || error.response.statusText}`);
    } else if (error.request) {
      return new Error(`Network Error: Could not connect to ${this.apiUrl}`);
    } else {
      return new Error(`Error: ${error.message}`);
    }
  }

  // Blockchain Methods
  async getBlockchainInfo() {
    return await this.request('GET', '/api/blockchain/info');
  }

  async getBlock(identifier) {
    const endpoint = isNaN(identifier)
      ? `/api/blockchain/block/${identifier}`
      : `/api/blockchain/block-by-index/${identifier}`;
    return await this.request('GET', endpoint);
  }

  async getLatestBlocks(count = 10) {
    return await this.request('GET', '/api/blockchain/blocks', { limit: count });
  }

  async getBlockByHash(hash) {
    return await this.request('GET', `/api/blockchain/block/${hash}`);
  }

  async getBlockByIndex(index) {
    return await this.request('GET', `/api/blockchain/block-by-index/${index}`);
  }

  // Transaction Methods
  async getTransaction(txId) {
    return await this.request('GET', `/api/transactions/${txId}`);
  }

  async sendTransaction(fromAddress, toAddress, amount, privateKey) {
    return await this.request('POST', '/api/transactions/send', {
      fromAddress,
      toAddress,
      amount,
      privateKey
    });
  }

  async getTransactionHistory(address, options = {}) {
    return await this.request('GET', `/api/transactions/history/${address}`, options);
  }

  async getPendingTransactions() {
    return await this.request('GET', '/api/transactions/pending');
  }

  // Wallet Methods
  async createWallet(username, password) {
    return await this.request('POST', '/api/auth/register', { username, password });
  }

  async getBalance(address) {
    const result = await this.request('GET', `/api/wallets/balance/${address}`);
    return result.balance;
  }

  async getWalletInfo(address) {
    return await this.request('GET', `/api/wallets/${address}`);
  }

  async getUTXOs(address) {
    return await this.request('GET', `/api/wallets/utxos/${address}`);
  }

  // Smart Contract Methods
  async deployContract(code, owner, privateKey) {
    return await this.request('POST', '/api/contracts/deploy', {
      code,
      owner,
      privateKey
    });
  }

  async callContract(contractAddress, method, params, caller, privateKey) {
    return await this.request('POST', '/api/contracts/call', {
      contractAddress,
      method,
      params,
      caller,
      privateKey
    });
  }

  async getContract(contractAddress) {
    return await this.request('GET', `/api/contracts/${contractAddress}`);
  }

  async getContractState(contractAddress) {
    return await this.request('GET', `/api/contracts/${contractAddress}/state`);
  }

  async listContracts(options = {}) {
    return await this.request('GET', '/api/contracts', options);
  }

  // Mining Methods
  async getMiningInfo() {
    return await this.request('GET', '/api/mining/info');
  }

  async startMining(minerAddress) {
    return await this.request('POST', '/api/mining/start', { minerAddress });
  }

  async stopMining() {
    return await this.request('POST', '/api/mining/stop');
  }

  async getMiningStats(address) {
    return await this.request('GET', `/api/mining/stats/${address}`);
  }

  // Mempool Methods
  async getMempoolInfo() {
    return await this.request('GET', '/api/mempool/stats');
  }

  async getMempoolTransactions() {
    return await this.request('GET', '/api/mempool/transactions');
  }

  // Staking Methods
  async stake(address, amount, privateKey) {
    return await this.request('POST', '/api/staking/stake', {
      address,
      amount,
      privateKey
    });
  }

  async unstake(address, amount, privateKey) {
    return await this.request('POST', '/api/staking/unstake', {
      address,
      amount,
      privateKey
    });
  }

  async getStakingInfo(address) {
    return await this.request('GET', `/api/staking/info/${address}`);
  }

  async claimRewards(address, privateKey) {
    return await this.request('POST', '/api/staking/claim', {
      address,
      privateKey
    });
  }

  // NFT Methods
  async mintNFT(data) {
    return await this.request('POST', '/api/nft/mint', data);
  }

  async getNFT(tokenId) {
    return await this.request('GET', `/api/nft/${tokenId}`);
  }

  async transferNFT(tokenId, from, to, privateKey) {
    return await this.request('POST', '/api/nft/transfer', {
      tokenId,
      from,
      to,
      privateKey
    });
  }

  async listNFTs(owner) {
    return await this.request('GET', `/api/nft/list/${owner}`);
  }

  // Social/Governance Methods
  async createProposal(data) {
    return await this.request('POST', '/api/governance/proposal', data);
  }

  async vote(proposalId, vote, voter, privateKey) {
    return await this.request('POST', '/api/governance/vote', {
      proposalId,
      vote,
      voter,
      privateKey
    });
  }

  async getProposal(proposalId) {
    return await this.request('GET', `/api/governance/proposal/${proposalId}`);
  }

  async listProposals(options = {}) {
    return await this.request('GET', '/api/governance/proposals', options);
  }

  // Explorer Methods
  async searchAddress(address) {
    return await this.request('GET', `/api/explorer/address/${address}`);
  }

  async getRichList(limit = 100) {
    return await this.request('GET', '/api/explorer/richlist', { limit });
  }

  async getNetworkStats() {
    return await this.request('GET', '/api/explorer/stats');
  }

  // WebSocket Methods
  connectWebSocket() {
    if (typeof window !== 'undefined' && window.io) {
      // Browser environment
      this.ws = window.io(this.wsUrl);
    } else {
      // Node.js environment
      const io = require('socket.io-client');
      this.ws = io(this.wsUrl);
    }

    this.ws.on('connect', () => {
      this.emit('connected');
    });

    this.ws.on('disconnect', () => {
      this.emit('disconnected');
    });

    this.ws.on('stats', (data) => {
      this.emit('stats', data);
    });

    this.ws.on('new_block', (block) => {
      this.emit('newBlock', block);
    });

    this.ws.on('new_transaction', (tx) => {
      this.emit('newTransaction', tx);
    });

    this.ws.on('mempool_stats', (stats) => {
      this.emit('mempoolStats', stats);
    });

    this.ws.on('address_balance', (data) => {
      this.emit('balanceUpdate', data);
    });

    return this.ws;
  }

  subscribeToAddress(address) {
    if (!this.ws) throw new Error('WebSocket not connected');
    this.ws.emit('subscribe_address', address);
  }

  unsubscribeFromAddress(address) {
    if (!this.ws) throw new Error('WebSocket not connected');
    this.ws.emit('unsubscribe_address', address);
  }

  subscribeToBlocks() {
    if (!this.ws) throw new Error('WebSocket not connected');
    this.ws.emit('subscribe_blocks');
  }

  unsubscribeFromBlocks() {
    if (!this.ws) throw new Error('WebSocket not connected');
    this.ws.emit('unsubscribe_blocks');
  }

  subscribeToMempool() {
    if (!this.ws) throw new Error('WebSocket not connected');
    this.ws.emit('subscribe_mempool');
  }

  unsubscribeFromMempool() {
    if (!this.ws) throw new Error('WebSocket not connected');
    this.ws.emit('unsubscribe_mempool');
  }

  disconnectWebSocket() {
    if (this.ws) {
      this.ws.disconnect();
      this.ws = null;
    }
  }

  // Utility Methods
  async healthCheck() {
    return await this.request('GET', '/health');
  }

  async getAPIVersion() {
    return await this.request('GET', '/api');
  }

  // Batch Operations
  async batchRequest(requests) {
    const promises = requests.map(req =>
      this.request(req.method, req.endpoint, req.data)
    );

    return await Promise.allSettled(promises);
  }

  // Transaction Builder Helper
  buildTransaction(from, to, amount) {
    return {
      fromAddress: from,
      toAddress: to,
      amount: parseFloat(amount),
      timestamp: Date.now()
    };
  }

  // Address Validation
  isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  // Amount Conversion
  toWei(amount) {
    return amount * 1e18;
  }

  fromWei(amount) {
    return amount / 1e18;
  }
}

// Browser and Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StratSDK;
}

if (typeof window !== 'undefined') {
  window.StratSDK = StratSDK;
}
