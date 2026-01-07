/**
 * Transaction Builder Utility
 * Comprehensive transaction construction and signing
 */

const crypto = require('crypto');

class TransactionBuilder {
  constructor() {
    this.transaction = {
      inputs: [],
      outputs: [],
      data: null,
      type: 'standard',
      timestamp: Date.now(),
      fee: 0
    };
  }

  // Transaction Type Methods

  standard() {
    this.transaction.type = 'standard';
    return this;
  }

  contractDeploy() {
    this.transaction.type = 'contract_deploy';
    return this;
  }

  contractCall() {
    this.transaction.type = 'contract_call';
    return this;
  }

  // Input/Output Management

  addInput(previousTx, index, amount, signature) {
    this.transaction.inputs.push({
      previousTx,
      index,
      amount,
      signature: signature || null
    });
    return this;
  }

  addOutput(address, amount) {
    if (!address || address === '0x0') {
      throw new Error('Invalid output address');
    }

    if (amount <= 0) {
      throw new Error('Output amount must be positive');
    }

    this.transaction.outputs.push({
      address,
      amount
    });
    return this;
  }

  setData(data) {
    this.transaction.data = data;
    return this;
  }

  setFee(fee) {
    if (fee < 0) {
      throw new Error('Fee cannot be negative');
    }
    this.transaction.fee = fee;
    return this;
  }

  setTimestamp(timestamp) {
    this.transaction.timestamp = timestamp;
    return this;
  }

  // Validation

  validate() {
    const errors = [];

    if (this.transaction.inputs.length === 0) {
      errors.push('Transaction must have at least one input');
    }

    if (this.transaction.outputs.length === 0) {
      errors.push('Transaction must have at least one output');
    }

    // Validate amounts
    const inputTotal = this.transaction.inputs.reduce((sum, input) => sum + input.amount, 0);
    const outputTotal = this.transaction.outputs.reduce((sum, output) => sum + output.amount, 0);

    if (inputTotal < outputTotal + this.transaction.fee) {
      errors.push('Insufficient input amount to cover outputs and fee');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Transaction Hash

  calculateHash() {
    const data = JSON.stringify({
      inputs: this.transaction.inputs,
      outputs: this.transaction.outputs,
      data: this.transaction.data,
      type: this.transaction.type,
      timestamp: this.transaction.timestamp
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Build Methods

  build() {
    const validation = this.validate();

    if (!validation.valid) {
      throw new Error(`Transaction validation failed: ${validation.errors.join(', ')}`);
    }

    return {
      ...this.transaction,
      id: this.calculateHash()
    };
  }

  buildUnsigned() {
    return { ...this.transaction };
  }

  // Signing

  sign(privateKey, inputIndex = null) {
    const txHash = this.calculateHash();

    if (inputIndex !== null) {
      // Sign specific input
      if (!this.transaction.inputs[inputIndex]) {
        throw new Error('Input index out of bounds');
      }

      const signature = crypto.createHash('sha256')
        .update(txHash + privateKey)
        .digest('hex');

      this.transaction.inputs[inputIndex].signature = signature;
    } else {
      // Sign all inputs
      const signature = crypto.createHash('sha256')
        .update(txHash + privateKey)
        .digest('hex');

      this.transaction.inputs.forEach(input => {
        input.signature = signature;
      });
    }

    return this;
  }

  // Helper Methods

  static fromJSON(json) {
    const builder = new TransactionBuilder();
    builder.transaction = JSON.parse(json);
    return builder;
  }

  toJSON() {
    return JSON.stringify(this.transaction, null, 2);
  }

  reset() {
    this.transaction = {
      inputs: [],
      outputs: [],
      data: null,
      type: 'standard',
      timestamp: Date.now(),
      fee: 0
    };
    return this;
  }

  clone() {
    const builder = new TransactionBuilder();
    builder.transaction = JSON.parse(JSON.stringify(this.transaction));
    return builder;
  }

  // Convenience Methods

  static createTransfer(from, to, amount, utxos, privateKey, fee = 1) {
    const builder = new TransactionBuilder();

    let totalInput = 0;
    const needed = amount + fee;

    // Select UTXOs
    for (const utxo of utxos) {
      if (totalInput >= needed) break;

      builder.addInput(utxo.txId, utxo.index, utxo.amount);
      totalInput += utxo.amount;
    }

    if (totalInput < needed) {
      throw new Error('Insufficient UTXOs');
    }

    // Add output to recipient
    builder.addOutput(to, amount);

    // Add change output if necessary
    const change = totalInput - needed;
    if (change > 0) {
      builder.addOutput(from, change);
    }

    builder.setFee(fee);
    builder.sign(privateKey);

    return builder.build();
  }

  static createContractDeploy(owner, code, privateKey, fee = 10) {
    const builder = new TransactionBuilder();

    return builder
      .contractDeploy()
      .setData({ code, owner })
      .setFee(fee)
      .sign(privateKey)
      .build();
  }

  static createContractCall(caller, contractAddress, method, params, privateKey, fee = 5) {
    const builder = new TransactionBuilder();

    return builder
      .contractCall()
      .setData({ contractAddress, method, params, caller })
      .setFee(fee)
      .sign(privateKey)
      .build();
  }
}

module.exports = TransactionBuilder;
