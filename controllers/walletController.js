const Wallet = require('../models/Wallet');
const HDWallet = require('../src/hdwallet');
const { Transaction, TransactionInput, TransactionOutput } = require('../src/transaction');
const logger = require('../utils/logger');

/**
 * Create a new wallet for user
 */
const createWallet = async (req, res) => {
  try {
    const { name, password, type = 'hd' } = req.body;

    // Generate HD wallet
    const { mnemonic, seed } = HDWallet.generateMnemonic(12);
    const derivedWallet = HDWallet.deriveWallet(seed, "m/44'/0'/0'/0/0");

    // Encrypt mnemonic and private key
    const encryptedMnemonic = HDWallet.encryptMnemonic(mnemonic, password);
    const encryptedPrivateKey = `${derivedWallet.privateKey}:::`; // Simplified

    const wallet = new Wallet({
      user: req.user._id,
      address: derivedWallet.address,
      publicKey: derivedWallet.publicKey,
      encryptedPrivateKey,
      name,
      type,
      derivationPath: derivedWallet.path,
      encryptedMnemonic,
      isBackedUp: false
    });

    await wallet.save();

    // Add to user's wallets
    req.user.wallets.push(wallet._id);
    await req.user.save();

    logger.info(`New wallet created for user ${req.user.email}: ${wallet.address}`);

    res.status(201).json({
      success: true,
      message: 'Wallet created successfully',
      wallet: {
        id: wallet._id,
        address: wallet.address,
        name: wallet.name,
        type: wallet.type,
        mnemonic, // Return once for user to backup
        warning: 'Save your mnemonic phrase! This is the only time you will see it.'
      }
    });
  } catch (error) {
    logger.error(`Create wallet error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to create wallet',
      message: error.message
    });
  }
};

/**
 * Restore wallet from mnemonic
 */
const restoreWallet = async (req, res) => {
  try {
    const { mnemonic, name, password } = req.body;

    // Validate mnemonic
    if (!HDWallet.validateMnemonic(mnemonic)) {
      return res.status(400).json({
        error: 'Invalid mnemonic',
        message: 'The mnemonic phrase is invalid'
      });
    }

    // Derive wallet from mnemonic
    const seed = HDWallet.fromMnemonic(mnemonic);
    const derivedWallet = HDWallet.deriveWallet(seed, "m/44'/0'/0'/0/0");

    // Check if wallet already exists
    const existingWallet = await Wallet.findOne({ address: derivedWallet.address });
    if (existingWallet) {
      return res.status(400).json({
        error: 'Wallet exists',
        message: 'This wallet has already been restored'
      });
    }

    // Encrypt and save
    const encryptedMnemonic = HDWallet.encryptMnemonic(mnemonic, password);
    const encryptedPrivateKey = `${derivedWallet.privateKey}:::`;

    const wallet = new Wallet({
      user: req.user._id,
      address: derivedWallet.address,
      publicKey: derivedWallet.publicKey,
      encryptedPrivateKey,
      name,
      type: 'hd',
      derivationPath: derivedWallet.path,
      encryptedMnemonic,
      isBackedUp: true
    });

    await wallet.save();

    req.user.wallets.push(wallet._id);
    await req.user.save();

    // Update balance from blockchain
    if (req.blockchain) {
      await wallet.updateBalance(req.blockchain);
    }

    logger.info(`Wallet restored for user ${req.user.email}: ${wallet.address}`);

    res.json({
      success: true,
      message: 'Wallet restored successfully',
      wallet: {
        id: wallet._id,
        address: wallet.address,
        name: wallet.name,
        balance: wallet.balance
      }
    });
  } catch (error) {
    logger.error(`Restore wallet error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to restore wallet',
      message: error.message
    });
  }
};

/**
 * Get all wallets for user
 */
const getWallets = async (req, res) => {
  try {
    const wallets = await Wallet.find({ user: req.user._id })
      .select('-encryptedPrivateKey -encryptedMnemonic')
      .sort({ createdAt: -1 });

    // Update balances if blockchain available
    if (req.blockchain) {
      for (let wallet of wallets) {
        await wallet.updateBalance(req.blockchain);
      }
    }

    res.json({
      success: true,
      wallets
    });
  } catch (error) {
    logger.error(`Get wallets error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get wallets',
      message: error.message
    });
  }
};

/**
 * Get specific wallet
 */
const getWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({
      _id: req.params.id,
      user: req.user._id
    }).select('-encryptedPrivateKey -encryptedMnemonic');

    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    // Update balance
    if (req.blockchain) {
      await wallet.updateBalance(req.blockchain);
    }

    res.json({
      success: true,
      wallet
    });
  } catch (error) {
    logger.error(`Get wallet error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get wallet',
      message: error.message
    });
  }
};

/**
 * Get wallet transaction history
 */
const getTransactionHistory = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    const transactions = wallet.getTransactionHistory(req.blockchain);

    res.json({
      success: true,
      transactions,
      count: transactions.length
    });
  } catch (error) {
    logger.error(`Get transaction history error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get transaction history',
      message: error.message
    });
  }
};

/**
 * Export wallet mnemonic (requires password)
 */
const exportMnemonic = async (req, res) => {
  try {
    const { password } = req.body;

    const wallet = await Wallet.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    if (!wallet.encryptedMnemonic) {
      return res.status(400).json({
        error: 'No mnemonic available',
        message: 'This wallet was not created with a mnemonic phrase'
      });
    }

    // Verify user password
    const user = await req.user.populate('password');
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid password'
      });
    }

    // Decrypt mnemonic
    const mnemonic = HDWallet.decryptMnemonic(wallet.encryptedMnemonic, password);

    // Mark as backed up
    wallet.isBackedUp = true;
    await wallet.save();

    logger.warn(`Mnemonic exported for wallet ${wallet.address} by user ${req.user.email}`);

    res.json({
      success: true,
      mnemonic,
      warning: 'Keep this phrase safe and secret. Anyone with this phrase can access your funds.'
    });
  } catch (error) {
    logger.error(`Export mnemonic error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to export mnemonic',
      message: error.message
    });
  }
};

/**
 * Set primary wallet
 */
const setPrimaryWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    req.user.primaryWallet = wallet._id;
    await req.user.save();

    logger.info(`Primary wallet set for user ${req.user.email}: ${wallet.address}`);

    res.json({
      success: true,
      message: 'Primary wallet updated',
      wallet: {
        id: wallet._id,
        address: wallet.address
      }
    });
  } catch (error) {
    logger.error(`Set primary wallet error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to set primary wallet',
      message: error.message
    });
  }
};

/**
 * Get primary wallet info for current user
 */
const getInfo = async (req, res) => {
  try {
    // Get user's primary wallet or first wallet
    const wallet = await Wallet.findOne({
      user: req.user._id,
      isPrimary: true
    }) || await Wallet.findOne({ user: req.user._id });

    if (!wallet) {
      return res.status(404).json({
        error: 'No wallet found',
        message: 'User has no wallets'
      });
    }

    // Update balance if blockchain available
    if (req.blockchain) {
      await wallet.updateBalance(req.blockchain);
    }

    res.json({
      success: true,
      wallet: {
        id: wallet._id,
        address: wallet.address,
        name: wallet.name,
        balance: wallet.balance,
        stakedBalance: wallet.stakedBalance || 0,
        isPrimary: wallet.isPrimary
      }
    });
  } catch (error) {
    logger.error(`Get wallet info error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get wallet info',
      message: error.message
    });
  }
};

module.exports = {
  createWallet,
  restoreWallet,
  getWallets,
  getWallet,
  getTransactionHistory,
  exportMnemonic,
  setPrimaryWallet,
  getInfo
};
