const CryptoUtils = require('../../../src/crypto');

describe('CryptoUtils', () => {
  describe('Key Pair Generation', () => {
    test('should generate valid key pair', () => {
      const keyPair = CryptoUtils.generateKeyPair();

      expect(keyPair).toBeDefined();
      expect(keyPair.privateKey).toBeDefined();
      expect(keyPair.publicKey).toBeDefined();
    });

    test('should generate unique key pairs', () => {
      const keyPair1 = CryptoUtils.generateKeyPair();
      const keyPair2 = CryptoUtils.generateKeyPair();

      expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
      expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
    });

    test('private key should be hex string', () => {
      const keyPair = CryptoUtils.generateKeyPair();
      expect(typeof keyPair.privateKey).toBe('string');
      expect(/^[0-9a-f]+$/i.test(keyPair.privateKey)).toBe(true);
    });

    test('public key should be hex string', () => {
      const keyPair = CryptoUtils.generateKeyPair();
      expect(typeof keyPair.publicKey).toBe('string');
      expect(/^[0-9a-f]+$/i.test(keyPair.publicKey)).toBe(true);
    });
  });

  describe('Address Generation', () => {
    test('should generate address from public key', () => {
      const keyPair = CryptoUtils.generateKeyPair();
      const address = CryptoUtils.getAddressFromPublicKey(keyPair.publicKey);

      expect(address).toBeDefined();
      expect(typeof address).toBe('string');
    });

    test('should generate consistent address for same public key', () => {
      const keyPair = CryptoUtils.generateKeyPair();
      const address1 = CryptoUtils.getAddressFromPublicKey(keyPair.publicKey);
      const address2 = CryptoUtils.getAddressFromPublicKey(keyPair.publicKey);

      expect(address1).toBe(address2);
    });

    test('should generate different addresses for different public keys', () => {
      const keyPair1 = CryptoUtils.generateKeyPair();
      const keyPair2 = CryptoUtils.generateKeyPair();

      const address1 = CryptoUtils.getAddressFromPublicKey(keyPair1.publicKey);
      const address2 = CryptoUtils.getAddressFromPublicKey(keyPair2.publicKey);

      expect(address1).not.toBe(address2);
    });
  });

  describe('Data Signing', () => {
    test('should sign data with private key', () => {
      const keyPair = CryptoUtils.generateKeyPair();
      const data = 'test data to sign';

      const signature = CryptoUtils.sign(data, keyPair.privateKey);

      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.length).toBeGreaterThan(0);
    });

    test('should produce different signatures for different data', () => {
      const keyPair = CryptoUtils.generateKeyPair();
      const signature1 = CryptoUtils.sign('data1', keyPair.privateKey);
      const signature2 = CryptoUtils.sign('data2', keyPair.privateKey);

      expect(signature1).not.toBe(signature2);
    });

    test('should produce consistent signature for same data', () => {
      const keyPair = CryptoUtils.generateKeyPair();
      const data = 'test data';

      const signature1 = CryptoUtils.sign(data, keyPair.privateKey);
      const signature2 = CryptoUtils.sign(data, keyPair.privateKey);

      expect(signature1).toBe(signature2);
    });
  });

  describe('Signature Verification', () => {
    test('should verify valid signature', () => {
      const keyPair = CryptoUtils.generateKeyPair();
      const data = 'test data';
      const signature = CryptoUtils.sign(data, keyPair.privateKey);

      const isValid = CryptoUtils.verify(data, signature, keyPair.publicKey);

      expect(isValid).toBe(true);
    });

    test('should reject invalid signature', () => {
      const keyPair = CryptoUtils.generateKeyPair();
      const data = 'test data';
      const wrongSignature = 'invalid-signature-string';

      const isValid = CryptoUtils.verify(data, wrongSignature, keyPair.publicKey);

      expect(isValid).toBe(false);
    });

    test('should reject signature from different key', () => {
      const keyPair1 = CryptoUtils.generateKeyPair();
      const keyPair2 = CryptoUtils.generateKeyPair();
      const data = 'test data';

      const signature = CryptoUtils.sign(data, keyPair1.privateKey);
      const isValid = CryptoUtils.verify(data, signature, keyPair2.publicKey);

      expect(isValid).toBe(false);
    });

    test('should reject signature for modified data', () => {
      const keyPair = CryptoUtils.generateKeyPair();
      const originalData = 'original data';
      const modifiedData = 'modified data';

      const signature = CryptoUtils.sign(originalData, keyPair.privateKey);
      const isValid = CryptoUtils.verify(modifiedData, signature, keyPair.publicKey);

      expect(isValid).toBe(false);
    });
  });

  describe('Hash Generation', () => {
    test('should generate hash from data', () => {
      const data = 'test data';
      const hash = CryptoUtils.hash(data);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    test('should produce consistent hash for same data', () => {
      const data = 'test data';
      const hash1 = CryptoUtils.hash(data);
      const hash2 = CryptoUtils.hash(data);

      expect(hash1).toBe(hash2);
    });

    test('should produce different hashes for different data', () => {
      const hash1 = CryptoUtils.hash('data1');
      const hash2 = CryptoUtils.hash('data2');

      expect(hash1).not.toBe(hash2);
    });

    test('should handle empty string', () => {
      const hash = CryptoUtils.hash('');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    test('should handle complex objects', () => {
      const obj = { key: 'value', nested: { data: 123 } };
      const hash = CryptoUtils.hash(JSON.stringify(obj));

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });

  describe('Cryptographic Security', () => {
    test('should use elliptic curve cryptography', () => {
      const keyPair = CryptoUtils.generateKeyPair();
      // Key length should be appropriate for secp256k1
      expect(keyPair.privateKey.length).toBeGreaterThan(32);
    });

    test('should handle binary data', () => {
      const binaryData = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const hash = CryptoUtils.hash(binaryData.toString('hex'));

      expect(hash).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long data', () => {
      const longData = 'a'.repeat(10000);
      const hash = CryptoUtils.hash(longData);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    test('should handle special characters', () => {
      const specialData = '!@#$%^&*(){}[]|\\:";\'<>?,./';
      const hash = CryptoUtils.hash(specialData);

      expect(hash).toBeDefined();
    });

    test('should handle unicode characters', () => {
      const unicodeData = '你好世界 🚀 مرحبا';
      const hash = CryptoUtils.hash(unicodeData);

      expect(hash).toBeDefined();
    });
  });
});
