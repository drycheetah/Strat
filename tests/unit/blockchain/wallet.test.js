const Wallet = require('../../../src/wallet');
const CryptoUtils = require('../../../src/crypto');

describe('Wallet', () => {
  describe('Wallet Creation', () => {
    test('should create wallet with key pair', () => {
      const wallet = new Wallet();

      expect(wallet.privateKey).toBeDefined();
      expect(wallet.publicKey).toBeDefined();
      expect(wallet.address).toBeDefined();
    });

    test('should generate unique wallets', () => {
      const wallet1 = new Wallet();
      const wallet2 = new Wallet();

      expect(wallet1.address).not.toBe(wallet2.address);
      expect(wallet1.privateKey).not.toBe(wallet2.privateKey);
    });

    test('should derive address from public key', () => {
      const wallet = new Wallet();
      const derivedAddress = CryptoUtils.getAddressFromPublicKey(wallet.publicKey);

      expect(wallet.address).toBe(derivedAddress);
    });
  });

  describe('Transaction Signing', () => {
    test('should sign transaction data', () => {
      const wallet = new Wallet();
      const data = 'transaction data';

      const signature = wallet.sign(data);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
    });

    test('should produce verifiable signatures', () => {
      const wallet = new Wallet();
      const data = 'test data';

      const signature = wallet.sign(data);
      const isValid = CryptoUtils.verify(data, signature, wallet.publicKey);

      expect(isValid).toBe(true);
    });
  });

  describe('Balance Management', () => {
    test('should track wallet balance', () => {
      const wallet = new Wallet();
      wallet.balance = 100;

      expect(wallet.balance).toBe(100);
    });

    test('should handle decimal balances', () => {
      const wallet = new Wallet();
      wallet.balance = 50.123456;

      expect(wallet.balance).toBe(50.123456);
    });
  });

  describe('Wallet Export/Import', () => {
    test('should export private key', () => {
      const wallet = new Wallet();
      const exported = wallet.exportPrivateKey();

      expect(exported).toBe(wallet.privateKey);
    });

    test('should import wallet from private key', () => {
      const originalWallet = new Wallet();
      const privateKey = originalWallet.privateKey;

      const importedWallet = Wallet.fromPrivateKey(privateKey);

      expect(importedWallet.address).toBe(originalWallet.address);
      expect(importedWallet.publicKey).toBe(originalWallet.publicKey);
    });
  });

  describe('Key Format Validation', () => {
    test('should have valid hex private key', () => {
      const wallet = new Wallet();
      expect(/^[0-9a-f]+$/i.test(wallet.privateKey)).toBe(true);
    });

    test('should have valid hex public key', () => {
      const wallet = new Wallet();
      expect(/^[0-9a-f]+$/i.test(wallet.publicKey)).toBe(true);
    });

    test('should have valid address format', () => {
      const wallet = new Wallet();
      expect(wallet.address).toBeDefined();
      expect(wallet.address.length).toBeGreaterThan(0);
    });
  });
});
