import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import { ec as EC } from 'elliptic';
import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';

const bip32 = BIP32Factory(ecc);
const ec = new EC('secp256k1');

export interface Wallet {
  address: string;
  publicKey: string;
  privateKey: string;
  mnemonic: string;
  path: string;
  balance: number;
}

export interface HDWallet {
  mnemonic: string;
  seed: Buffer;
  masterKey: any;
  accounts: Wallet[];
}

class WalletService {
  private static STORAGE_KEY = 'strat_wallet_encrypted';
  private static MNEMONIC_KEY = 'strat_mnemonic_encrypted';

  /**
   * Generate a new HD wallet with mnemonic
   */
  async generateWallet(accountIndex: number = 0): Promise<Wallet> {
    // Generate 12-word mnemonic
    const mnemonic = bip39.generateMnemonic(128);
    return this.createWalletFromMnemonic(mnemonic, accountIndex);
  }

  /**
   * Create wallet from existing mnemonic
   */
  async createWalletFromMnemonic(
    mnemonic: string,
    accountIndex: number = 0
  ): Promise<Wallet> {
    // Validate mnemonic
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }

    // Generate seed from mnemonic
    const seed = await bip39.mnemonicToSeed(mnemonic);

    // Create master key
    const masterKey = bip32.fromSeed(seed);

    // Derive child key using BIP44 path
    // m/44'/0'/0'/0/accountIndex
    const path = `m/44'/0'/0'/0/${accountIndex}`;
    const child = masterKey.derivePath(path);

    // Get private key
    const privateKeyBuffer = child.privateKey;
    if (!privateKeyBuffer) {
      throw new Error('Failed to derive private key');
    }

    const privateKey = privateKeyBuffer.toString('hex');

    // Generate public key and address
    const keyPair = ec.keyFromPrivate(privateKey);
    const publicKey = keyPair.getPublic('hex');

    // Generate address (STRAT uses first 40 chars of hash)
    const address = this.generateAddress(publicKey);

    return {
      address,
      publicKey,
      privateKey,
      mnemonic,
      path,
      balance: 0
    };
  }

  /**
   * Generate address from public key
   */
  private generateAddress(publicKey: string): string {
    const hash = CryptoJS.SHA256(publicKey).toString();
    return 'STRAT' + hash.substring(0, 36).toUpperCase();
  }

  /**
   * Save wallet securely
   */
  async saveWallet(wallet: Wallet, password: string): Promise<void> {
    // Encrypt wallet data
    const walletData = JSON.stringify({
      address: wallet.address,
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey,
      path: wallet.path
    });

    const encrypted = CryptoJS.AES.encrypt(walletData, password).toString();

    // Store encrypted wallet
    await SecureStore.setItemAsync(WalletService.STORAGE_KEY, encrypted);

    // Store encrypted mnemonic separately
    const encryptedMnemonic = CryptoJS.AES.encrypt(
      wallet.mnemonic,
      password
    ).toString();

    await SecureStore.setItemAsync(
      WalletService.MNEMONIC_KEY,
      encryptedMnemonic
    );
  }

  /**
   * Load wallet from secure storage
   */
  async loadWallet(password: string): Promise<Wallet | null> {
    try {
      const encrypted = await SecureStore.getItemAsync(
        WalletService.STORAGE_KEY
      );

      const encryptedMnemonic = await SecureStore.getItemAsync(
        WalletService.MNEMONIC_KEY
      );

      if (!encrypted || !encryptedMnemonic) {
        return null;
      }

      // Decrypt wallet data
      const decrypted = CryptoJS.AES.decrypt(encrypted, password).toString(
        CryptoJS.enc.Utf8
      );

      const walletData = JSON.parse(decrypted);

      // Decrypt mnemonic
      const mnemonic = CryptoJS.AES.decrypt(
        encryptedMnemonic,
        password
      ).toString(CryptoJS.enc.Utf8);

      return {
        ...walletData,
        mnemonic,
        balance: 0
      };
    } catch (error) {
      console.error('Failed to load wallet:', error);
      return null;
    }
  }

  /**
   * Check if wallet exists
   */
  async hasWallet(): Promise<boolean> {
    const encrypted = await SecureStore.getItemAsync(
      WalletService.STORAGE_KEY
    );
    return encrypted !== null;
  }

  /**
   * Delete wallet
   */
  async deleteWallet(): Promise<void> {
    await SecureStore.deleteItemAsync(WalletService.STORAGE_KEY);
    await SecureStore.deleteItemAsync(WalletService.MNEMONIC_KEY);
  }

  /**
   * Export private key
   */
  async exportPrivateKey(password: string): Promise<string | null> {
    const wallet = await this.loadWallet(password);
    return wallet ? wallet.privateKey : null;
  }

  /**
   * Import wallet from private key
   */
  async importFromPrivateKey(privateKey: string): Promise<Wallet> {
    try {
      // Validate private key
      const keyPair = ec.keyFromPrivate(privateKey);
      const publicKey = keyPair.getPublic('hex');
      const address = this.generateAddress(publicKey);

      // Generate a new mnemonic for backup purposes
      const mnemonic = bip39.generateMnemonic(128);

      return {
        address,
        publicKey,
        privateKey,
        mnemonic,
        path: 'imported',
        balance: 0
      };
    } catch (error) {
      throw new Error('Invalid private key');
    }
  }

  /**
   * Derive multiple accounts from same mnemonic
   */
  async deriveAccounts(mnemonic: string, count: number): Promise<Wallet[]> {
    const accounts: Wallet[] = [];

    for (let i = 0; i < count; i++) {
      const wallet = await this.createWalletFromMnemonic(mnemonic, i);
      accounts.push(wallet);
    }

    return accounts;
  }

  /**
   * Sign transaction
   */
  signTransaction(privateKey: string, transactionHash: string): string {
    const keyPair = ec.keyFromPrivate(privateKey);
    const signature = keyPair.sign(transactionHash);
    return signature.toDER('hex');
  }

  /**
   * Verify signature
   */
  verifySignature(
    publicKey: string,
    transactionHash: string,
    signature: string
  ): boolean {
    try {
      const keyPair = ec.keyFromPublic(publicKey, 'hex');
      return keyPair.verify(transactionHash, signature);
    } catch (error) {
      return false;
    }
  }
}

export default new WalletService();
