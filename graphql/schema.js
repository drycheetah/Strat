/**
 * GraphQL Schema for STRAT Blockchain
 * Complete type definitions for all blockchain operations
 */

const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar DateTime
  scalar JSON

  # Blockchain Types
  type Block {
    index: Int!
    hash: String!
    previousHash: String!
    timestamp: DateTime!
    transactions: [Transaction!]!
    merkleRoot: String!
    nonce: Int!
    difficulty: Int!
    miner: String
    reward: Float
    size: Int
    transactionCount: Int!
  }

  type Transaction {
    id: String!
    from: String!
    to: String!
    amount: Float!
    fee: Float!
    timestamp: DateTime!
    blockHeight: Int
    confirmations: Int!
    status: TransactionStatus!
    signature: String!
    inputs: [TransactionInput!]
    outputs: [TransactionOutput!]
    data: JSON
  }

  type TransactionInput {
    txId: String!
    outputIndex: Int!
    address: String!
    amount: Float!
    signature: String!
  }

  type TransactionOutput {
    address: String!
    amount: Float!
    spent: Boolean!
  }

  enum TransactionStatus {
    PENDING
    CONFIRMED
    FAILED
  }

  # Wallet Types
  type Wallet {
    address: String!
    balance: Float!
    publicKey: String!
    nonce: Int!
    transactions: [Transaction!]
    utxos: [UTXO!]
  }

  type UTXO {
    txId: String!
    outputIndex: Int!
    address: String!
    amount: Float!
    confirmations: Int!
  }

  # Smart Contract Types
  type SmartContract {
    address: String!
    owner: String!
    code: String!
    abi: JSON
    balance: Float!
    createdAt: DateTime!
    deploymentTx: String!
    state: JSON
  }

  type ContractExecution {
    txId: String!
    contractAddress: String!
    method: String!
    args: JSON
    result: JSON
    gasUsed: Int!
    success: Boolean!
    logs: [String!]
  }

  # NFT Types
  type NFT {
    id: ID!
    tokenId: String!
    contractAddress: String!
    owner: String!
    creator: String!
    metadata: NFTMetadata!
    royalty: Float
    listingPrice: Float
    forSale: Boolean!
    createdAt: DateTime!
  }

  type NFTMetadata {
    name: String!
    description: String
    image: String
    attributes: [NFTAttribute!]
    externalUrl: String
  }

  type NFTAttribute {
    traitType: String!
    value: String!
  }

  # Staking Types
  type StakePosition {
    id: ID!
    address: String!
    amount: Float!
    startTime: DateTime!
    lockPeriod: Int!
    apy: Float!
    rewards: Float!
    status: StakeStatus!
  }

  enum StakeStatus {
    ACTIVE
    LOCKED
    UNLOCKED
    WITHDRAWN
  }

  # Governance Types
  type Proposal {
    id: ID!
    proposer: String!
    title: String!
    description: String!
    type: ProposalType!
    status: ProposalStatus!
    votesFor: Float!
    votesAgainst: Float!
    startTime: DateTime!
    endTime: DateTime!
    quorum: Float!
    executed: Boolean!
  }

  enum ProposalType {
    PARAMETER_CHANGE
    PROTOCOL_UPGRADE
    TREASURY_ALLOCATION
    COMMUNITY_PROPOSAL
  }

  enum ProposalStatus {
    PENDING
    ACTIVE
    PASSED
    REJECTED
    EXECUTED
  }

  type Vote {
    id: ID!
    proposalId: ID!
    voter: String!
    support: Boolean!
    votingPower: Float!
    timestamp: DateTime!
  }

  # DeFi Types
  type LiquidityPool {
    id: ID!
    token0: String!
    token1: String!
    reserve0: Float!
    reserve1: Float!
    totalLiquidity: Float!
    fee: Float!
    apy: Float!
  }

  type Order {
    id: ID!
    type: OrderType!
    trader: String!
    tokenIn: String!
    tokenOut: String!
    amountIn: Float!
    amountOut: Float!
    price: Float!
    status: OrderStatus!
    createdAt: DateTime!
    filledAt: DateTime
  }

  enum OrderType {
    MARKET
    LIMIT
    STOP_LOSS
  }

  enum OrderStatus {
    OPEN
    FILLED
    CANCELLED
    EXPIRED
  }

  # Stats and Analytics
  type BlockchainStats {
    blockHeight: Int!
    difficulty: Int!
    hashRate: Float!
    totalSupply: Float!
    circulatingSupply: Float!
    activeAddresses: Int!
    transactionCount: Int!
    averageBlockTime: Float!
    pendingTransactions: Int!
  }

  type PriceData {
    price: Float!
    change24h: Float!
    volume24h: Float!
    marketCap: Float!
    high24h: Float!
    low24h: Float!
  }

  # Pagination
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
    totalCount: Int!
  }

  type BlockConnection {
    edges: [BlockEdge!]!
    pageInfo: PageInfo!
  }

  type BlockEdge {
    node: Block!
    cursor: String!
  }

  type TransactionConnection {
    edges: [TransactionEdge!]!
    pageInfo: PageInfo!
  }

  type TransactionEdge {
    node: Transaction!
    cursor: String!
  }

  # Queries
  type Query {
    # Blockchain
    block(height: Int, hash: String): Block
    blocks(first: Int, after: String, last: Int, before: String): BlockConnection!
    latestBlocks(limit: Int = 10): [Block!]!
    blockchainStats: BlockchainStats!

    # Transactions
    transaction(id: String!): Transaction
    transactions(
      address: String
      first: Int
      after: String
      last: Int
      before: String
    ): TransactionConnection!
    pendingTransactions(limit: Int = 20): [Transaction!]!

    # Wallets
    wallet(address: String!): Wallet
    balance(address: String!): Float!

    # Smart Contracts
    contract(address: String!): SmartContract
    contracts(owner: String, first: Int, after: String): [SmartContract!]!

    # NFTs
    nft(id: ID!): NFT
    nfts(owner: String, creator: String, first: Int, after: String): [NFT!]!

    # Staking
    stakePosition(id: ID!): StakePosition
    stakePositions(address: String!): [StakePosition!]!
    stakingStats: JSON!

    # Governance
    proposal(id: ID!): Proposal
    proposals(status: ProposalStatus, first: Int, after: String): [Proposal!]!
    vote(id: ID!): Vote
    votes(proposalId: ID!, voter: String): [Vote!]!

    # DeFi
    liquidityPool(id: ID!): LiquidityPool
    liquidityPools: [LiquidityPool!]!
    order(id: ID!): Order
    orders(trader: String, status: OrderStatus): [Order!]!

    # Price and Market
    price: PriceData!

    # Search
    search(query: String!, type: String): JSON!
  }

  # Mutations
  type Mutation {
    # Transactions
    createTransaction(
      from: String!
      to: String!
      amount: Float!
      privateKey: String!
      data: JSON
    ): Transaction!

    submitTransaction(signedTx: JSON!): Transaction!

    # Smart Contracts
    deployContract(
      owner: String!
      code: String!
      abi: JSON
      privateKey: String!
    ): SmartContract!

    executeContract(
      contractAddress: String!
      method: String!
      args: JSON
      from: String!
      privateKey: String!
      value: Float
    ): ContractExecution!

    # NFTs
    mintNFT(
      owner: String!
      metadata: JSON!
      royalty: Float
      privateKey: String!
    ): NFT!

    transferNFT(
      tokenId: String!
      from: String!
      to: String!
      privateKey: String!
    ): NFT!

    listNFT(tokenId: String!, price: Float!): NFT!
    buyNFT(tokenId: String!, buyer: String!, privateKey: String!): NFT!

    # Staking
    stake(address: String!, amount: Float!, lockPeriod: Int!, privateKey: String!): StakePosition!
    unstake(stakeId: ID!, privateKey: String!): StakePosition!
    claimRewards(stakeId: ID!, privateKey: String!): Float!

    # Governance
    createProposal(
      proposer: String!
      title: String!
      description: String!
      type: ProposalType!
      privateKey: String!
    ): Proposal!

    vote(
      proposalId: ID!
      voter: String!
      support: Boolean!
      privateKey: String!
    ): Vote!

    executeProposal(proposalId: ID!, executor: String!, privateKey: String!): Proposal!

    # DeFi
    addLiquidity(
      poolId: ID!
      token0Amount: Float!
      token1Amount: Float!
      provider: String!
      privateKey: String!
    ): LiquidityPool!

    removeLiquidity(
      poolId: ID!
      liquidity: Float!
      provider: String!
      privateKey: String!
    ): LiquidityPool!

    swap(
      tokenIn: String!
      tokenOut: String!
      amountIn: Float!
      minAmountOut: Float!
      trader: String!
      privateKey: String!
    ): Order!

    createOrder(
      type: OrderType!
      tokenIn: String!
      tokenOut: String!
      amountIn: Float!
      price: Float!
      trader: String!
      privateKey: String!
    ): Order!

    cancelOrder(orderId: ID!, trader: String!, privateKey: String!): Order!
  }

  # Subscriptions
  type Subscription {
    # Real-time updates
    newBlock: Block!
    newTransaction: Transaction!
    balanceChanged(address: String!): Float!
    contractEvent(contractAddress: String!): JSON!
    priceUpdate: PriceData!
    proposalUpdated(proposalId: ID): Proposal!
  }
`;

module.exports = typeDefs;
