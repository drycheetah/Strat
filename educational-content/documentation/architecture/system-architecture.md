# STRAT System Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [Core Components](#core-components)
3. [Network Architecture](#network-architecture)
4. [Data Layer](#data-layer)
5. [Consensus Mechanism](#consensus-mechanism)
6. [Smart Contract Runtime](#smart-contract-runtime)
7. [Security Architecture](#security-architecture)
8. [Scalability Solutions](#scalability-solutions)

---

## Overview

STRAT is built on a modular, layered architecture designed for:
- **Scalability**: Handle thousands of transactions per second
- **Security**: Multi-layered defense mechanisms
- **Flexibility**: Easy integration and upgrades
- **Decentralization**: Truly distributed consensus

### Architecture Layers

```
┌─────────────────────────────────────┐
│     Application Layer (dApps)       │
├─────────────────────────────────────┤
│     Smart Contract Layer            │
├─────────────────────────────────────┤
│     Consensus Layer                 │
├─────────────────────────────────────┤
│     Network Layer (P2P)             │
├─────────────────────────────────────┤
│     Data Storage Layer              │
└─────────────────────────────────────┘
```

---

## Core Components

### 1. Blockchain Core

**Responsibilities**:
- Block creation and validation
- Transaction processing
- State management
- Consensus coordination

**Key Files**:
```
/core
  /blockchain
    - chain.go
    - block.go
    - genesis.go
  /state
    - statedb.go
    - trie.go
  /types
    - transaction.go
    - receipt.go
```

### 2. Virtual Machine (STRAT-VM)

**Based on**: EVM-compatible with optimizations

**Enhancements**:
- 40% faster execution
- Lower gas costs
- Enhanced precompiles
- Custom opcodes for STRAT features

**Architecture**:
```
┌──────────────┐
│   Contract   │
│   Bytecode   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Interpreter  │
│   Engine     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    State     │
│   Database   │
└──────────────┘
```

### 3. Consensus Engine

**Type**: Proof of Stake with Byzantine Fault Tolerance

**Components**:
- Validator selection
- Block proposal
- Vote collection
- Finality determination

**Safety Guarantees**:
- Byzantine fault tolerance (33% malicious nodes)
- Economic security through staking
- Slashing for misbehavior

### 4. Network Layer

**Protocol**: Custom P2P protocol based on libp2p

**Node Types**:
1. **Full Nodes**: Store complete blockchain
2. **Light Nodes**: Store headers only
3. **Archive Nodes**: Store all historical states
4. **Validator Nodes**: Participate in consensus

**Communication**:
```
Node A ←→ Discovery Protocol ←→ Node B
       ←→ Block Propagation ←→
       ←→ Transaction Pool  ←→
       ←→ State Sync       ←→
```

---

## Network Architecture

### Node Discovery

**Process**:
1. Bootstrap from hardcoded peers
2. Exchange peer lists
3. Maintain routing table (Kademlia DHT)
4. Periodic peer refresh

### Block Propagation

**Strategy**: Compact block relay
1. Block header broadcast
2. Transaction short IDs
3. Receivers reconstruct full block
4. Request missing transactions

**Benefits**:
- 90% bandwidth reduction
- Faster propagation
- Reduced orphan rate

### Transaction Pool (Mempool)

**Structure**:
```
Priority Queue (by gas price)
├─── Pending transactions
├─── Queued transactions (nonce gaps)
└─── Future transactions
```

**Eviction Policy**:
- Lowest gas price evicted first
- Age-based eviction for spam
- Account-based limits

---

## Data Layer

### State Storage

**State Trie**: Modified Merkle Patricia Trie

**Structure**:
```
State Root
├─── Account 0x123...
│    ├─── Balance
│    ├─── Nonce
│    ├─── Storage Root
│    └─── Code Hash
├─── Account 0x456...
└─── ...
```

**Optimizations**:
- LevelDB for storage backend
- In-memory caching
- Pruning old states
- Snapshot acceleration

### Database Schema

**Databases**:
1. **ChainDB**: Blocks and receipts
2. **StateDB**: Account state
3. **TxDB**: Transaction index
4. **LogDB**: Event logs

**Key-Value Mappings**:
```
Block:     blockHash → blockData
Receipt:   txHash → receipt
Account:   address → accountData
Storage:   storageKey → storageValue
```

---

## Consensus Mechanism

### Validator Selection

**Criteria**:
- Minimum stake: 1,000 STRAT
- Uptime history
- Slashing history
- Random selection (VRF)

**Validator Set**:
- Active validators: 100
- Rotation every epoch (1 hour)
- Emergency replacement mechanism

### Block Production

**Timeline** (per 3-second slot):
```
0.0s: Validator selected (VRF)
0.5s: Block proposed
1.5s: Votes collected
2.5s: Block finalized
3.0s: Next slot begins
```

### Finality

**Mechanism**: BFT-style voting
- 2/3+ validators must vote
- Two-phase commit
- Instant finality after confirmation

### Fork Choice Rule

**Strategy**: GHOST (Greedy Heaviest Observed SubTree)
- Follow chain with most validator support
- Consider recent votes
- Objective finality after 2 epochs

---

## Smart Contract Runtime

### Execution Environment

**Gas Metering**:
```
Operation         Gas Cost
--------------------------
ADD               3
MUL               5
SSTORE            20,000
SLOAD             200
CREATE            32,000
CALL              700
```

**Memory Model**:
- Stack: 1024 depth limit
- Memory: Dynamic, gas-paid expansion
- Storage: Persistent, high cost

### Contract Deployment

**Process**:
1. Compile Solidity → Bytecode
2. Submit creation transaction
3. VM executes constructor
4. Store bytecode on-chain
5. Return contract address

### Contract Interaction

**Call Types**:
- **CALL**: External call (can modify state)
- **STATICCALL**: Read-only call
- **DELEGATECALL**: Execute in caller's context
- **CALLCODE**: Legacy, deprecated

---

## Security Architecture

### Multi-Layer Security

**Layer 1: Network Security**
- DDoS protection
- Eclipse attack prevention
- Sybil resistance through staking

**Layer 2: Consensus Security**
- Byzantine fault tolerance
- Economic security (attack costs)
- Slashing conditions

**Layer 3: Execution Security**
- Gas limits prevent DOS
- Stack depth limits
- Safe math operations (0.8+)

**Layer 4: Application Security**
- Contract auditing tools
- Formal verification support
- Security best practices

### Attack Vectors and Mitigations

**51% Attack**:
- Cost: >$100M at current prices
- Detection: Automatic fork detection
- Response: Social consensus, checkpointing

**Long-Range Attack**:
- Mitigation: Weak subjectivity
- Checkpoints every 1,000 blocks
- New nodes sync from recent checkpoint

**Nothing-at-Stake**:
- Solution: Slashing for double-signing
- Penalty: 100% stake forfeiture
- Validator reputation tracking

---

## Scalability Solutions

### On-Chain Scaling

**Optimizations**:
- Parallel transaction execution (where possible)
- State rent (future)
- Verkle trees (planned)
- EIP-4844 blob transactions

### Layer 2 Integration

**Supported L2s**:
- Optimistic Rollups
- ZK-Rollups
- State Channels
- Plasma chains

**Bridge Architecture**:
```
STRAT L1 ←→ Bridge Contract ←→ L2 Chain
         ←→ Merkle Proofs  ←→
         ←→ Challenge Period ←→
```

### Sharding (Roadmap)

**Plan**:
- Phase 1: Data sharding (64 shards)
- Phase 2: Execution sharding
- Phase 3: Cross-shard communication

**Benefits**:
- 64x data capacity
- Parallel execution
- Maintained security

---

## Performance Metrics

### Current Throughput

**Mainnet**:
- TPS: 500-1,000
- Block time: 3 seconds
- Finality: 6-9 seconds
- Gas limit: 30M per block

**With L2**:
- Combined TPS: 10,000+
- Sub-second confirmation
- Near-zero fees on L2

### Benchmarks

**Hardware Requirements** (Validator):
- CPU: 8+ cores
- RAM: 32GB+
- Storage: 1TB SSD
- Network: 100Mbps+

---

## Monitoring and Observability

### Metrics Collection

**Node Metrics**:
- Block processing time
- Transaction throughput
- Peer count
- Sync status

**Network Metrics**:
- Validator uptime
- Missed blocks
- Slashing events
- Network participation

### Health Checks

**Endpoints**:
```
GET /health
GET /metrics
GET /status
GET /peers
```

---

## Upgrade Mechanism

### Hard Forks

**Process**:
1. Proposal submitted to governance
2. Community discussion
3. Voting period (2 weeks)
4. Implementation (if passed)
5. Activation at specific block

### Soft Forks

**Backward Compatible**:
- New validation rules (stricter)
- Majority validator adoption
- No consensus split

---

## Future Enhancements

### Roadmap

**Q1 2024**:
- Improved finality (4 seconds)
- Enhanced pruning
- Better light client support

**Q2 2024**:
- Account abstraction
- Native multisig
- Advanced precompiles

**Q3-Q4 2024**:
- Sharding phase 1
- ZK-SNARK integration
- Cross-chain bridges

---

## Developer Resources

### Architecture Diagrams
- System overview
- Component interactions
- Data flow diagrams
- Sequence diagrams

### Code Documentation
- Inline comments
- Architecture Decision Records (ADRs)
- API documentation
- Integration guides

### Community
- Architecture discussion forum
- Weekly developer calls
- Improvement proposals
- Open-source contributions

---

**Document Version**: 1.0
**Last Updated**: 2024-01-01
**Maintainers**: STRAT Core Team
