const CryptoUtils = require('./crypto');
const { Transaction, TransactionInput, TransactionOutput } = require('./transaction');
const fs = require('fs');
const path = require('path');

class Wallet {
  constructor(privateKey = null) {
    if (privateKey) {
      this.privateKey = privateKey;
      this.publicKey = CryptoUtils.getPublicKeyFromPrivate(privateKey);
    } else {
      const keyPair = CryptoUtils.generateKeyPair();
      this.privateKey = keyPair.privateKey;
      this.publicKey = keyPair.publicKey;
    }
    this.address = CryptoUtils.publicKeyToAddress(this.publicKey);
  }

  createTransaction(toAddress, amount, blockchain) {
    const utxos = blockchain.getUTXOsForAddress(this.address);
    let inputSum = 0;
    const inputs = [];

    for (let utxo of utxos) {
      inputs.push(new TransactionInput(utxo.txHash, utxo.outputIndex));
      inputSum += utxo.amount;

      if (inputSum >= amount + blockchain.transactionFee) {
        break;
      }
    }

    if (inputSum < amount + blockchain.transactionFee) {
      throw new Error(`Insufficient funds. Available: ${inputSum}, Required: ${amount + blockchain.transactionFee}`);
    }

    const outputs = [new TransactionOutput(toAddress, amount)];

    const change = inputSum - amount - blockchain.transactionFee;
    if (change > 0) {
      outputs.push(new TransactionOutput(this.address, change));
    }

    const transaction = new Transaction(inputs, outputs);

    for (let i = 0; i < inputs.length; i++) {
      transaction.signInput(i, this.privateKey);
    }

    return transaction;
  }

  deployContract(contractCode, gasLimit, gasPrice, blockchain) {
    const tx = Transaction.createContractDeployTx(this.address, contractCode, gasLimit, gasPrice);
    tx.hash = tx.calculateHash();
    return tx;
  }

  callContract(contractAddress, methodName, params, gasLimit, gasPrice, blockchain) {
    const tx = Transaction.createContractCallTx(
      this.address,
      contractAddress,
      methodName,
      params,
      gasLimit,
      gasPrice
    );
    tx.hash = tx.calculateHash();
    return tx;
  }

  getBalance(blockchain) {
    return blockchain.getBalance(this.address);
  }

  save(filename) {
    const walletData = {
      privateKey: this.privateKey,
      publicKey: this.publicKey,
      address: this.address
    };

    const walletDir = path.join(process.cwd(), 'wallets');
    if (!fs.existsSync(walletDir)) {
      fs.mkdirSync(walletDir);
    }

    const filepath = path.join(walletDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(walletData, null, 2));
    console.log(`Wallet saved to ${filepath}`);
  }

  static load(filename) {
    const filepath = path.join(process.cwd(), 'wallets', filename);
    if (!fs.existsSync(filepath)) {
      throw new Error(`Wallet file not found: ${filepath}`);
    }

    const walletData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    return new Wallet(walletData.privateKey);
  }

  static listWallets() {
    const walletDir = path.join(process.cwd(), 'wallets');
    if (!fs.existsSync(walletDir)) {
      return [];
    }
    return fs.readdirSync(walletDir).filter(file => file.endsWith('.json'));
  }
}

module.exports = Wallet;
