const User = require('../models/User');
const Wallet = require('../models/Wallet');
const HDWallet = require('../src/hdwallet');
const { generateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * Register new user
 */
const register = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists',
        message: 'Email or username is already taken'
      });
    }

    // Create user
    const user = new User({
      email,
      username,
      password // Will be hashed by pre-save hook
    });

    await user.save();

    // Generate HD wallet for new user
    const { mnemonic, seed } = HDWallet.generateMnemonic(12);
    const wallet = HDWallet.deriveWallet(seed, "m/44'/0'/0'/0/0");

    // Encrypt and save wallet
    const encryptedMnemonic = HDWallet.encryptMnemonic(mnemonic, password);
    const encryptedPrivateKey = `${wallet.privateKey}:::`; // Simplified for now

    const userWallet = new Wallet({
      user: user._id,
      address: wallet.address,
      publicKey: wallet.publicKey,
      encryptedPrivateKey,
      name: 'Main Wallet',
      type: 'hd',
      derivationPath: wallet.path,
      encryptedMnemonic,
      isBackedUp: false
    });

    await userWallet.save();

    // Update user with primary wallet
    user.wallets.push(userWallet._id);
    user.primaryWallet = userWallet._id;
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        wallet: {
          address: userWallet.address,
          mnemonic // Send once for backup
        }
      }
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    res.status(500).json({
      error: 'Registration failed',
      message: error.message
    });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      const lockTime = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      return res.status(423).json({
        error: 'Account locked',
        message: `Too many failed attempts. Try again in ${lockTime} minutes.`
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      await user.incLoginAttempts();
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Reset login attempts and update last login
    await user.resetLoginAttempts();
    user.lastLogin = Date.now();
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Get primary wallet
    const wallet = await Wallet.findById(user.primaryWallet);

    logger.info(`User logged in: ${user.email}`);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        wallet: wallet ? {
          id: wallet._id,
          address: wallet.address,
          balance: wallet.balance
        } : null
      }
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({
      error: 'Login failed',
      message: error.message
    });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('wallets')
      .populate('primaryWallet');

    res.json({
      success: true,
      user
    });
  } catch (error) {
    logger.error(`Get profile error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get profile',
      message: error.message
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const updates = {};
    const allowedUpdates = ['username'];

    allowedUpdates.forEach(field => {
      if (req.body[field]) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    logger.info(`User profile updated: ${user.email}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    logger.error(`Update profile error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to update profile',
      message: error.message
    });
  }
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info(`Password changed for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error(`Change password error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to change password',
      message: error.message
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword
};
