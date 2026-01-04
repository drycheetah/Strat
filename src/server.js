const express = require('express');
const path = require('path');

class HTTPServer {
  constructor(blockchain, wallet, p2pServer, port) {
    this.blockchain = blockchain;
    this.wallet = wallet;
    this.p2pServer = p2pServer;
    this.port = port;
    this.app = express();

    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '..', 'public')));
  }

  setupRoutes() {
    this.app.get('/api/blocks', (req, res) => {
      res.json(this.blockchain.chain);
    });

    this.app.get('/api/blocks/:index', (req, res) => {
      const index = parseInt(req.params.index);
      if (index >= 0 && index < this.blockchain.chain.length) {
        res.json(this.blockchain.chain[index]);
      } else {
        res.status(404).json({ error: 'Block not found' });
      }
    });

    this.app.post('/api/mine', (req, res) => {
      const block = this.blockchain.minePendingTransactions(this.wallet.address);
      this.p2pServer.broadcastNewBlock(block);
      res.json({
        message: 'Block mined successfully',
        block: block
      });
    });

    this.app.post('/api/transaction', (req, res) => {
      try {
        const { to, amount } = req.body;
        const transaction = this.wallet.createTransaction(to, parseFloat(amount), this.blockchain);
        this.blockchain.addTransaction(transaction);
        this.p2pServer.broadcastNewTransaction(transaction);
        res.json({
          message: 'Transaction added successfully',
          transaction: transaction
        });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.get('/api/balance/:address?', (req, res) => {
      const address = req.params.address || this.wallet.address;
      const balance = this.blockchain.getBalance(address);
      res.json({ address, balance });
    });

    this.app.get('/api/wallet', (req, res) => {
      res.json({
        address: this.wallet.address,
        publicKey: this.wallet.publicKey,
        balance: this.wallet.getBalance(this.blockchain)
      });
    });

    this.app.get('/api/pending', (req, res) => {
      res.json(this.blockchain.pendingTransactions);
    });

    this.app.get('/api/peers', (req, res) => {
      res.json(this.p2pServer.getPeers());
    });

    this.app.post('/api/peers', (req, res) => {
      const { peer } = req.body;
      this.p2pServer.connectToPeer(peer);
      res.json({ message: 'Connecting to peer', peer });
    });

    this.app.post('/api/contract/deploy', (req, res) => {
      try {
        const { code, gasLimit, gasPrice } = req.body;
        const tx = this.wallet.deployContract(code, gasLimit || 100000, gasPrice || 1, this.blockchain);
        this.blockchain.addTransaction(tx);
        res.json({
          message: 'Contract deployment transaction created',
          transaction: tx
        });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.post('/api/contract/call', (req, res) => {
      try {
        const { contractAddress, methodName, params, gasLimit, gasPrice } = req.body;
        const tx = this.wallet.callContract(
          contractAddress,
          methodName,
          params,
          gasLimit || 100000,
          gasPrice || 1,
          this.blockchain
        );
        this.blockchain.addTransaction(tx);
        res.json({
          message: 'Contract call transaction created',
          transaction: tx
        });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.get('/api/contract/:address', (req, res) => {
      const contract = this.blockchain.getContract(req.params.address);
      if (contract) {
        res.json(contract);
      } else {
        res.status(404).json({ error: 'Contract not found' });
      }
    });

    this.app.get('/api/stats', (req, res) => {
      res.json({
        blockHeight: this.blockchain.chain.length,
        difficulty: this.blockchain.difficulty,
        miningReward: this.blockchain.miningReward,
        transactionFee: this.blockchain.transactionFee,
        pendingTransactions: this.blockchain.pendingTransactions.length,
        totalSupply: this.calculateTotalSupply(),
        hashRate: this.estimateHashRate()
      });
    });
  }

  calculateTotalSupply() {
    let total = 0;
    for (let [key, utxo] of this.blockchain.utxos) {
      total += utxo.amount;
    }
    return total;
  }

  estimateHashRate() {
    if (this.blockchain.chain.length < 2) return 0;

    const latestBlock = this.blockchain.getLatestBlock();
    const previousBlock = this.blockchain.chain[this.blockchain.chain.length - 2];

    const timeDiff = (latestBlock.timestamp - previousBlock.timestamp) / 1000;
    if (timeDiff === 0) return 0;

    return Math.round(latestBlock.nonce / timeDiff);
  }

  listen() {
    this.app.listen(this.port, () => {
      console.log(`HTTP server listening on port ${this.port}`);
      console.log(`Dashboard: http://localhost:${this.port}`);
    });
  }
}

module.exports = HTTPServer;
