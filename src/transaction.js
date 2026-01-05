const CryptoUtils = require('./crypto');

class TransactionInput {
  constructor(txHash, outputIndex, signature = '') {
    this.txHash = txHash;
    this.outputIndex = outputIndex;
    this.signature = signature;
  }
}

class TransactionOutput {
  constructor(address, amount) {
    this.address = address;
    this.amount = amount;
  }
}

class Transaction {
  constructor(inputs = [], outputs = []) {
    this.inputs = inputs;
    this.outputs = outputs;
    this.timestamp = Date.now();
    this.hash = this.calculateHash();
  }

  calculateHash() {
    try {
      if (!Array.isArray(this.inputs)) {
        console.error('Transaction inputs is not an array:', this.inputs);
        throw new Error('Transaction inputs must be an array');
      }
      if (!Array.isArray(this.outputs)) {
        console.error('Transaction outputs is not an array:', this.outputs);
        throw new Error('Transaction outputs must be an array');
      }

      const data = {
        inputs: this.inputs.map(input => {
          if (!input || typeof input !== 'object') {
            throw new Error('Invalid input object');
          }
          return { txHash: input.txHash, outputIndex: input.outputIndex };
        }),
        outputs: this.outputs,
        timestamp: this.timestamp
      };
      return CryptoUtils.hash(data);
    } catch (error) {
      console.error('calculateHash error:', error.message);
      console.error('Inputs:', this.inputs);
      console.error('Outputs:', this.outputs);
      throw error;
    }
  }

  signInput(inputIndex, privateKey) {
    if (inputIndex >= this.inputs.length) {
      throw new Error('Input index out of bounds');
    }

    const dataToSign = this.calculateHash();
    const signature = CryptoUtils.signData(dataToSign, privateKey);
    this.inputs[inputIndex].signature = signature;
  }

  verifySignature(inputIndex, publicKey) {
    if (inputIndex >= this.inputs.length) {
      return false;
    }

    const dataToSign = this.calculateHash();
    const signature = this.inputs[inputIndex].signature;
    return CryptoUtils.verifySignature(dataToSign, signature, publicKey);
  }

  static createCoinbaseTx(minerAddress, blockHeight, reward) {
    const coinbaseInput = new TransactionInput('0'.repeat(64), -1);
    const output = new TransactionOutput(minerAddress, reward);
    const tx = new Transaction([coinbaseInput], [output]);
    tx.isCoinbase = true;
    tx.blockHeight = blockHeight;
    return tx;
  }

  static createContractDeployTx(fromAddress, contractCode, gasLimit, gasPrice) {
    const output = new TransactionOutput('CONTRACT', 0);
    const tx = new Transaction([], [output]);
    tx.contractCode = contractCode;
    tx.gasLimit = gasLimit;
    tx.gasPrice = gasPrice;
    tx.from = fromAddress;
    tx.isContractDeploy = true;
    return tx;
  }

  static createContractCallTx(fromAddress, contractAddress, methodName, params, gasLimit, gasPrice) {
    const tx = new Transaction([], []);
    tx.from = fromAddress;
    tx.contractAddress = contractAddress;
    tx.methodName = methodName;
    tx.params = params;
    tx.gasLimit = gasLimit;
    tx.gasPrice = gasPrice;
    tx.isContractCall = true;
    return tx;
  }
}

module.exports = { Transaction, TransactionInput, TransactionOutput };
