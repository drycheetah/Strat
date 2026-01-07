const Wallet = require('../models/Wallet');
const SmartContract = require('../models/SmartContract');
const { Transaction } = require('../src/transaction');
const logger = require('../utils/logger');
const { estimateGas, calculateGasPrice } = require('../src/gas');
const crypto = require('crypto');

/**
 * Deploy smart contract
 */
const deployContract = async (req, res) => {
  try {
    const {
      walletId,
      code,
      abi,
      bytecode,
      name,
      description,
      password,
      gasLimit,
      gasPrice,
      tags = [],
      isPublic = false
    } = req.body;
    const blockchain = req.blockchain;

    // Validate required fields
    if (!code || !abi || !bytecode || !name) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'code, abi, bytecode, and name are required'
      });
    }

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

    // Estimate gas if not provided
    const estimatedGas = gasLimit || estimateGas(code, {}, {}, {});
    const finalGasPrice = gasPrice || 1;

    // Create contract deployment transaction
    const tx = Transaction.createContractDeployTx(
      wallet.address,
      code,
      estimatedGas,
      finalGasPrice
    );

    tx.hash = tx.calculateHash();

    // Generate contract address (simplified - in reality, this would be deterministic)
    const contractAddress = '0x' + crypto.randomBytes(20).toString('hex');

    // Create smart contract record
    const smartContract = new SmartContract({
      address: contractAddress,
      name,
      owner: req.user._id,
      deployerAddress: wallet.address,
      deploymentTxHash: tx.hash,
      bytecode,
      abi: typeof abi === 'string' ? JSON.parse(abi) : abi,
      sourceCode: code,
      deploymentBlockNumber: blockchain.chain.length,
      gasUsed: estimatedGas,
      gasPrice: finalGasPrice,
      transactionFee: estimatedGas * finalGasPrice,
      description,
      tags,
      isPublic,
      deploymentWallet: walletId,
      network: process.env.NETWORK || 'mainnet'
    });

    await smartContract.save();

    // Add to blockchain
    blockchain.addTransaction(tx);

    // Broadcast
    if (req.p2pServer) {
      req.p2pServer.broadcastNewTransaction(tx);
    }

    if (req.io) {
      req.io.emit('contract_deployed', {
        deployer: wallet.address,
        contractAddress,
        transactionHash: tx.hash,
        contractName: name
      });
    }

    logger.info(`Contract '${name}' deployment initiated by ${wallet.address} at ${contractAddress}`);

    res.status(201).json({
      success: true,
      message: 'Contract deployment transaction created',
      contract: {
        address: contractAddress,
        name,
        deployerAddress: wallet.address,
        transactionHash: tx.hash,
        gasUsed: estimatedGas,
        gasPrice: finalGasPrice,
        deploymentFee: estimatedGas * finalGasPrice,
        status: 'pending',
        deployedAt: smartContract.deployedAt
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

/**
 * Estimate gas for contract call
 */
const estimateContractGas = async (req, res) => {
  try {
    const { contractAddress, params } = req.body;
    const blockchain = req.blockchain;

    const contract = blockchain.getContract(contractAddress);
    if (!contract) {
      return res.status(404).json({
        error: 'Contract not found'
      });
    }

    const context = {
      caller: req.body.from || 'estimator',
      value: req.body.value || 0,
      blockNumber: blockchain.chain.length,
      timestamp: Date.now(),
      difficulty: blockchain.difficulty
    };

    const gasEstimate = estimateGas(
      contract.code,
      contract.state,
      params || {},
      context
    );

    const mempoolStats = blockchain.mempool.getStats();
    const gasPrice = calculateGasPrice(
      mempoolStats.count,
      mempoolStats.utilization
    );

    const totalCost = gasEstimate * gasPrice;

    res.json({
      success: true,
      gasEstimate,
      gasPrice,
      totalCost,
      mempoolUtilization: mempoolStats.utilization
    });

  } catch (error) {
    logger.error(`Gas estimation error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to estimate gas',
      message: error.message
    });
  }
};

/**
 * Get current gas price
 */
const getGasPrice = async (req, res) => {
  try {
    const blockchain = req.blockchain;
    const mempoolStats = blockchain.mempool.getStats();

    const gasPrice = calculateGasPrice(
      mempoolStats.count,
      mempoolStats.utilization
    );

    res.json({
      success: true,
      gasPrice,
      mempoolSize: mempoolStats.count,
      mempoolUtilization: mempoolStats.utilization,
      recommendation: {
        slow: gasPrice * 0.8,
        standard: gasPrice,
        fast: gasPrice * 1.5,
        instant: gasPrice * 2
      }
    });

  } catch (error) {
    logger.error(`Get gas price error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get gas price',
      message: error.message
    });
  }
};

/**
 * Verify contract on chain
 */
const verifyContract = async (req, res) => {
  try {
    const { contractId, compilerVersion, optimized, contractCode } = req.body;

    const contract = await SmartContract.findOne({
      _id: contractId,
      owner: req.user._id
    });

    if (!contract) {
      return res.status(404).json({
        error: 'Contract not found'
      });
    }

    // Verify source code matches
    if (contractCode && contractCode.trim() !== contract.sourceCode.trim()) {
      return res.status(400).json({
        error: 'Source code verification failed',
        message: 'Provided source code does not match the deployed contract'
      });
    }

    // Verify contract
    await contract.verify(compilerVersion, optimized);

    logger.info(`Contract ${contract.address} verified by owner ${req.user._id}`);

    res.json({
      success: true,
      message: 'Contract verified successfully',
      contract: {
        address: contract.address,
        name: contract.name,
        verified: contract.verified,
        verificationDate: contract.verificationDate,
        compilerVersion: contract.verificationCompiler
      }
    });
  } catch (error) {
    logger.error(`Verify contract error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to verify contract',
      message: error.message
    });
  }
};

/**
 * Get user's contracts
 */
const getUserContracts = async (req, res) => {
  try {
    const { verified, network, isPublic } = req.query;

    const filters = {};
    if (verified !== undefined) filters.verified = verified === 'true';
    if (network) filters.network = network;
    if (isPublic !== undefined) filters.isPublic = isPublic === 'true';

    const contracts = await SmartContract.findByOwner(req.user._id, filters);

    res.json({
      success: true,
      contracts: contracts.map(c => ({
        id: c._id,
        address: c.address,
        name: c.name,
        verified: c.verified,
        deployedAt: c.deployedAt,
        gasUsed: c.gasUsed,
        deploymentFee: c.transactionFee,
        interactionCount: c.interactionCount,
        lastInteraction: c.lastInteraction,
        balance: c.balance
      })),
      count: contracts.length
    });
  } catch (error) {
    logger.error(`Get user contracts error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get contracts',
      message: error.message
    });
  }
};

/**
 * Get contract details
 */
const getContractDetails = async (req, res) => {
  try {
    const { contractId } = req.params;

    const contract = await SmartContract.findById(contractId)
      .populate('owner', 'username email')
      .populate('deploymentWallet', 'address name');

    if (!contract) {
      return res.status(404).json({
        error: 'Contract not found'
      });
    }

    // Check if user is owner or contract is public
    if (contract.owner._id.toString() !== req.user._id.toString() && !contract.isPublic) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'You do not have permission to view this contract'
      });
    }

    res.json({
      success: true,
      contract: {
        id: contract._id,
        address: contract.address,
        name: contract.name,
        description: contract.description,
        owner: {
          id: contract.owner._id,
          username: contract.owner.username
        },
        deployerAddress: contract.deployerAddress,
        deploymentTxHash: contract.deploymentTxHash,
        deploymentBlockNumber: contract.deploymentBlockNumber,
        deployedAt: contract.deployedAt,
        verified: contract.verified,
        verificationDate: contract.verificationDate,
        verificationCompiler: contract.verificationCompiler,
        abi: contract.abi,
        bytecode: contract.bytecode,
        sourceCode: contract.sourceCode,
        balance: contract.balance,
        state: contract.state,
        interactionCount: contract.interactionCount,
        lastInteraction: contract.lastInteraction,
        tags: contract.tags,
        isPublic: contract.isPublic,
        network: contract.network,
        gasUsed: contract.gasUsed,
        gasPrice: contract.gasPrice,
        deploymentFee: contract.transactionFee,
        metadata: contract.metadata
      }
    });
  } catch (error) {
    logger.error(`Get contract details error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get contract details',
      message: error.message
    });
  }
};

/**
 * Update contract metadata
 */
const updateContractMetadata = async (req, res) => {
  try {
    const { contractId } = req.params;
    const { description, tags, isPublic } = req.body;

    const contract = await SmartContract.findOne({
      _id: contractId,
      owner: req.user._id
    });

    if (!contract) {
      return res.status(404).json({
        error: 'Contract not found'
      });
    }

    if (description !== undefined) contract.description = description;
    if (tags !== undefined) contract.tags = tags;
    if (isPublic !== undefined) contract.isPublic = isPublic;

    await contract.save();

    logger.info(`Contract ${contract.address} metadata updated by owner ${req.user._id}`);

    res.json({
      success: true,
      message: 'Contract metadata updated successfully',
      contract: {
        id: contract._id,
        address: contract.address,
        name: contract.name,
        description: contract.description,
        tags: contract.tags,
        isPublic: contract.isPublic
      }
    });
  } catch (error) {
    logger.error(`Update contract metadata error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to update contract',
      message: error.message
    });
  }
};

/**
 * Search verified contracts
 */
const searchContracts = async (req, res) => {
  try {
    const { q, tags, network, limit } = req.query;

    if (!q) {
      return res.status(400).json({
        error: 'Search query required',
        message: 'Please provide a search term'
      });
    }

    const filters = {};
    if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];
    if (network) filters.network = network;
    if (limit) filters.limit = parseInt(limit);

    const contracts = await SmartContract.searchContracts(q, filters);

    res.json({
      success: true,
      contracts: contracts.map(c => ({
        id: c._id,
        address: c.address,
        name: c.name,
        description: c.description,
        owner: c.owner,
        verified: c.verified,
        interactionCount: c.interactionCount,
        tags: c.tags,
        network: c.network
      })),
      count: contracts.length
    });
  } catch (error) {
    logger.error(`Search contracts error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to search contracts',
      message: error.message
    });
  }
};

/**
 * Get popular verified contracts
 */
const getPopularContracts = async (req, res) => {
  try {
    const { network, limit } = req.query;

    const filters = {};
    if (network) filters.network = network;
    if (limit) filters.limit = parseInt(limit) || 20;

    const contracts = await SmartContract.findVerifiedContracts(filters);

    res.json({
      success: true,
      contracts: contracts.map(c => ({
        id: c._id,
        address: c.address,
        name: c.name,
        description: c.description,
        verified: c.verified,
        interactionCount: c.interactionCount,
        tags: c.tags,
        network: c.network,
        balance: c.balance
      })),
      count: contracts.length
    });
  } catch (error) {
    logger.error(`Get popular contracts error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get popular contracts',
      message: error.message
    });
  }
};

/**
 * Delete contract (owner only, soft delete)
 */
const deleteContract = async (req, res) => {
  try {
    const { contractId } = req.params;

    const contract = await SmartContract.findOne({
      _id: contractId,
      owner: req.user._id
    });

    if (!contract) {
      return res.status(404).json({
        error: 'Contract not found'
      });
    }

    await SmartContract.deleteOne({ _id: contractId });

    logger.info(`Contract ${contract.address} deleted by owner ${req.user._id}`);

    res.json({
      success: true,
      message: 'Contract deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete contract error: ${error.message}`);
    res.status(500).json({
      error: 'Failed to delete contract',
      message: error.message
    });
  }
};

module.exports = {
  deployContract,
  callContract,
  getContract,
  getContractState,
  listContracts,
  estimateContractGas,
  getGasPrice,
  verifyContract,
  getUserContracts,
  getContractDetails,
  updateContractMetadata,
  searchContracts,
  getPopularContracts,
  deleteContract
};
