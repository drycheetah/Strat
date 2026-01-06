const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const Wallet = require('../models/Wallet');
const BridgeTransaction = require('../models/BridgeTransaction');
const BlockModel = require('../models/Block');
const LiquidityPool = require('../models/LiquidityPool');
const { Transaction } = require('../src/transaction');
const logger = require('../utils/logger');

const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
const BRIDGE_ADDRESS = process.env.BRIDGE_SOL_ADDRESS;
const BRIDGE_FEE_PERCENT = parseFloat(process.env.BRIDGE_FEE_PERCENT) || 0.3; // 0.3% AMM fee
const BRIDGE_FEE_WALLET = process.env.BRIDGE_FEE_WALLET; // Your wallet to collect fees

/**
 * Get bridge information
 */
exports.getBridgeInfo = async (req, res) => {
  try {
    if (!BRIDGE_ADDRESS) {
      return res.status(500).json({ error: 'Bridge not configured' });
    }

    // Get current price from AMM pool
    const pool = await LiquidityPool.getPool();
    const currentRate = pool.stratReserve / pool.solReserve; // STRAT per SOL

    res.json({
      bridgeAddress: BRIDGE_ADDRESS,
      exchangeRate: currentRate,
      bridgeFee: BRIDGE_FEE_PERCENT,
      network: 'mainnet-beta',
      solReserve: pool.solReserve,
      stratReserve: pool.stratReserve,
      priceUSD: pool.getPriceUSD(),
      disclaimer: `${BRIDGE_FEE_PERCENT}% liquidity pool fee applies. Price determined by AMM.`
    });
  } catch (error) {
    logger.error(`Error getting bridge info: ${error.message}`);
    res.status(500).json({ error: 'Failed to get bridge info' });
  }
};

/**
 * Verify and credit SOL deposit
 */
exports.verifyDeposit = async (req, res) => {
  try {
    const { signature } = req.body;
    const userId = req.user._id;

    if (!signature) {
      return res.status(400).json({ error: 'Transaction signature required' });
    }

    // Check if bridge is configured
    if (!BRIDGE_ADDRESS) {
      return res.status(500).json({ error: 'Bridge not configured', details: 'BRIDGE_SOL_ADDRESS environment variable is missing' });
    }

    logger.info(`Verifying SOL deposit: ${signature} for user ${userId}`);

    // Fetch transaction from Solana
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0
    });

    if (!tx) {
      return res.status(404).json({ error: 'Transaction not found on Solana blockchain' });
    }

    if (!tx.meta || tx.meta.err) {
      return res.status(400).json({ error: 'Transaction failed or has errors' });
    }

    // Verify the transaction sent SOL to our bridge address
    const bridgePubkey = new PublicKey(BRIDGE_ADDRESS?.trim() || BRIDGE_ADDRESS);
    const postBalances = tx.meta.postBalances;
    const preBalances = tx.meta.preBalances;

    // Get account keys - handle both legacy and versioned transactions
    let accountKeys;
    try {
      // Try to get keys using getAccountKeys() for versioned transactions
      if (tx.transaction.message.getAccountKeys) {
        const keys = tx.transaction.message.getAccountKeys();
        accountKeys = keys.staticAccountKeys || keys;
      } else if (tx.transaction.message.accountKeys) {
        accountKeys = tx.transaction.message.accountKeys;
      } else if (tx.transaction.message.staticAccountKeys) {
        accountKeys = tx.transaction.message.staticAccountKeys;
      } else {
        return res.status(400).json({ error: 'Could not parse transaction account keys' });
      }
    } catch (e) {
      logger.error(`Error parsing account keys: ${e.message}`);
      return res.status(400).json({ error: 'Could not parse transaction account keys', details: e.message });
    }

    // Find our bridge address in the account keys
    let bridgeIndex = -1;
    for (let i = 0; i < accountKeys.length; i++) {
      try {
        const key = accountKeys[i];
        // Convert to base58 string safely
        let keyStr;
        if (typeof key === 'string') {
          keyStr = key;
        } else if (key.toBase58) {
          keyStr = key.toBase58();
        } else if (key.toString) {
          keyStr = key.toString();
        } else {
          // If it's a raw public key object, try to create PublicKey directly
          keyStr = new PublicKey(key).toBase58();
        }

        const pubkey = new PublicKey(keyStr);
        if (pubkey.toBase58() === bridgePubkey.toBase58()) {
          bridgeIndex = i;
          break;
        }
      } catch (e) {
        logger.error(`Error processing account key at index ${i}: ${e.message}`);
        continue;
      }
    }

    if (bridgeIndex === -1) {
      return res.status(400).json({ error: 'Transaction does not involve bridge address' });
    }

    // Calculate amount received
    const lamportsReceived = postBalances[bridgeIndex] - preBalances[bridgeIndex];

    if (lamportsReceived <= 0) {
      return res.status(400).json({ error: 'No SOL was sent to bridge address' });
    }

    const solReceived = lamportsReceived / LAMPORTS_PER_SOL;

    // Get AMM pool and execute swap
    const pool = await LiquidityPool.getPool();

    // Calculate expected output with slippage protection (2% slippage tolerance)
    const expectedSTRAT = pool.getAmountOut(solReceived, true);
    const minSTRAT = expectedSTRAT * 0.98; // 2% slippage tolerance

    // Execute swap through AMM
    const swapResult = await pool.swap(solReceived, true, minSTRAT);
    const stratToCredit = swapResult.amountOut;

    // Calculate fee portion for fee wallet (from the pool fee)
    const poolFeeCollected = solReceived * (BRIDGE_FEE_PERCENT / 100);
    const feeInSTRAT = pool.getAmountOut(poolFeeCollected, true);

    logger.info(`SOL deposit verified: ${solReceived} SOL = ${stratToCredit} STRAT (AMM rate: ${swapResult.newPrice.toFixed(4)} SOL/STRAT)`);

    // Check if this transaction was already processed
    const existingBridge = await BridgeTransaction.findOne({ solanaSignature: signature });
    if (existingBridge) {
      return res.status(400).json({ error: 'This transaction has already been processed' });
    }

    // Get user's wallet
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Create a bridge credit transaction on STRAT blockchain (net amount to user)
    const bridgeTx = Transaction.createCoinbaseTx(
      wallet.address,
      req.blockchain.chain.length,
      stratToCredit
    );

    // Create fee collection transaction if fee wallet is configured
    let feeTx = null;
    if (BRIDGE_FEE_WALLET && feeInSTRAT > 0) {
      feeTx = Transaction.createCoinbaseTx(
        BRIDGE_FEE_WALLET,
        req.blockchain.chain.length,
        feeInSTRAT
      );
    }

    // Add to pending transactions
    req.blockchain.pendingTransactions.push(bridgeTx);
    if (feeTx) {
      req.blockchain.pendingTransactions.push(feeTx);
    }

    // Mine a block to credit the tokens immediately
    const block = req.blockchain.minePendingTransactions(wallet.address);

    // Save block to database
    const blockDoc = new BlockModel({
      index: block.index,
      timestamp: block.timestamp,
      transactions: block.transactions,
      previousHash: block.previousHash,
      hash: block.hash,
      nonce: block.nonce,
      difficulty: block.difficulty,
      merkleRoot: block.merkleRoot,
      miner: wallet.address,
      reward: req.blockchain.miningReward,
      totalFees: 0,
      transactionCount: block.transactions.length
    });
    await blockDoc.save();

    // Update wallet balance
    wallet.balance += stratToCredit;
    await wallet.save();

    // Record the bridge transaction
    const bridgeRecord = new BridgeTransaction({
      user: userId,
      walletAddress: wallet.address,
      solanaSignature: signature,
      solAmount: solReceived,
      stratAmount: stratToCredit,
      exchangeRate: stratToCredit / solReceived, // Actual rate received
      status: 'completed'
    });
    await bridgeRecord.save();

    logger.info(`Credited ${stratToCredit} STRAT to user ${userId} from SOL deposit`);

    res.json({
      success: true,
      solReceived,
      stratCredited: stratToCredit,
      exchangeRate: stratToCredit / solReceived,
      priceImpact: ((expectedSTRAT - stratToCredit) / expectedSTRAT * 100).toFixed(2),
      newPrice: swapResult.newPrice,
      newBalance: wallet.balance,
      message: `Successfully bridged ${solReceived} SOL to ${stratToCredit.toFixed(4)} STRAT via AMM`
    });

  } catch (error) {
    logger.error(`Error verifying deposit: ${error.message}`);
    res.status(500).json({ error: 'Failed to verify deposit', details: error.message });
  }
};

/**
 * Get bridge transaction history
 */
exports.getBridgeHistory = async (req, res) => {
  try {
    const userId = req.user._id;

    const bridgeTransactions = await BridgeTransaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50);

    const totalBridged = bridgeTransactions.reduce((sum, tx) => sum + tx.stratAmount, 0);

    res.json({
      transactions: bridgeTransactions.map(tx => ({
        solanaSignature: tx.solanaSignature,
        solAmount: tx.solAmount,
        stratAmount: tx.stratAmount,
        exchangeRate: tx.exchangeRate,
        status: tx.status,
        timestamp: tx.createdAt
      })),
      totalBridged
    });

  } catch (error) {
    logger.error(`Error getting bridge history: ${error.message}`);
    res.status(500).json({ error: 'Failed to get bridge history' });
  }
};
