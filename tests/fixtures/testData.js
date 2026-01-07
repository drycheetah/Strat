// Test data fixtures for consistent testing

module.exports = {
  // Sample users
  users: {
    admin: {
      username: 'admin',
      email: 'admin@strat.com',
      password: 'Admin123!@#',
      role: 'admin'
    },
    user1: {
      username: 'testuser1',
      email: 'user1@test.com',
      password: 'User123!@#'
    },
    user2: {
      username: 'testuser2',
      email: 'user2@test.com',
      password: 'User456!@#'
    }
  },

  // Sample transactions
  transactions: {
    valid: {
      from: '0x1234567890123456789012345678901234567890',
      to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      amount: 100,
      fee: 0.1
    },
    largeFee: {
      from: '0x1111111111111111111111111111111111111111',
      to: '0x2222222222222222222222222222222222222222',
      amount: 50,
      fee: 5.0
    },
    smallAmount: {
      from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      amount: 0.001,
      fee: 0.01
    }
  },

  // Sample NFTs
  nfts: {
    legendary: {
      name: 'Legendary Dragon',
      description: 'A rare legendary dragon NFT',
      metadata: {
        rarity: 'legendary',
        power: 100,
        attributes: ['fire', 'flying']
      }
    },
    common: {
      name: 'Common Sword',
      description: 'A basic sword NFT',
      metadata: {
        rarity: 'common',
        power: 10,
        attributes: ['weapon']
      }
    }
  },

  // Sample proposals
  proposals: {
    parameter: {
      title: 'Increase Block Reward',
      description: 'Proposal to increase mining reward from 50 to 75 STRAT',
      type: 'parameter',
      parameters: {
        miningReward: 75
      }
    },
    upgrade: {
      title: 'Protocol Upgrade v2.0',
      description: 'Major protocol upgrade with new features',
      type: 'upgrade',
      parameters: {
        version: '2.0.0',
        features: ['sharding', 'layer2']
      }
    }
  },

  // Sample orders
  orders: {
    buy: {
      type: 'buy',
      pair: 'STRAT/USDT',
      amount: 100,
      price: 10.50
    },
    sell: {
      type: 'sell',
      pair: 'STRAT/USDT',
      amount: 50,
      price: 11.00
    }
  },

  // Sample blocks
  blocks: {
    genesis: {
      index: 0,
      previousHash: '0',
      timestamp: 1609459200000,
      nonce: 0
    },
    valid: {
      index: 1,
      previousHash: 'abc123',
      timestamp: Date.now(),
      nonce: 12345
    }
  },

  // Sample smart contracts
  contracts: {
    token: {
      name: 'TestToken',
      symbol: 'TST',
      totalSupply: 1000000,
      code: `
        function transfer(to, amount) {
          if (balances[msg.sender] >= amount) {
            balances[msg.sender] -= amount;
            balances[to] += amount;
            return true;
          }
          return false;
        }
      `
    },
    nft: {
      name: 'TestNFT',
      code: `
        function mint(to, tokenId) {
          owners[tokenId] = to;
          return true;
        }
      `
    }
  },

  // Sample addresses
  addresses: {
    valid: [
      '0x1234567890123456789012345678901234567890',
      '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      '0x9876543210987654321098765432109876543210'
    ],
    invalid: [
      'not-an-address',
      '0x123', // Too short
      'xyz' // Invalid characters
    ]
  },

  // Sample errors
  errors: {
    unauthorized: 'Unauthorized access',
    notFound: 'Resource not found',
    badRequest: 'Bad request',
    insufficientBalance: 'Insufficient balance'
  },

  // Sample JWT tokens (for testing only - not real secrets)
  tokens: {
    valid: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature',
    expired: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.signature',
    invalid: 'invalid.token.format'
  }
};
