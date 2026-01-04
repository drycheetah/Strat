const Wallet = require('../models/Wallet');
const { Transaction } = require('../src/transaction');
const logger = require('../utils/logger');

/**
 * Deploy smart contract
 */
const deployContract = async (req, res) => {
  try {
    const { walletId, code, password, gasLimit, gasPrice } = req.body;
    const blockchain = req.blockchain;

    const wallet = await Wallet.findOne({
      _id: walletId,
      user: req.user._id
    });

    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    // Verify password
    const user = await req.user.populate('password');
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid password'
      });
    }

    // Create contract deployment transaction
    const tx = Transaction.createContractDeployTx(
      wallet.address,
      code,
      gasLimit || 100000,
      gasPrice || 1
    );

    tx.hash = tx.calculateHash();

    // Add to blockchain
    blockchain.addTransaction(tx);

    // Broadcast
    if (req.p2pServer) {
      req.p2pServer.broadcastNewTransaction(tx);
    }

    if (req.io) {
      req.io.emit('contract_deployed', {
        deployer: wallet.address,
        transactionHash: tx.hash
      });
    }

    logger.info(`Contract deployment initiated by ${wallet.address}`);

    res.json({
      success: true,
      message: 'Contract deployment transaction created',
      transaction: {
        hash: tx.hash,
        from: wallet.address,
        gasLimit,
        gasPrice,
        status: 'pending'
      }
    });
  } catch (error) {
    logger.error(`Deploy contract error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to deploy contract',
      message: error.message
    });
  }
};

/**
 * Call smart contract
 */
const callContract = async (req, res) => {
  try {
    const { walletId, contractAddress, methodName, params, password, gasLimit, gasPrice } = req.body;
    const blockchain = req.blockchain;

    const wallet = await Wallet.findOne({
      _id: walletId,
      user: req.user._id
    });

    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found'
      });
    }

    // Verify contract exists
    const contract = blockchain.getContract(contractAddress);
    if (!contract) {
      return res.status(404).json({
        error: 'Contract not found',
        message: `No contract at address ${contractAddress}`
      });
    }

    // Verify password
    const user = await req.user.populate('password');
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid password'
      });
    }

    // Create contract call transaction
    const tx = Transaction.createContractCallTx(
      wallet.address,
      contractAddress,
      methodName,
      params || {},
      gasLimit || 100000,
      gasPrice || 1
    );

    tx.hash = tx.calculateHash();

    // Add to blockchain
    blockchain.addTransaction(tx);

    // Broadcast
    if (req.p2pServer) {
      req.p2pServer.broadcastNewTransaction(tx);
    }

    if (req.io) {
      req.io.emit('contract_called', {
        caller: wallet.address,
        contractAddress,
        methodName,
        transactionHash: tx.hash
      });
    }

    logger.info(`Contract ${contractAddress} called by ${wallet.address}, method: ${methodName}`);

    res.json({
      success: true,
      message: 'Contract call transaction created',
      transaction: {
        hash: tx.hash,
        from: wallet.address,
        contractAddress,
        methodName,
        params,
        gasLimit,
        gasPrice,
        status: 'pending'
      }
    });
  } catch (error) {
    logger.error(`Call contract error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to call contract',
      message: error.message
    });
  }
};

/**
 * Get contract information
 */
const getContract = async (req, res) => {
  try {
    const { address } = req.params;
    const blockchain = req.blockchain;

    const contract = blockchain.getContract(address);

    if (!contract) {
      return res.status(404).json({
        error: 'Contract not found'
      });
    }

    res.json({
      success: true,
      contract: {
        address,
        deployer: contract.deployer,
        code: contract.code,
        state: contract.state,
        balance: contract.balance
      }
    });
  } catch (error) {
    logger.error(`Get contract error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get contract',
      message: error.message
    });
  }
};

/**
 * Get contract state
 */
const getContractState = async (req, res) => {
  try {
    const { address } = req.params;
    const blockchain = req.blockchain;

    const contract = blockchain.getContract(address);

    if (!contract) {
      return res.status(404).json({
        error: 'Contract not found'
      });
    }

    res.json({
      success: true,
      address,
      state: contract.state
    });
  } catch (error) {
    logger.error(`Get contract state error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get contract state',
      message: error.message
    });
  }
};

/**
 * List all contracts
 */
const listContracts = async (req, res) => {
  try {
    const blockchain = req.blockchain;
    const contracts = [];

    for (let [address, contract] of blockchain.contracts) {
      contracts.push({
        address,
        deployer: contract.deployer,
        balance: contract.balance,
        hasState: Object.keys(contract.state).length > 0
      });
    }

    res.json({
      success: true,
      contracts,
      count: contracts.length
    });
  } catch (error) {
    logger.error(`List contracts error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to list contracts',
      message: error.message
    });
  }
};

module.exports = {
  deployContract,
  callContract,
  getContract,
  getContractState,
  listContracts
};
