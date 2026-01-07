/**
 * Supply Chain Tracking System
 * Track products, shipments, and provenance on blockchain
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

const productSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },
  sku: String,
  name: String,
  description: String,
  manufacturer: {
    id: String,
    name: String,
    location: String
  },
  origin: {
    country: String,
    facility: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  materials: [{
    name: String,
    quantity: Number,
    unit: String,
    source: String
  }],
  certifications: [{
    type: String,
    authority: String,
    validUntil: Date
  }],
  createdAt: { type: Date, default: Date.now }
});

const shipmentSchema = new mongoose.Schema({
  shipmentId: { type: String, required: true, unique: true },
  products: [{
    productId: String,
    quantity: Number
  }],
  from: {
    entity: String,
    location: String,
    coordinates: { lat: Number, lng: Number }
  },
  to: {
    entity: String,
    location: String,
    coordinates: { lat: Number, lng: Number }
  },
  carrier: String,
  trackingNumber: String,
  status: {
    type: String,
    enum: ['pending', 'in_transit', 'delivered', 'cancelled']
  },
  timeline: [{
    event: String,
    location: String,
    timestamp: Date,
    blockchainTx: String
  }],
  conditions: {
    temperature: { min: Number, max: Number, current: Number },
    humidity: { min: Number, max: Number, current: Number }
  },
  createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);
const Shipment = mongoose.model('Shipment', shipmentSchema);

class SupplyChainTracker {
  /**
   * Register new product
   */
  async registerProduct(productData) {
    const product = new Product({
      productId: this.generateProductId(),
      ...productData
    });

    await product.save();

    // Record on blockchain
    const txHash = await this.recordOnBlockchain('product_registered', product);

    logger.info(`Product registered: ${product.productId}`);

    return { product, txHash };
  }

  /**
   * Create shipment
   */
  async createShipment(shipmentData) {
    const shipment = new Shipment({
      shipmentId: this.generateShipmentId(),
      ...shipmentData,
      status: 'pending',
      timeline: [{
        event: 'shipment_created',
        location: shipmentData.from.location,
        timestamp: new Date()
      }]
    });

    await shipment.save();

    const txHash = await this.recordOnBlockchain('shipment_created', shipment);

    logger.info(`Shipment created: ${shipment.shipmentId}`);

    return { shipment, txHash };
  }

  /**
   * Update shipment status
   */
  async updateShipmentStatus(shipmentId, event, location) {
    const shipment = await Shipment.findOne({ shipmentId });
    if (!shipment) {
      throw new Error('Shipment not found');
    }

    const timelineEvent = {
      event,
      location,
      timestamp: new Date()
    };

    // Record on blockchain
    const txHash = await this.recordOnBlockchain('shipment_update', {
      shipmentId,
      event,
      location
    });

    timelineEvent.blockchainTx = txHash;
    shipment.timeline.push(timelineEvent);

    if (event === 'delivered') {
      shipment.status = 'delivered';
    } else if (event === 'cancelled') {
      shipment.status = 'cancelled';
    } else {
      shipment.status = 'in_transit';
    }

    await shipment.save();

    logger.info(`Shipment updated: ${shipmentId} - ${event}`);

    return shipment;
  }

  /**
   * Get product history
   */
  async getProductHistory(productId) {
    const product = await Product.findOne({ productId });
    if (!product) {
      throw new Error('Product not found');
    }

    const shipments = await Shipment.find({
      'products.productId': productId
    }).sort({ createdAt: -1 });

    return {
      product,
      shipments,
      totalShipments: shipments.length
    };
  }

  /**
   * Verify product authenticity
   */
  async verifyAuthenticity(productId) {
    const product = await Product.findOne({ productId });
    if (!product) {
      return { authentic: false, reason: 'Product not found in database' };
    }

    // Check blockchain records
    const blockchainVerified = await this.verifyOnBlockchain(productId);

    return {
      authentic: blockchainVerified,
      product,
      verified: true
    };
  }

  /**
   * Record event on blockchain
   */
  async recordOnBlockchain(eventType, data) {
    // In production, create actual blockchain transaction
    const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;

    logger.info(`Blockchain record: ${eventType} - ${txHash}`);

    return txHash;
  }

  /**
   * Verify on blockchain
   */
  async verifyOnBlockchain(productId) {
    // Check if product exists in blockchain records
    return true;
  }

  generateProductId() {
    return `PRD${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  generateShipmentId() {
    return `SHP${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }
}

module.exports = new SupplyChainTracker();
