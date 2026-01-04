const Block = require('./block');
const { Transaction } = require('./transaction');
const CryptoUtils = require('./crypto');

class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 4;
    this.miningReward = 50;
    this.transactionFee = 0.01;
    this.pendingTransactions = [];
    this.utxos = new Map();
    this.contracts = new Map();
    this.blockTime = 10000;
    this.difficultyAdjustmentInterval = 10;

    this.initializeGenesisUTXO();
  }

  createGenesisBlock() {
    const genesisTx = Transaction.createCoinbaseTx('GENESIS', 0, 1000000);
    const block = new Block(0, [genesisTx], '0');
    block.hash = block.calculateHash();
    return block;
  }

  initializeGenesisUTXO() {
    const genesisBlock = this.chain[0];
    const genesisTx = genesisBlock.transactions[0];
    const utxoKey = `${genesisTx.hash}:0`;
    this.utxos.set(utxoKey, {
      txHash: genesisTx.hash,
      outputIndex: 0,
      address: 'GENESIS',
      amount: 1000000
    });
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  minePendingTransactions(minerAddress) {
    const rewardTx = Transaction.createCoinbaseTx(
      minerAddress,
      this.chain.length,
      this.miningReward
    );

    let totalFees = 0;
    for (let tx of this.pendingTransactions) {
      if (!tx.isCoinbase && !tx.isContractDeploy && !tx.isContractCall) {
        const inputSum = this.calculateInputSum(tx);
        const outputSum = this.calculateOutputSum(tx);
        totalFees += inputSum - outputSum;
      }
    }

    if (totalFees > 0) {
      rewardTx.outputs[0].amount += totalFees;
    }

    const transactionsToMine = [rewardTx, ...this.pendingTransactions];

    const block = new Block(
      this.chain.length,
      transactionsToMine,
      this.getLatestBlock().hash
    );

    block.mineBlock(this.difficulty);
    this.chain.push(block);

    this.updateUTXOs(block);

    this.pendingTransactions = [];

    this.adjustDifficulty();

    return block;
  }

  adjustDifficulty() {
    if (this.chain.length % this.difficultyAdjustmentInterval !== 0) {
      return;
    }

    const latestBlock = this.getLatestBlock();
    const prevAdjustmentBlock = this.chain[this.chain.length - this.difficultyAdjustmentInterval];

    const timeExpected = this.blockTime * this.difficultyAdjustmentInterval;
    const timeTaken = latestBlock.timestamp - prevAdjustmentBlock.timestamp;

    if (timeTaken < timeExpected / 2) {
      this.difficulty++;
      console.log(`Difficulty increased to ${this.difficulty}`);
    } else if (timeTaken > timeExpected * 2) {
      this.difficulty = Math.max(1, this.difficulty - 1);
      console.log(`Difficulty decreased to ${this.difficulty}`);
    }
  }

  updateUTXOs(block) {
    for (let tx of block.transactions) {
      if (!tx.isCoinbase) {
        for (let input of tx.inputs) {
          const utxoKey = `${input.txHash}:${input.outputIndex}`;
          this.utxos.delete(utxoKey);
        }
      }

      tx.outputs.forEach((output, index) => {
        if (output.address !== 'CONTRACT') {
          const utxoKey = `${tx.hash}:${index}`;
          this.utxos.set(utxoKey, {
            txHash: tx.hash,
            outputIndex: index,
            address: output.address,
            amount: output.amount
          });
        }
      });

      if (tx.isContractDeploy) {
        this.deployContract(tx);
      } else if (tx.isContractCall) {
        this.executeContract(tx);
      }
    }
  }

  addTransaction(transaction) {
    if (!transaction.inputs && !transaction.outputs) {
      throw new Error('Transaction must include inputs and outputs');
    }

    if (!this.isValidTransaction(transaction)) {
      throw new Error('Cannot add invalid transaction');
    }

    this.pendingTransactions.push(transaction);
  }

  isValidTransaction(transaction) {
    if (transaction.isCoinbase) return true;

    if (transaction.isContractDeploy || transaction.isContractCall) {
      return true;
    }

    const inputSum = this.calculateInputSum(transaction);
    const outputSum = this.calculateOutputSum(transaction);

    if (inputSum < outputSum + this.transactionFee) {
      console.log('Invalid transaction: Insufficient funds');
      return false;
    }

    for (let i = 0; i < transaction.inputs.length; i++) {
      const input = transaction.inputs[i];
      const utxoKey = `${input.txHash}:${input.outputIndex}`;
      const utxo = this.utxos.get(utxoKey);

      if (!utxo) {
        console.log('Invalid transaction: UTXO not found');
        return false;
      }

      const publicKey = CryptoUtils.getPublicKeyFromPrivate(input.signature);
      const address = CryptoUtils.publicKeyToAddress(publicKey);

      if (address !== utxo.address) {
        console.log('Invalid transaction: Signature does not match UTXO owner');
        return false;
      }

      if (!transaction.verifySignature(i, publicKey)) {
        console.log('Invalid transaction: Invalid signature');
        return false;
      }
    }

    return true;
  }

  calculateInputSum(transaction) {
    let sum = 0;
    for (let input of transaction.inputs) {
      const utxoKey = `${input.txHash}:${input.outputIndex}`;
      const utxo = this.utxos.get(utxoKey);
      if (utxo) {
        sum += utxo.amount;
      }
    }
    return sum;
  }

  calculateOutputSum(transaction) {
    return transaction.outputs.reduce((sum, output) => sum + output.amount, 0);
  }

  getBalance(address) {
    let balance = 0;
    for (let [key, utxo] of this.utxos) {
      if (utxo.address === address) {
        balance += utxo.amount;
      }
    }
    return balance;
  }

  getUTXOsForAddress(address) {
    const addressUTXOs = [];
    for (let [key, utxo] of this.utxos) {
      if (utxo.address === address) {
        addressUTXOs.push(utxo);
      }
    }
    return addressUTXOs;
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }

      if (!currentBlock.hash.startsWith('0'.repeat(currentBlock.difficulty))) {
        return false;
      }
    }
    return true;
  }

  deployContract(transaction) {
    const contractAddress = CryptoUtils.hash({
      code: transaction.contractCode,
      deployer: transaction.from,
      timestamp: transaction.timestamp
    });

    this.contracts.set(contractAddress, {
      code: transaction.contractCode,
      deployer: transaction.from,
      state: {},
      balance: 0
    });

    console.log(`Contract deployed at: ${contractAddress}`);
    return contractAddress;
  }

  executeContract(transaction) {
    const contract = this.contracts.get(transaction.contractAddress);
    if (!contract) {
      throw new Error('Contract not found');
    }

    try {
      const contractFunction = new Function('state', 'params', 'caller', contract.code);
      const result = contractFunction(contract.state, transaction.params, transaction.from);

      console.log(`Contract executed: ${transaction.contractAddress}`);
      console.log(`Result:`, result);

      return result;
    } catch (error) {
      console.error('Contract execution error:', error.message);
      throw error;
    }
  }

  getContract(contractAddress) {
    return this.contracts.get(contractAddress);
  }
}

module.exports = Blockchain;
