/**
 * GraphQL Resolvers for STRAT Blockchain
 * Complete resolver implementation for all queries, mutations, and subscriptions
 */

const { PubSub } = require('graphql-subscriptions');
const BlockModel = require('../models/Block');
const UserModel = require('../models/User');
const WalletModel = require('../models/Wallet');
const { GraphQLDateTime, GraphQLJSON } = require('graphql-scalars');

const pubsub = new PubSub();

// Subscription topics
const TOPICS = {
  NEW_BLOCK: 'NEW_BLOCK',
  NEW_TRANSACTION: 'NEW_TRANSACTION',
  BALANCE_CHANGED: 'BALANCE_CHANGED',
  CONTRACT_EVENT: 'CONTRACT_EVENT',
  PRICE_UPDATE: 'PRICE_UPDATE',
  PROPOSAL_UPDATED: 'PROPOSAL_UPDATED'
};

const resolvers = {
  // Custom scalars
  DateTime: GraphQLDateTime,
  JSON: GraphQLJSON,

  // Queries
  Query: {
    // Blockchain queries
    block: async (_, { height, hash }, { blockchain }) => {
      if (height !== undefined) {
        return blockchain.chain[height];
      }
      if (hash) {
        return blockchain.chain.find(b => b.hash === hash);
      }
      throw new Error('Must provide either height or hash');
    },

    blocks: async (_, { first = 20, after, last, before }, { blockchain }) => {
      const blocks = blockchain.chain;
      const totalCount = blocks.length;

      let startIndex = 0;
      let endIndex = totalCount;

      if (after) {
        startIndex = parseInt(after) + 1;
      }
      if (before) {
        endIndex = parseInt(before);
      }

      if (first) {
        endIndex = Math.min(startIndex + first, totalCount);
      }
      if (last) {
        startIndex = Math.max(endIndex - last, 0);
      }

      const selectedBlocks = blocks.slice(startIndex, endIndex);
      const edges = selectedBlocks.map((block, index) => ({
        node: block,
        cursor: String(startIndex + index)
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage: endIndex < totalCount,
          hasPreviousPage: startIndex > 0,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
          totalCount
        }
      };
    },

    latestBlocks: async (_, { limit = 10 }, { blockchain }) => {
      return blockchain.chain.slice(-limit).reverse();
    },

    blockchainStats: async (_, __, { blockchain }) => {
      const stats = {
        blockHeight: blockchain.chain.length,
        difficulty: blockchain.difficulty,
        hashRate: 0, // Calculate based on recent blocks
        totalSupply: 0,
        circulatingSupply: 0,
        activeAddresses: blockchain.utxos.size,
        transactionCount: blockchain.chain.reduce((sum, b) => sum + b.transactions.length, 0),
        averageBlockTime: 0, // Calculate from recent blocks
        pendingTransactions: blockchain.pendingTransactions.length
      };

      // Calculate average block time
      if (blockchain.chain.length > 1) {
        const recent = blockchain.chain.slice(-100);
        const timeDiff = recent[recent.length - 1].timestamp - recent[0].timestamp;
        stats.averageBlockTime = timeDiff / recent.length;
      }

      return stats;
    },

    // Transaction queries
    transaction: async (_, { id }, { blockchain }) => {
      for (const block of blockchain.chain) {
        const tx = block.transactions.find(t => t.id === id);
        if (tx) {
          return {
            ...tx,
            blockHeight: block.index,
            confirmations: blockchain.chain.length - block.index,
            status: 'CONFIRMED'
          };
        }
      }

      const pending = blockchain.pendingTransactions.find(t => t.id === id);
      if (pending) {
        return {
          ...pending,
          blockHeight: null,
          confirmations: 0,
          status: 'PENDING'
        };
      }

      return null;
    },

    transactions: async (_, { address, first = 20, after }, { blockchain }) => {
      let allTxs = [];

      // Get confirmed transactions
      for (const block of blockchain.chain) {
        for (const tx of block.transactions) {
          if (!address || tx.from === address || tx.to === address) {
            allTxs.push({
              ...tx,
              blockHeight: block.index,
              confirmations: blockchain.chain.length - block.index,
              status: 'CONFIRMED'
            });
          }
        }
      }

      // Sort by timestamp descending
      allTxs.sort((a, b) => b.timestamp - a.timestamp);

      const totalCount = allTxs.length;
      let startIndex = after ? parseInt(after) + 1 : 0;
      const selectedTxs = allTxs.slice(startIndex, startIndex + first);

      const edges = selectedTxs.map((tx, index) => ({
        node: tx,
        cursor: String(startIndex + index)
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage: startIndex + first < totalCount,
          hasPreviousPage: startIndex > 0,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
          totalCount
        }
      };
    },

    pendingTransactions: async (_, { limit = 20 }, { blockchain }) => {
      return blockchain.pendingTransactions
        .slice(0, limit)
        .map(tx => ({
          ...tx,
          blockHeight: null,
          confirmations: 0,
          status: 'PENDING'
        }));
    },

    // Wallet queries
    wallet: async (_, { address }, { blockchain }) => {
      const balance = blockchain.getBalance(address);
      const utxos = Array.from(blockchain.utxos.values())
        .filter(utxo => utxo.address === address);

      return {
        address,
        balance,
        publicKey: address, // Simplified
        nonce: 0,
        utxos: utxos.map(utxo => ({
          ...utxo,
          confirmations: blockchain.chain.length - (utxo.blockHeight || 0)
        }))
      };
    },

    balance: async (_, { address }, { blockchain }) => {
      return blockchain.getBalance(address);
    },

    // Smart Contract queries
    contract: async (_, { address }, { blockchain }) => {
      const contract = blockchain.contracts.get(address);
      if (!contract) return null;

      return {
        address,
        owner: contract.owner,
        code: contract.code,
        abi: contract.abi,
        balance: contract.balance || 0,
        createdAt: contract.createdAt,
        deploymentTx: contract.deploymentTx,
        state: contract.state
      };
    },

    contracts: async (_, { owner, first = 20 }, { blockchain }) => {
      let contracts = Array.from(blockchain.contracts.entries()).map(([address, contract]) => ({
        address,
        ...contract
      }));

      if (owner) {
        contracts = contracts.filter(c => c.owner === owner);
      }

      return contracts.slice(0, first);
    },

    // Search
    search: async (_, { query, type }, { blockchain }) => {
      const results = {
        blocks: [],
        transactions: [],
        addresses: [],
        contracts: []
      };

      // Search blocks
      if (!type || type === 'block') {
        const block = blockchain.chain.find(b =>
          b.hash === query || b.index === parseInt(query)
        );
        if (block) results.blocks.push(block);
      }

      // Search transactions
      if (!type || type === 'transaction') {
        for (const block of blockchain.chain) {
          const tx = block.transactions.find(t => t.id === query);
          if (tx) {
            results.transactions.push(tx);
            break;
          }
        }
      }

      // Search addresses
      if (!type || type === 'address') {
        const balance = blockchain.getBalance(query);
        if (balance > 0) {
          results.addresses.push({
            address: query,
            balance
          });
        }
      }

      return results;
    }
  },

  // Mutations
  Mutation: {
    createTransaction: async (_, { from, to, amount, privateKey, data }, { blockchain }) => {
      // Create transaction logic
      const tx = blockchain.createTransaction(from, to, amount, privateKey);
      if (data) {
        tx.data = data;
      }

      blockchain.addTransaction(tx);

      // Publish to subscribers
      pubsub.publish(TOPICS.NEW_TRANSACTION, { newTransaction: tx });

      return {
        ...tx,
        blockHeight: null,
        confirmations: 0,
        status: 'PENDING'
      };
    },

    deployContract: async (_, { owner, code, abi, privateKey }, { blockchain }) => {
      const contractAddress = blockchain.deployContract(owner, code, abi);
      const contract = blockchain.contracts.get(contractAddress);

      return {
        address: contractAddress,
        owner,
        code,
        abi,
        balance: 0,
        createdAt: Date.now(),
        deploymentTx: contract.deploymentTx,
        state: {}
      };
    },

    executeContract: async (_, { contractAddress, method, args, from, privateKey, value }, { blockchain }) => {
      const result = blockchain.executeContract(contractAddress, method, args, from, value);

      return {
        txId: result.txId,
        contractAddress,
        method,
        args,
        result: result.returnValue,
        gasUsed: result.gasUsed || 0,
        success: result.success,
        logs: result.logs || []
      };
    }
  },

  // Subscriptions
  Subscription: {
    newBlock: {
      subscribe: () => pubsub.asyncIterator([TOPICS.NEW_BLOCK])
    },

    newTransaction: {
      subscribe: () => pubsub.asyncIterator([TOPICS.NEW_TRANSACTION])
    },

    balanceChanged: {
      subscribe: (_, { address }) => {
        return pubsub.asyncIterator([`${TOPICS.BALANCE_CHANGED}_${address}`]);
      }
    },

    contractEvent: {
      subscribe: (_, { contractAddress }) => {
        return pubsub.asyncIterator([`${TOPICS.CONTRACT_EVENT}_${contractAddress}`]);
      }
    },

    priceUpdate: {
      subscribe: () => pubsub.asyncIterator([TOPICS.PRICE_UPDATE])
    },

    proposalUpdated: {
      subscribe: (_, { proposalId }) => {
        if (proposalId) {
          return pubsub.asyncIterator([`${TOPICS.PROPOSAL_UPDATED}_${proposalId}`]);
        }
        return pubsub.asyncIterator([TOPICS.PROPOSAL_UPDATED]);
      }
    }
  }
};

// Export pubsub for use in other parts of the application
module.exports = {
  resolvers,
  pubsub,
  TOPICS
};
