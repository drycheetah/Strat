/**
 * Document Management System
 * Store, version, and track documents on blockchain
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const logger = require('../../utils/logger');

const documentSchema = new mongoose.Schema({
  documentId: { type: String, required: true, unique: true },
  name: String,
  type: {
    type: String,
    enum: ['contract', 'invoice', 'receipt', 'report', 'certificate', 'other']
  },
  ownerId: mongoose.Schema.Types.ObjectId,
  organizationId: mongoose.Schema.Types.ObjectId,
  fileHash: { type: String, required: true },
  fileSize: Number,
  mimeType: String,
  storageUrl: String,
  versions: [{
    version: Number,
    fileHash: String,
    uploadedBy: mongoose.Schema.Types.ObjectId,
    uploadedAt: Date,
    blockchainTx: String,
    changes: String
  }],
  metadata: {
    tags: [String],
    category: String,
    description: String,
    customFields: Map
  },
  access: {
    public: { type: Boolean, default: false },
    sharedWith: [{
      userId: mongoose.Schema.Types.ObjectId,
      permissions: [String],
      sharedAt: Date
    }]
  },
  encryption: {
    encrypted: { type: Boolean, default: false },
    algorithm: String,
    keyId: String
  },
  blockchain: {
    anchored: { type: Boolean, default: false },
    txHash: String,
    blockNumber: Number,
    timestamp: Date
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'archived', 'deleted'],
    default: 'active'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const Document = mongoose.model('Document', documentSchema);

class DocumentManagement {
  /**
   * Upload document
   */
  async uploadDocument(file, metadata) {
    const fileHash = this.calculateHash(file.buffer || file.data);

    const document = new Document({
      documentId: this.generateDocumentId(),
      name: file.name,
      type: metadata.type || 'other',
      ownerId: metadata.ownerId,
      organizationId: metadata.organizationId,
      fileHash,
      fileSize: file.size,
      mimeType: file.mimetype,
      storageUrl: await this.storeFile(file, fileHash),
      metadata: {
        tags: metadata.tags || [],
        category: metadata.category,
        description: metadata.description,
        customFields: metadata.customFields
      },
      versions: [{
        version: 1,
        fileHash,
        uploadedBy: metadata.ownerId,
        uploadedAt: new Date()
      }]
    });

    await document.save();

    // Anchor to blockchain
    if (metadata.anchorToBlockchain) {
      await this.anchorToBlockchain(document);
    }

    logger.info(`Document uploaded: ${document.documentId}`);

    return document;
  }

  /**
   * Update document (create new version)
   */
  async updateDocument(documentId, file, metadata) {
    const document = await Document.findOne({ documentId });
    if (!document) {
      throw new Error('Document not found');
    }

    const fileHash = this.calculateHash(file.buffer || file.data);
    const version = document.versions.length + 1;

    document.versions.push({
      version,
      fileHash,
      uploadedBy: metadata.uploadedBy,
      uploadedAt: new Date(),
      changes: metadata.changes
    });

    document.fileHash = fileHash;
    document.fileSize = file.size;
    document.storageUrl = await this.storeFile(file, fileHash);
    document.updatedAt = new Date();

    // Anchor new version to blockchain
    const txHash = await this.recordOnBlockchain('document_updated', {
      documentId,
      version,
      fileHash
    });

    document.versions[document.versions.length - 1].blockchainTx = txHash;

    await document.save();

    logger.info(`Document updated: ${documentId} - v${version}`);

    return document;
  }

  /**
   * Share document
   */
  async shareDocument(documentId, userId, permissions = ['read']) {
    const document = await Document.findOne({ documentId });
    if (!document) {
      throw new Error('Document not found');
    }

    document.access.sharedWith.push({
      userId,
      permissions,
      sharedAt: new Date()
    });

    await document.save();

    logger.info(`Document shared: ${documentId} with user ${userId}`);

    return document;
  }

  /**
   * Verify document integrity
   */
  async verifyIntegrity(documentId, fileData) {
    const document = await Document.findOne({ documentId });
    if (!document) {
      throw new Error('Document not found');
    }

    const currentHash = this.calculateHash(fileData);

    return {
      verified: currentHash === document.fileHash,
      documentHash: document.fileHash,
      providedHash: currentHash,
      blockchainAnchored: document.blockchain.anchored,
      blockchainTx: document.blockchain.txHash
    };
  }

  /**
   * Get document history
   */
  async getHistory(documentId) {
    const document = await Document.findOne({ documentId });
    if (!document) {
      throw new Error('Document not found');
    }

    return {
      documentId,
      currentVersion: document.versions.length,
      versions: document.versions,
      totalVersions: document.versions.length
    };
  }

  /**
   * Anchor document to blockchain
   */
  async anchorToBlockchain(document) {
    const txHash = await this.recordOnBlockchain('document_anchored', {
      documentId: document.documentId,
      fileHash: document.fileHash,
      timestamp: Date.now()
    });

    document.blockchain = {
      anchored: true,
      txHash,
      blockNumber: 0, // Would be actual block number
      timestamp: new Date()
    };

    await document.save();

    logger.info(`Document anchored to blockchain: ${document.documentId}`);

    return txHash;
  }

  /**
   * Calculate file hash
   */
  calculateHash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Store file (mock - would use S3, IPFS, etc.)
   */
  async storeFile(file, hash) {
    // In production, upload to S3, IPFS, or other storage
    return `https://storage.strat.io/documents/${hash}`;
  }

  /**
   * Record on blockchain
   */
  async recordOnBlockchain(eventType, data) {
    const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
    logger.info(`Blockchain record: ${eventType} - ${txHash}`);
    return txHash;
  }

  generateDocumentId() {
    return `DOC${Date.now()}${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  }
}

module.exports = new DocumentManagement();
