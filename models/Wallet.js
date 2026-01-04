const mongoose = require('mongoose');
const crypto = require('crypto');
const CryptoUtils = require('../src/crypto');

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  address: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  publicKey: {
    type: String,
    required: true
  },
  encryptedPrivateKey: {
    type: String,
    required: true
  },
  name: {
    type: String,
    default: 'Main Wallet'
  },
  type: {
    type: String,
    enum: ['standard', 'hd', 'multisig'],
    default: 'hd'
  },
  derivationPath: {
    type: String
  },
  encryptedMnemonic: {
    type: String
  },
  isBackedUp: {
    type: Boolean,
    default: false
  },
  multisigConfig: {
    requiredSignatures: Number,
    totalSigners: Number,
    signers: [{
      address: String,
      publicKey: String
    }]
  },
  balance: {
    type: Number,
    default: 0
  },
  lastBalanceUpdate: Date,
  transactionCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Encrypt private key before saving
walletSchema.methods.encryptPrivateKey = function(privateKey, password) {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(password, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
};

// Decrypt private key
walletSchema.methods.decryptPrivateKey = function(password) {
  try {
    const parts = this.encryptedPrivateKey.split(':');
    const encrypted = parts[0];
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');

    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(password, 'salt', 32);
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Invalid password');
  }
};

// Update balance (called periodically)
walletSchema.methods.updateBalance = async function(blockchain) {
  this.balance = blockchain.getBalance(this.address);
  this.lastBalanceUpdate = Date.now();
  await this.save();
  return this.balance;
};

// Get transaction history
walletSchema.methods.getTransactionHistory = function(blockchain) {
  const transactions = [];

  for (let block of blockchain.chain) {
    for (let tx of block.transactions) {
      let isRelevant = false;
      let type = null;
      let amount = 0;

      if (tx.isCoinbase && tx.outputs[0].address === this.address) {
        isRelevant = true;
        type = 'mining_reward';
        amount = tx.outputs[0].amount;
      } else if (!tx.isCoinbase && !tx.isContractDeploy && !tx.isContractCall) {
        // Check inputs (sent from this wallet)
        for (let input of tx.inputs) {
          const utxoKey = `${input.txHash}:${input.outputIndex}`;
          const utxo = blockchain.utxos.get(utxoKey) ||
                       this.findHistoricalUTXO(input.txHash, input.outputIndex, blockchain);

          if (utxo && utxo.address === this.address) {
            isRelevant = true;
            type = 'sent';
            amount -= utxo.amount;
          }
        }

        // Check outputs (received to this wallet)
        for (let output of tx.outputs) {
          if (output.address === this.address) {
            isRelevant = true;
            if (type !== 'sent') type = 'received';
            amount += output.amount;
          }
        }
      }

      if (isRelevant) {
        transactions.push({
          hash: tx.hash,
          type,
          amount,
          timestamp: block.timestamp,
          blockIndex: block.index,
          confirmations: blockchain.chain.length - block.index
        });
      }
    }
  }

  return transactions.reverse();
};

walletSchema.methods.findHistoricalUTXO = function(txHash, outputIndex, blockchain) {
  for (let block of blockchain.chain) {
    for (let tx of block.transactions) {
      if (tx.hash === txHash && tx.outputs[outputIndex]) {
        return {
          txHash: tx.hash,
          outputIndex: outputIndex,
          address: tx.outputs[outputIndex].address,
          amount: tx.outputs[outputIndex].amount
        };
      }
    }
  }
  return null;
};

// Create indexes
walletSchema.index({ user: 1, createdAt: -1 });
walletSchema.index({ address: 1 }, { unique: true });

module.exports = mongoose.model('Wallet', walletSchema);
