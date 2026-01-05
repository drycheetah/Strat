const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const Wallet = require('../models/Wallet');
const { Transaction } = require('../src/transaction');
const logger = require('../utils/logger');

const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
const BRIDGE_ADDRESS = process.env.BRIDGE_SOL_ADDRESS;
const EXCHANGE_RATE = parseFloat(process.env.BRIDGE_EXCHANGE_RATE) || 5; // 1 SOL = 1000 STRAT

/**
 * Get bridge information
 */
exports.getBridgeInfo = async (req, res) => {
  try {
    res.json({
      bridgeAddress: "7B44YFiRvjFZe7FgRavwKApcpAF452JcMXR4E4befpAq ",
      exchangeRate: EXCHANGE_RATE,
      network: 'mainnet-beta',
      disclaimer: 'EXPERIMENTAL FEATURE: STRAT tokens have no monetary value. This bridge is for testing purposes only.'
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
    const bridgePubkey = new PublicKey(BRIDGE_ADDRESS);
    const postBalances = tx.meta.postBalances;
    const preBalances = tx.meta.preBalances;
    const accountKeys = tx.transaction.message.accountKeys;

    // Find our bridge address in the account keys
    let bridgeIndex = -1;
    for (let i = 0; i < accountKeys.length; i++) {
      const key = accountKeys[i];
      const pubkey = typeof key === 'string' ? new PublicKey(key) : key;
      if (pubkey.equals(bridgePubkey)) {
        bridgeIndex = i;
        break;
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
    const stratToCredit = solReceived * EXCHANGE_RATE;

    logger.info(`SOL deposit verified: ${solReceived} SOL = ${stratToCredit} STRAT`);

    // Get user's wallet
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Create a bridge credit transaction on STRAT blockchain
    const bridgeTx = Transaction.createCoinbaseTx(
      wallet.address,
      req.blockchain.chain.length,
      stratToCredit
    );

    // Add to pending transactions
    req.blockchain.pendingTransactions.push(bridgeTx);

    // Mine a block to credit the tokens immediately
    req.blockchain.minePendingTransactions(wallet.address);

    // Update wallet balance
    wallet.balance += stratToCredit;
    wallet.transactions.push({
      hash: signature,
      type: 'bridge_deposit',
      amount: stratToCredit,
      from: 'SOL Bridge',
      to: wallet.address,
      timestamp: new Date()
    });
    await wallet.save();

    logger.info(`Credited ${stratToCredit} STRAT to user ${userId} from SOL deposit`);

    res.json({
      success: true,
      solReceived,
      stratCredited: stratToCredit,
      exchangeRate: EXCHANGE_RATE,
      newBalance: wallet.balance,
      message: `Successfully bridged ${solReceived} SOL to ${stratToCredit} STRAT`
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
    const wallet = await Wallet.findOne({ user: userId });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const bridgeTransactions = wallet.transactions.filter(tx => tx.type === 'bridge_deposit');

    res.json({
      transactions: bridgeTransactions,
      totalBridged: bridgeTransactions.reduce((sum, tx) => sum + tx.amount, 0)
    });

  } catch (error) {
    logger.error(`Error getting bridge history: ${error.message}`);
    res.status(500).json({ error: 'Failed to get bridge history' });
  }
};
