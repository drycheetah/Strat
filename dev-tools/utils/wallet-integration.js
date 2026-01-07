/**
 * Wallet Integration Library
 * Comprehensive wallet management and integration utilities
 */

const crypto = require('crypto');
const elliptic = require('elliptic');
const ec = new elliptic.ec('secp256k1');

class WalletIntegration {
  constructor() {
    this.wallets = new Map();
  }

  // Wallet Creation

  createWallet(password = null) {
    const keyPair = ec.genKeyPair();
    const privateKey = keyPair.getPrivate('hex');
    const publicKey = keyPair.getPublic('hex');
    const address = this.deriveAddress(publicKey);

    const wallet = {
      address,
      publicKey,
      privateKey: password ? this.encryptPrivateKey(privateKey, password) : privateKey,
      encrypted: !!password,
      createdAt: Date.now()
    };

    this.wallets.set(address, wallet);

    return {
      address,
      publicKey,
      privateKey: password ? null : privateKey,
      mnemonic: this.generateMnemonic()
    };
  }

  importWallet(privateKey, password = null) {
    try {
      const keyPair = ec.keyFromPrivate(privateKey, 'hex');
      const publicKey = keyPair.getPublic('hex');
      const address = this.deriveAddress(publicKey);

      const wallet = {
        address,
        publicKey,
        privateKey: password ? this.encryptPrivateKey(privateKey, password) : privateKey,
        encrypted: !!password,
        importedAt: Date.now()
      };

      this.wallets.set(address, wallet);

      return { address, publicKey };
    } catch (error) {
      throw new Error('Invalid private key');
    }
  }

  importFromMnemonic(mnemonic, password = null) {
    // Simplified mnemonic import
    const seed = crypto.createHash('sha256').update(mnemonic).digest('hex');
    return this.importWallet(seed.substring(0, 64), password);
  }

  // Address Derivation

  deriveAddress(publicKey) {
    const hash = crypto.createHash('sha256').update(publicKey).digest('hex');
    return '0x' + hash.substring(0, 40);
  }

  // Encryption

  encryptPrivateKey(privateKey, password) {
    const cipher = crypto.createCipher('aes-256-cbc', password);
    let encrypted = cipher.update(privateKey, 'hex', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decryptPrivateKey(encryptedKey, password) {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', password);
      let decrypted = decipher.update(encryptedKey, 'hex', 'hex');
      decrypted += decipher.final('hex');
      return decrypted;
    } catch (error) {
      throw new Error('Invalid password');
    }
  }

  // Signing

  signTransaction(transaction, privateKey) {
    const txHash = this.hashTransaction(transaction);
    const keyPair = ec.keyFromPrivate(privateKey, 'hex');
    const signature = keyPair.sign(txHash);

    return {
      ...transaction,
      signature: signature.toDER('hex')
    };
  }

  signMessage(message, privateKey) {
    const msgHash = crypto.createHash('sha256').update(message).digest('hex');
    const keyPair = ec.keyFromPrivate(privateKey, 'hex');
    const signature = keyPair.sign(msgHash);

    return signature.toDER('hex');
  }

  verifySignature(message, signature, publicKey) {
    try {
      const msgHash = crypto.createHash('sha256').update(message).digest('hex');
      const key = ec.keyFromPublic(publicKey, 'hex');
      return key.verify(msgHash, signature);
    } catch (error) {
      return false;
    }
  }

  // Transaction Building

  buildTransaction(from, to, amount, utxos, fee = 1) {
    let totalInput = 0;
    const inputs = [];
    const needed = amount + fee;

    // Select UTXOs
    for (const utxo of utxos) {
      if (totalInput >= needed) break;

      inputs.push({
        txId: utxo.txId,
        index: utxo.index,
        amount: utxo.amount
      });

      totalInput += utxo.amount;
    }

    if (totalInput < needed) {
      throw new Error('Insufficient funds');
    }

    const outputs = [{ address: to, amount }];

    // Add change output
    const change = totalInput - needed;
    if (change > 0) {
      outputs.push({ address: from, amount: change });
    }

    return {
      inputs,
      outputs,
      fee,
      timestamp: Date.now()
    };
  }

  hashTransaction(transaction) {
    const data = JSON.stringify({
      inputs: transaction.inputs,
      outputs: transaction.outputs,
      timestamp: transaction.timestamp
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Mnemonic Generation

  generateMnemonic() {
    const words = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
      'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid'
    ];

    const mnemonic = [];
    for (let i = 0; i < 12; i++) {
      const index = Math.floor(Math.random() * words.length);
      mnemonic.push(words[index]);
    }

    return mnemonic.join(' ');
  }

  // Wallet Management

  getWallet(address) {
    return this.wallets.get(address);
  }

  listWallets() {
    return Array.from(this.wallets.values()).map(wallet => ({
      address: wallet.address,
      encrypted: wallet.encrypted,
      createdAt: wallet.createdAt || wallet.importedAt
    }));
  }

  removeWallet(address) {
    return this.wallets.delete(address);
  }

  // HD Wallet (Hierarchical Deterministic)

  createHDWallet(mnemonic = null) {
    const seed = mnemonic || this.generateMnemonic();
    const masterKey = crypto.createHash('sha256').update(seed).digest('hex');

    return {
      mnemonic: seed,
      masterKey,
      deriveChild: (index) => this.deriveChildKey(masterKey, index)
    };
  }

  deriveChildKey(masterKey, index) {
    const data = masterKey + index.toString();
    const childKey = crypto.createHash('sha256').update(data).digest('hex');

    return this.importWallet(childKey.substring(0, 64));
  }

  // Multi-Signature Wallet

  createMultisigWallet(publicKeys, requiredSignatures) {
    if (requiredSignatures > publicKeys.length) {
      throw new Error('Required signatures cannot exceed number of keys');
    }

    const multisigData = JSON.stringify({ publicKeys, requiredSignatures });
    const address = '0x' + crypto.createHash('sha256').update(multisigData).digest('hex').substring(0, 40);

    return {
      address,
      type: 'multisig',
      publicKeys,
      requiredSignatures
    };
  }

  signMultisig(transaction, privateKeys) {
    const signatures = privateKeys.map(key => {
      const txHash = this.hashTransaction(transaction);
      const keyPair = ec.keyFromPrivate(key, 'hex');
      return keyPair.sign(txHash).toDER('hex');
    });

    return {
      ...transaction,
      signatures
    };
  }

  // Hardware Wallet Integration

  connectHardwareWallet(type, path) {
    // Placeholder for hardware wallet integration
    return {
      type,
      path,
      connected: true,
      getAddress: () => this.deriveAddress(ec.genKeyPair().getPublic('hex')),
      signTransaction: (tx) => this.signTransaction(tx, ec.genKeyPair().getPrivate('hex'))
    };
  }

  // Validation

  validateAddress(address) {
    const regex = /^0x[a-fA-F0-9]{40}$/;
    return regex.test(address);
  }

  validatePrivateKey(privateKey) {
    try {
      ec.keyFromPrivate(privateKey, 'hex');
      return true;
    } catch (error) {
      return false;
    }
  }

  // Export/Import

  exportWallet(address, password = null) {
    const wallet = this.wallets.get(address);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (wallet.encrypted && !password) {
      throw new Error('Password required for encrypted wallet');
    }

    const privateKey = wallet.encrypted
      ? this.decryptPrivateKey(wallet.privateKey, password)
      : wallet.privateKey;

    return {
      address: wallet.address,
      publicKey: wallet.publicKey,
      privateKey
    };
  }

  exportKeystore(address, password) {
    const wallet = this.exportWallet(address, wallet.encrypted ? password : null);

    const keystore = {
      version: 3,
      address: wallet.address,
      crypto: {
        ciphertext: this.encryptPrivateKey(wallet.privateKey, password),
        kdf: 'scrypt',
        kdfparams: {
          n: 262144,
          r: 8,
          p: 1,
          dklen: 32
        }
      }
    };

    return JSON.stringify(keystore);
  }

  importKeystore(keystore, password) {
    const data = JSON.parse(keystore);
    const privateKey = this.decryptPrivateKey(data.crypto.ciphertext, password);
    return this.importWallet(privateKey, password);
  }

  // Utilities

  generateRandomWallets(count) {
    const wallets = [];

    for (let i = 0; i < count; i++) {
      wallets.push(this.createWallet());
    }

    return wallets;
  }

  isWalletEncrypted(address) {
    const wallet = this.wallets.get(address);
    return wallet ? wallet.encrypted : false;
  }
}

module.exports = WalletIntegration;
