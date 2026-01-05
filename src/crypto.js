const crypto = require('crypto');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

class CryptoUtils {
  static hash(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  static generateKeyPair() {
    const keyPair = ec.genKeyPair();
    const publicKey = keyPair.getPublic('hex');
    const privateKey = keyPair.getPrivate('hex');
    return { publicKey, privateKey };
  }

  static getPublicKeyFromPrivate(privateKey) {
    const keyPair = ec.keyFromPrivate(privateKey);
    return keyPair.getPublic('hex');
  }

  static signData(data, privateKey) {
    const keyPair = ec.keyFromPrivate(privateKey);
    const signature = keyPair.sign(data);
    return signature.toDER('hex');
  }

  static verifySignature(data, signature, publicKey) {
    try {
      if (!data || !signature || !publicKey) {
        console.error('Missing parameters for signature verification:', { data: !!data, signature: !!signature, publicKey: !!publicKey });
        return false;
      }
      const key = ec.keyFromPublic(publicKey, 'hex');
      return key.verify(data, signature);
    } catch (error) {
      console.error('Signature verification error:', error.message);
      return false;
    }
  }

  static publicKeyToAddress(publicKey) {
    const hash = crypto.createHash('sha256').update(publicKey).digest();
    const ripemd = crypto.createHash('ripemd160').update(hash).digest('hex');
    return 'STRAT' + ripemd.substring(0, 36);
  }
}

module.exports = CryptoUtils;
