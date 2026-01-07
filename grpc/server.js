/**
 * gRPC Server Implementation for STRAT Blockchain
 * High-performance RPC service for enterprise integrations
 */

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const logger = require('../utils/logger');

// Load proto file
const PROTO_PATH = path.join(__dirname, 'blockchain.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const stratProto = protoDescriptor.strat.blockchain;

/**
 * Blockchain Service Implementation
 */
function getBlockchainServiceImpl(blockchain) {
  return {
    GetBlockchainInfo: (call, callback) => {
      try {
        const info = {
          blockHeight: blockchain.chain.length,
          difficulty: blockchain.difficulty,
          hashRate: 0,
          totalSupply: 0,
          activeAddresses: blockchain.utxos.size,
          transactionCount: blockchain.chain.reduce((sum, b) => sum + b.transactions.length, 0),
          averageBlockTime: 0,
          pendingTransactions: blockchain.pendingTransactions.length
        };
        callback(null, info);
      } catch (error) {
        callback({
          code: grpc.status.INTERNAL,
          message: error.message
        });
      }
    },

    GetBlock: (call, callback) => {
      try {
        const { height, hash } = call.request;
        let block;

        if (height !== undefined && height !== null) {
          block = blockchain.chain[height];
        } else if (hash) {
          block = blockchain.chain.find(b => b.hash === hash);
        }

        if (!block) {
          return callback({
            code: grpc.status.NOT_FOUND,
            message: 'Block not found'
          });
        }

        callback(null, block);
      } catch (error) {
        callback({
          code: grpc.status.INTERNAL,
          message: error.message
        });
      }
    },

    GetBlocks: (call) => {
      try {
        const { limit = 20, offset = 0 } = call.request;
        const blocks = blockchain.chain.slice(offset, offset + limit);

        blocks.forEach(block => {
          call.write(block);
        });

        call.end();
      } catch (error) {
        call.destroy({
          code: grpc.status.INTERNAL,
          message: error.message
        });
      }
    },

    GetLatestBlocks: (call, callback) => {
      try {
        const { limit = 10 } = call.request;
        const blocks = blockchain.chain.slice(-limit).reverse();
        callback(null, { blocks, total: blockchain.chain.length });
      } catch (error) {
        callback({
          code: grpc.status.INTERNAL,
          message: error.message
        });
      }
    },

    SubscribeNewBlocks: (call) => {
      // Stream new blocks to client
      const intervalId = setInterval(() => {
        const latestBlock = blockchain.chain[blockchain.chain.length - 1];
        if (latestBlock) {
          call.write(latestBlock);
        }
      }, 10000);

      call.on('cancelled', () => {
        clearInterval(intervalId);
      });
    }
  };
}

/**
 * Transaction Service Implementation
 */
function getTransactionServiceImpl(blockchain) {
  return {
    GetTransaction: (call, callback) => {
      try {
        const { txId } = call.request;

        // Search in blocks
        for (const block of blockchain.chain) {
          const tx = block.transactions.find(t => t.id === txId);
          if (tx) {
            return callback(null, {
              ...tx,
              blockHeight: block.index,
              confirmations: blockchain.chain.length - block.index,
              status: 'CONFIRMED'
            });
          }
        }

        // Search in pending
        const pending = blockchain.pendingTransactions.find(t => t.id === txId);
        if (pending) {
          return callback(null, {
            ...pending,
            blockHeight: 0,
            confirmations: 0,
            status: 'PENDING'
          });
        }

        callback({
          code: grpc.status.NOT_FOUND,
          message: 'Transaction not found'
        });
      } catch (error) {
        callback({
          code: grpc.status.INTERNAL,
          message: error.message
        });
      }
    },

    GetTransactions: (call) => {
      try {
        const { address, limit = 20, offset = 0 } = call.request;
        let count = 0;

        for (const block of blockchain.chain) {
          for (const tx of block.transactions) {
            if (!address || tx.from === address || tx.to === address) {
              if (count >= offset && count < offset + limit) {
                call.write({
                  ...tx,
                  blockHeight: block.index,
                  confirmations: blockchain.chain.length - block.index,
                  status: 'CONFIRMED'
                });
              }
              count++;
            }
          }
        }

        call.end();
      } catch (error) {
        call.destroy({
          code: grpc.status.INTERNAL,
          message: error.message
        });
      }
    },

    CreateTransaction: (call, callback) => {
      try {
        const { from, to, amount, privateKey, data } = call.request;
        const tx = blockchain.createTransaction(from, to, amount, privateKey);

        if (data) {
          tx.data = data;
        }

        blockchain.addTransaction(tx);

        callback(null, {
          ...tx,
          blockHeight: 0,
          confirmations: 0,
          status: 'PENDING'
        });
      } catch (error) {
        callback({
          code: grpc.status.INVALID_ARGUMENT,
          message: error.message
        });
      }
    },

    SubmitTransaction: (call, callback) => {
      try {
        const { rawTransaction } = call.request;
        const tx = JSON.parse(rawTransaction);

        blockchain.addTransaction(tx);

        callback(null, {
          txId: tx.id,
          success: true,
          message: 'Transaction submitted successfully'
        });
      } catch (error) {
        callback(null, {
          txId: '',
          success: false,
          message: error.message
        });
      }
    },

    GetPendingTransactions: (call) => {
      try {
        const { limit = 20 } = call.request;
        const pending = blockchain.pendingTransactions.slice(0, limit);

        pending.forEach(tx => {
          call.write({
            ...tx,
            blockHeight: 0,
            confirmations: 0,
            status: 'PENDING'
          });
        });

        call.end();
      } catch (error) {
        call.destroy({
          code: grpc.status.INTERNAL,
          message: error.message
        });
      }
    },

    SubscribeNewTransactions: (call) => {
      const { address } = call.request;

      // In production, this would use a proper pub/sub mechanism
      const intervalId = setInterval(() => {
        const pending = blockchain.pendingTransactions.slice(0, 5);
        pending.forEach(tx => {
          if (!address || tx.from === address || tx.to === address) {
            call.write({
              ...tx,
              blockHeight: 0,
              confirmations: 0,
              status: 'PENDING'
            });
          }
        });
      }, 5000);

      call.on('cancelled', () => {
        clearInterval(intervalId);
      });
    }
  };
}

/**
 * Wallet Service Implementation
 */
function getWalletServiceImpl(blockchain) {
  return {
    GetBalance: (call, callback) => {
      try {
        const { address } = call.request;
        const balance = blockchain.getBalance(address);

        callback(null, {
          confirmed: balance,
          unconfirmed: 0,
          total: balance
        });
      } catch (error) {
        callback({
          code: grpc.status.INTERNAL,
          message: error.message
        });
      }
    },

    GetWallet: (call, callback) => {
      try {
        const { address } = call.request;
        const balance = blockchain.getBalance(address);

        callback(null, {
          address,
          balance,
          publicKey: address,
          nonce: 0
        });
      } catch (error) {
        callback({
          code: grpc.status.INTERNAL,
          message: error.message
        });
      }
    },

    GetUTXOs: (call) => {
      try {
        const { address } = call.request;
        const utxos = Array.from(blockchain.utxos.values())
          .filter(utxo => utxo.address === address);

        utxos.forEach(utxo => {
          call.write({
            ...utxo,
            confirmations: blockchain.chain.length - (utxo.blockHeight || 0)
          });
        });

        call.end();
      } catch (error) {
        call.destroy({
          code: grpc.status.INTERNAL,
          message: error.message
        });
      }
    }
  };
}

/**
 * Smart Contract Service Implementation
 */
function getSmartContractServiceImpl(blockchain) {
  return {
    DeployContract: (call, callback) => {
      try {
        const { owner, code, abi, privateKey } = call.request;
        const address = blockchain.deployContract(owner, code, JSON.parse(abi || '[]'));

        const contract = blockchain.contracts.get(address);

        callback(null, {
          address,
          owner,
          code,
          abi: abi || '[]',
          balance: 0,
          createdAt: Date.now(),
          deploymentTx: contract?.deploymentTx || ''
        });
      } catch (error) {
        callback({
          code: grpc.status.INTERNAL,
          message: error.message
        });
      }
    },

    GetContract: (call, callback) => {
      try {
        const { address } = call.request;
        const contract = blockchain.contracts.get(address);

        if (!contract) {
          return callback({
            code: grpc.status.NOT_FOUND,
            message: 'Contract not found'
          });
        }

        callback(null, {
          address,
          owner: contract.owner,
          code: contract.code,
          abi: JSON.stringify(contract.abi || []),
          balance: contract.balance || 0,
          createdAt: contract.createdAt,
          deploymentTx: contract.deploymentTx
        });
      } catch (error) {
        callback({
          code: grpc.status.INTERNAL,
          message: error.message
        });
      }
    }
  };
}

/**
 * Create and start gRPC server
 */
function createGRPCServer(blockchain, port = 50051) {
  const server = new grpc.Server();

  // Add services
  server.addService(stratProto.BlockchainService.service, getBlockchainServiceImpl(blockchain));
  server.addService(stratProto.TransactionService.service, getTransactionServiceImpl(blockchain));
  server.addService(stratProto.WalletService.service, getWalletServiceImpl(blockchain));
  server.addService(stratProto.SmartContractService.service, getSmartContractServiceImpl(blockchain));

  // Bind server
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
      if (error) {
        logger.error(`gRPC server failed to bind: ${error.message}`);
        return;
      }

      server.start();
      logger.info(`gRPC server running on port ${port}`);
      logger.info('Services available: BlockchainService, TransactionService, WalletService, SmartContractService');
    }
  );

  return server;
}

module.exports = createGRPCServer;
