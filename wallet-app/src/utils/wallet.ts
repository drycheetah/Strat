import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';

// Initialize BIP32
const bip32 = BIP32Factory(ecc);

// Stratis network parameters
export const STRATIS_NETWORK = {
  messagePrefix: '\x18Stratis Signed Message:\n',
  bech32: 'strat',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4,
  },
  pubKeyHash: 0x3f, // Stratis mainnet addresses start with 'S'
  scriptHash: 0x7d,
  wif: 0xbf,
};

export const STRATIS_TESTNET = {
  messagePrefix: '\x18Stratis Signed Message:\n',
  bech32: 'tstrat',
  bip32: {
    public: 0x043587cf,
    private: 0x04358394,
  },
  pubKeyHash: 0x41, // Testnet addresses start with 'T'
  scriptHash: 0x7d,
  wif: 0xbf,
};

export interface WalletAccount {
  index: number;
  name: string;
  address: string;
  path: string;
  publicKey: string;
}

export interface WalletData {
  mnemonic: string;
  accounts: WalletAccount[];
  currentAccountIndex: number;
}

export class StratisWallet {
  private mnemonic: string;
  private seed: Buffer;
  private network: any;

  constructor(mnemonic: string, isTestnet: boolean = false) {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }
    this.mnemonic = mnemonic;
    this.seed = bip39.mnemonicToSeedSync(mnemonic);
    this.network = isTestnet ? STRATIS_TESTNET : STRATIS_NETWORK;
  }

  static generateMnemonic(strength: number = 256): string {
    return bip39.generateMnemonic(strength);
  }

  static validateMnemonic(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic);
  }

  deriveAccount(index: number): WalletAccount {
    // BIP44 path: m/44'/105'/0'/0/index
    // 105 is the coin type for Stratis
    const path = `m/44'/105'/0'/0/${index}`;
    const root = bip32.fromSeed(this.seed, this.network);
    const child = root.derivePath(path);

    if (!child.privateKey) {
      throw new Error('Failed to derive private key');
    }

    const { address } = bitcoin.payments.p2pkh({
      pubkey: child.publicKey,
      network: this.network,
    });

    if (!address) {
      throw new Error('Failed to generate address');
    }

    return {
      index,
      name: `Account ${index + 1}`,
      address,
      path,
      publicKey: child.publicKey.toString('hex'),
    };
  }

  deriveMultipleAccounts(count: number): WalletAccount[] {
    const accounts: WalletAccount[] = [];
    for (let i = 0; i < count; i++) {
      accounts.push(this.deriveAccount(i));
    }
    return accounts;
  }

  getPrivateKey(accountIndex: number): string {
    const path = `m/44'/105'/0'/0/${accountIndex}`;
    const root = bip32.fromSeed(this.seed, this.network);
    const child = root.derivePath(path);

    if (!child.privateKey) {
      throw new Error('Failed to derive private key');
    }

    return child.toWIF();
  }

  getMnemonic(): string {
    return this.mnemonic;
  }

  signMessage(message: string, accountIndex: number): string {
    const path = `m/44'/105'/0'/0/${accountIndex}`;
    const root = bip32.fromSeed(this.seed, this.network);
    const child = root.derivePath(path);

    if (!child.privateKey) {
      throw new Error('Failed to derive private key');
    }

    const messageHash = bitcoin.crypto.sha256(Buffer.from(message, 'utf8'));
    const signature = child.sign(messageHash);
    return signature.toString('hex');
  }

  static validateAddress(address: string, isTestnet: boolean = false): boolean {
    try {
      const network = isTestnet ? STRATIS_TESTNET : STRATIS_NETWORK;
      const decoded = bitcoin.address.fromBase58Check(address);
      return decoded.version === network.pubKeyHash || decoded.version === network.scriptHash;
    } catch (error) {
      return false;
    }
  }
}

export function createWallet(isTestnet: boolean = false): { mnemonic: string; wallet: StratisWallet } {
  const mnemonic = StratisWallet.generateMnemonic();
  const wallet = new StratisWallet(mnemonic, isTestnet);
  return { mnemonic, wallet };
}

export function restoreWallet(mnemonic: string, isTestnet: boolean = false): StratisWallet {
  return new StratisWallet(mnemonic, isTestnet);
}
