const bip39 = require('bip39');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');
const CryptoUtils = require('./crypto');
const crypto = require('crypto');

const bip32 = BIP32Factory(ecc);

class HDWallet {
  /**
   * Generate a new HD wallet with mnemonic phrase
   * @param {number} wordCount - 12, 15, 18, 21, or 24 words
   * @returns {Object} - { mnemonic, seed, masterKey }
   */
  static generateMnemonic(wordCount = 12) {
    const strength = (wordCount / 3) * 32;
    const mnemonic = bip39.generateMnemonic(strength);

    return {
      mnemonic,
      seed: bip39.mnemonicToSeedSync(mnemonic),
      wordCount
    };
  }

  /**
   * Restore wallet from mnemonic
   * @param {string} mnemonic - BIP39 mnemonic phrase
   * @returns {Buffer} - Seed buffer
   */
  static fromMnemonic(mnemonic) {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }

    return bip39.mnemonicToSeedSync(mnemonic);
  }

  /**
   * Derive wallet from seed at specific path
   * @param {Buffer} seed - HD wallet seed
   * @param {string} path - Derivation path (e.g., "m/44'/0'/0'/0/0")
   * @returns {Object} - { privateKey, publicKey, address, path }
   */
  static deriveWallet(seed, path = "m/44'/0'/0'/0/0") {
    const root = bip32.fromSeed(seed);
    const child = root.derivePath(path);

    const privateKey = child.privateKey.toString('hex');
    const publicKey = CryptoUtils.getPublicKeyFromPrivate(privateKey);
    const address = CryptoUtils.publicKeyToAddress(publicKey);

    return {
      privateKey,
      publicKey,
      address,
      path
    };
  }

  /**
   * Derive multiple wallets (account discovery)
   * @param {Buffer} seed - HD wallet seed
   * @param {number} count - Number of wallets to derive
   * @param {number} accountIndex - Account index (default 0)
   * @returns {Array} - Array of wallet objects
   */
  static deriveMultiple(seed, count = 5, accountIndex = 0) {
    const wallets = [];

    for (let i = 0; i < count; i++) {
      const path = `m/44'/0'/${accountIndex}'/0/${i}`;
      const wallet = this.deriveWallet(seed, path);
      wallet.index = i;
      wallets.push(wallet);
    }

    return wallets;
  }

  /**
   * Encrypt mnemonic for storage
   * @param {string} mnemonic - Mnemonic phrase
   * @param {string} password - User password
   * @returns {string} - Encrypted mnemonic (format: encrypted:iv:authTag)
   */
  static encryptMnemonic(mnemonic, password) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(password, 'mnemonic-salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(mnemonic, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${encrypted}:${iv.toString('hex')}:${authTag.toString('hex')}`;
  }

  /**
   * Decrypt mnemonic
   * @param {string} encryptedMnemonic - Encrypted mnemonic string
   * @param {string} password - User password
   * @returns {string} - Decrypted mnemonic phrase
   */
  static decryptMnemonic(encryptedMnemonic, password) {
    try {
      const parts = encryptedMnemonic.split(':');
      const encrypted = parts[0];
      const iv = Buffer.from(parts[1], 'hex');
      const authTag = Buffer.from(parts[2], 'hex');

      const algorithm = 'aes-256-gcm';
      const key = crypto.scryptSync(password, 'mnemonic-salt', 32);
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error('Invalid password or corrupted mnemonic');
    }
  }

  /**
   * Validate mnemonic phrase
   * @param {string} mnemonic - Mnemonic to validate
   * @returns {boolean}
   */
  static validateMnemonic(mnemonic) {
    return bip39.validateMnemonic(mnemonic);
  }

  /**
   * Get mnemonic word list
   * @returns {Array} - Array of valid BIP39 words
   */
  static getWordlist() {
    return bip39.wordlists.english;
  }

  /**
   * Generate change address (for UTXO model)
   * @param {Buffer} seed - HD wallet seed
   * @param {number} accountIndex - Account index
   * @param {number} changeIndex - Change address index
   * @returns {Object} - Change wallet object
   */
  static deriveChangeAddress(seed, accountIndex = 0, changeIndex = 0) {
    const path = `m/44'/0'/${accountIndex}'/1/${changeIndex}`;
    return this.deriveWallet(seed, path);
  }
}

module.exports = HDWallet;
