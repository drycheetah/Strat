const Wallet = require('../models/Wallet');
const HDWallet = require('../src/hdwallet');
const { Transaction, TransactionInput, TransactionOutput } = require('../src/transaction');
const CryptoUtils = require('../src/crypto');
const logger = require('../utils/logger');

/**
 * Create and send transaction
 */
const sendTransaction = async (req, res) => {
  try {
    const { fromWalletId, toAddress, amount, fee } = req.body;
    const blockchain = req.blockchain;

    logger.info(`Send transaction request: fromWalletId=${fromWalletId}, toAddress=${toAddress}, amount=${amount}`);

    // Get sender wallet
    const wallet = await Wallet.findOne({
      _id: fromWalletId,
      user: req.user._id
    });

    logger.info(`Wallet found: ${wallet ? wallet.address : 'NOT FOUND'}`);

    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    // Extract private key - check if it's in simplified format first
    let privateKey;
    if (wallet.encryptedPrivateKey.includes(':::')) {
      // Simplified format: privateKey:::
      privateKey = wallet.encryptedPrivateKey.split(':::')[0];
      logger.info('Using simplified private key format');
    } else {
      // Encrypted format - try to decrypt with username as password
      try {
        privateKey = wallet.decryptPrivateKey(req.user.username);
      } catch (error) {
        logger.error(`Failed to decrypt private key: ${error.message}`);
        return res.status(500).json({
          error: 'Wallet decryption failed',
          message: 'Unable to access wallet private key'
        });
      }
    }

    // Get UTXOs for this wallet
    const utxos = blockchain.getUTXOsForAddress(wallet.address);
    if (utxos.length === 0) {
      return res.status(400).json({
        error: 'No funds available',
        message: 'This wallet has no spendable outputs'
      });
    }

    // Calculate required amount (including fee)
    const txFee = fee || blockchain.transactionFee;
    const requiredAmount = amount + txFee;

    // Select UTXOs
    let inputSum = 0;
    const inputs = [];

    for (let utxo of utxos) {
      inputs.push(new TransactionInput(utxo.txHash, utxo.outputIndex));
      inputSum += utxo.amount;

      if (inputSum >= requiredAmount) {
        break;
      }
    }

    if (inputSum < requiredAmount) {
      return res.status(400).json({
        error: 'Insufficient funds',
        message: `Required: ${requiredAmount} STRAT, Available: ${inputSum} STRAT`,
        balance: inputSum,
        required: requiredAmount
      });
    }

    // Create outputs
    const outputs = [new TransactionOutput(toAddress, amount)];

    // Add change output if necessary
    const change = inputSum - amount - txFee;
    if (change > 0) {
      outputs.push(new TransactionOutput(wallet.address, change));
    }

    // Get public key from private key for validation
    const publicKey = CryptoUtils.getPublicKeyFromPrivate(privateKey);

    // Create transaction
    logger.info(`Creating transaction with ${inputs.length} inputs and ${outputs.length} outputs`);
    logger.info(`Inputs: ${JSON.stringify(inputs.map(i => ({ txHash: i.txHash, outputIndex: i.outputIndex })))}`);
    logger.info(`Outputs: ${JSON.stringify(outputs.map(o => ({ address: o.address, amount: o.amount })))}`);

    const transaction = new Transaction(inputs, outputs);
    transaction.publicKey = publicKey; // Store public key for validation

    logger.info(`Transaction created with hash: ${transaction.hash}`);

    // Sign all inputs
    for (let i = 0; i < inputs.length; i++) {
      transaction.signInput(i, privateKey);
    }

    // Validate transaction
    if (!blockchain.isValidTransaction(transaction)) {
      return res.status(400).json({
        error: 'Invalid transaction',
        message: 'Transaction failed validation'
      });
    }

    // Add to mempool
    blockchain.addTransaction(transaction);

    // Broadcast to P2P network
    if (req.p2pServer) {
      req.p2pServer.broadcastNewTransaction(transaction);
    }

    // Emit WebSocket event
    if (req.io) {
      req.io.emit('new_transaction', {
        hash: transaction.hash,
        from: wallet.address,
        to: toAddress,
        amount,
        fee: txFee
      });
    }

    logger.info(`Transaction created: ${transaction.hash} from ${wallet.address} to ${toAddress}, amount: ${amount}`);

    res.json({
      success: true,
      message: 'Transaction created and added to mempool',
      transaction: {
        hash: transaction.hash,
        from: wallet.address,
        to: toAddress,
        amount,
        fee: txFee,
        change,
        inputs: inputs.length,
        outputs: outputs.length,
        status: 'pending'
      }
    });
  } catch (error) {
    logger.error(`Send transaction error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to create transaction',
      message: error.message
    });
  }
};

/**
 * Estimate transaction fee
 */
const estimateFee = async (req, res) => {
  try {
    const { fromWalletId, amount } = req.body;
    const blockchain = req.blockchain;

    const wallet = await Wallet.findOne({
      _id: fromWalletId,
      user: req.user._id
    });

    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    const utxos = blockchain.getUTXOsForAddress(wallet.address);

    // Calculate how many inputs needed
    let inputSum = 0;
    let inputCount = 0;

    for (let utxo of utxos) {
      inputSum += utxo.amount;
      inputCount++;

      if (inputSum >= amount + blockchain.transactionFee) {
        break;
      }
    }

    const baseFee = blockchain.transactionFee;
    const estimatedFee = baseFee; // Could add size-based fee here

    res.json({
      success: true,
      fee: estimatedFee,
      baseFee,
      inputsRequired: inputCount,
      totalAvailable: inputSum
    });
  } catch (error) {
    logger.error(`Estimate fee error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to estimate fee',
      message: error.message
    });
  }
};

/**
 * Get mempool status
 */
const getMempoolStatus = async (req, res) => {
  try {
    const blockchain = req.blockchain;
    const pendingTxs = blockchain.pendingTransactions;

    // Calculate total fees in mempool
    let totalFees = 0;
    let totalValue = 0;

    for (let tx of pendingTxs) {
      if (!tx.isCoinbase && !tx.isContractDeploy && !tx.isContractCall) {
        const inputSum = blockchain.calculateInputSum(tx);
        const outputSum = blockchain.calculateOutputSum(tx);
        totalFees += (inputSum - outputSum);
        totalValue += outputSum;
      }
    }

    res.json({
      success: true,
      mempool: {
        transactionCount: pendingTxs.length,
        totalFees,
        totalValue,
        transactions: pendingTxs.map(tx => ({
          hash: tx.hash,
          timestamp: tx.timestamp,
          isCoinbase: tx.isCoinbase,
          isContractDeploy: tx.isContractDeploy,
          isContractCall: tx.isContractCall,
          inputCount: tx.inputs?.length || 0,
          outputCount: tx.outputs?.length || 0
        }))
      }
    });
  } catch (error) {
    logger.error(`Get mempool error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get mempool status',
      message: error.message
    });
  }
};

/**
 * Get transaction details (from mempool or blockchain)
 */
const getTransactionDetails = async (req, res) => {
  try {
    const { hash } = req.params;
    const blockchain = req.blockchain;

    // Check mempool first
    const pendingTx = blockchain.pendingTransactions.find(tx => tx.hash === hash);
    if (pendingTx) {
      return res.json({
        success: true,
        transaction: pendingTx,
        status: 'pending',
        confirmations: 0
      });
    }

    // Check blockchain (handled by blockchainController)
    // This is a passthrough
    req.params.hash = hash;
    return res.status(404).json({
      error: 'Transaction not found',
      message: 'Transaction not in mempool. Check blockchain.'
    });
  } catch (error) {
    logger.error(`Get transaction details error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get transaction details',
      message: error.message
    });
  }
};

/**
 * Batch send transactions
 */
const batchSend = async (req, res) => {
  try {
    const { fromWalletId, recipients, password } = req.body;
    const blockchain = req.blockchain;

    // Validate recipients array
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        error: 'Invalid recipients',
        message: 'Recipients must be a non-empty array'
      });
    }

    if (recipients.length > 100) {
      return res.status(400).json({
        error: 'Too many recipients',
        message: 'Maximum 100 recipients per batch'
      });
    }

    const wallet = await Wallet.findOne({
      _id: fromWalletId,
      user: req.user._id
    });

    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    // Verify password
    const user = await req.user.populate('password');
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid password'
      });
    }

    const privateKey = wallet.decryptPrivateKey(password);
    const utxos = blockchain.getUTXOsForAddress(wallet.address);

    // Calculate total amount needed
    const totalAmount = recipients.reduce((sum, r) => sum + r.amount, 0);
    const txFee = blockchain.transactionFee;
    const requiredAmount = totalAmount + txFee;

    // Select UTXOs
    let inputSum = 0;
    const inputs = [];

    for (let utxo of utxos) {
      inputs.push(new TransactionInput(utxo.txHash, utxo.outputIndex));
      inputSum += utxo.amount;

      if (inputSum >= requiredAmount) {
        break;
      }
    }

    if (inputSum < requiredAmount) {
      return res.status(400).json({
        error: 'Insufficient funds',
        balance: inputSum,
        required: requiredAmount
      });
    }

    // Create outputs for all recipients
    const outputs = recipients.map(r => new TransactionOutput(r.address, r.amount));

    // Add change
    const change = inputSum - totalAmount - txFee;
    if (change > 0) {
      outputs.push(new TransactionOutput(wallet.address, change));
    }

    // Create and sign transaction
    const transaction = new Transaction(inputs, outputs);
    for (let i = 0; i < inputs.length; i++) {
      transaction.signInput(i, privateKey);
    }

    if (!blockchain.isValidTransaction(transaction)) {
      return res.status(400).json({
        error: 'Invalid transaction'
      });
    }

    blockchain.addTransaction(transaction);

    if (req.p2pServer) {
      req.p2pServer.broadcastNewTransaction(transaction);
    }

    if (req.io) {
      req.io.emit('new_transaction', {
        hash: transaction.hash,
        from: wallet.address,
        recipients: recipients.length,
        totalAmount
      });
    }

    logger.info(`Batch transaction created: ${transaction.hash}, recipients: ${recipients.length}, total: ${totalAmount}`);

    res.json({
      success: true,
      message: 'Batch transaction created',
      transaction: {
        hash: transaction.hash,
        from: wallet.address,
        recipientCount: recipients.length,
        totalAmount,
        fee: txFee,
        change
      }
    });
  } catch (error) {
    logger.error(`Batch send error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to create batch transaction',
      message: error.message
    });
  }
};

module.exports = {
  sendTransaction,
  estimateFee,
  getMempoolStatus,
  getTransactionDetails,
  batchSend
};
