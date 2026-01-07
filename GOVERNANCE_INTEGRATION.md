# DAO Governance System Integration Guide

## Overview
This document describes the complete DAO governance system for STRAT, including models, controllers, routes, and integration instructions.

## Files Created

### Models
1. **c:\Users\drych\Videos\Strat\models\Proposal.js** - Proposal model for governance proposals
2. **c:\Users\drych\Videos\Strat\models\Vote.js** - Vote tracking model
3. **c:\Users\drych\Videos\Strat\models\Delegation.js** - Voting power delegation model

### Controllers
4. **c:\Users\drych\Videos\Strat\controllers\governanceController.js** - All governance logic

### Routes
5. **c:\Users\drych\Videos\Strat\routes\governance.routes.js** - API endpoints for governance

## Integration Steps

### Step 1: Register Routes in server.js

Add the governance routes to your server. In `server.js`, add this line near the other route imports (around line 27):

```javascript
const governanceRoutes = require('./routes/governance.routes');
```

Then add the route registration in the `setupRoutes()` method (around line 223):

```javascript
this.app.use('/api/governance', governanceRoutes);
```

### Step 2: Update API Documentation

In the `setupRoutes()` method, update the API documentation endpoint (around line 228) to include governance:

```javascript
this.app.get('/api', (req, res) => {
  res.json({
    name: 'STRAT Blockchain API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      wallets: '/api/wallets',
      blockchain: '/api/blockchain',
      transactions: '/api/transactions',
      contracts: '/api/contracts',
      bridge: '/api/bridge',
      staking: '/api/staking',
      governance: '/api/governance'  // ADD THIS LINE
    },
    documentation: '/api/docs'
  });
});
```

## API Endpoints

### Proposals

#### Create Proposal
```http
POST /api/governance/proposals
Content-Type: application/json

{
  "title": "Increase Block Reward to 60 STRAT",
  "description": "Proposal to increase mining rewards from 50 to 60 STRAT per block to incentivize more miners.",
  "proposer": "wallet_address",
  "executionData": {
    "type": "parameter_change",
    "target": "block_reward",
    "value": 60,
    "description": "Change block reward parameter"
  },
  "votingPeriodDays": 7,
  "quorum": 0.1,
  "passingThreshold": 0.5
}
```

**Requirements:**
- Proposer must have at least 100 STRAT staked
- Execution types: `parameter_change`, `treasury_transfer`, `contract_upgrade`, `custom`

#### Get All Proposals
```http
GET /api/governance/proposals?status=active&page=1&limit=20
```

**Query Parameters:**
- `status` - Filter by status: pending, active, passed, rejected, executed, cancelled
- `proposer` - Filter by proposer address
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)
- `sortBy` - Sort field (default: createdAt)
- `order` - Sort order: asc, desc (default: desc)

#### Get Proposal Details
```http
GET /api/governance/proposals/:proposalId
```

Returns detailed information including vote breakdown and recent votes.

#### Execute Proposal
```http
POST /api/governance/proposals/:proposalId/execute
Content-Type: application/json

{
  "executor": "wallet_address"
}
```

**Requirements:**
- Proposal must have passed
- Voting period must have ended
- Must meet quorum and passing threshold

### Voting

#### Cast Vote
```http
POST /api/governance/proposals/:proposalId/vote
Content-Type: application/json

{
  "voter": "wallet_address",
  "support": true,
  "reason": "I support this proposal because..."
}
```

**Parameters:**
- `support` - true for vote FOR, false for vote AGAINST
- `reason` - Optional explanation (max 1000 characters)

**Requirements:**
- Proposal must be active
- Voter must have voting power (staked tokens or delegated power)
- One vote per address per proposal

#### Get Voting History
```http
GET /api/governance/voting-history/:address?limit=50
```

Returns all votes cast by an address with statistics.

#### Get Voting Power
```http
GET /api/governance/voting-power/:address
```

Returns:
- Staked tokens
- Delegated voting power (to others)
- Received voting power (from others)
- Total available voting power

### Delegation

#### Delegate Voting Power
```http
POST /api/governance/delegate
Content-Type: application/json

{
  "delegator": "your_wallet_address",
  "delegate": "trusted_delegate_address",
  "amount": 1000
}
```

**Requirements:**
- Must have amount of STRAT staked
- Cannot delegate to yourself
- Cannot have existing delegation to same address

#### Revoke Delegation
```http
POST /api/governance/delegations/:delegationId/revoke
```

### Statistics

#### Get Governance Stats
```http
GET /api/governance/stats
```

Returns:
- Total proposals and breakdown by status
- Total votes cast
- Active delegations
- Top delegates
- Recent proposals
- Governance parameters

## Governance Parameters

### Proposal Creation
- **Minimum Stake Required:** 100 STRAT
- **Default Voting Period:** 7 days
- **Default Quorum:** 10% of total staked tokens
- **Default Passing Threshold:** 50% of votes in favor

### Voting Power Calculation
```
Voting Power = Staked Tokens + Delegated Voting Power
```

### Proposal States
1. **pending** - Created but not yet started
2. **active** - Currently open for voting
3. **passed** - Voting ended, proposal passed
4. **rejected** - Voting ended, proposal failed
5. **executed** - Proposal successfully executed
6. **cancelled** - Proposal cancelled by governance

## Database Schema

### Proposal Model
```javascript
{
  title: String,
  description: String,
  proposer: String,
  proposerStake: Number,
  votesFor: Number,
  votesAgainst: Number,
  status: String,
  startTime: Date,
  endTime: Date,
  executionData: {
    type: String,
    target: String,
    value: Mixed,
    calldata: String,
    description: String
  },
  quorum: Number,
  passingThreshold: Number,
  executedAt: Date,
  executedBy: String
}
```

### Vote Model
```javascript
{
  proposal: ObjectId,
  voter: String,
  support: Boolean,
  votingPower: Number,
  delegatedFrom: String,
  reason: String,
  timestamp: Date
}
```

### Delegation Model
```javascript
{
  delegator: String,
  delegate: String,
  votingPower: Number,
  active: Boolean,
  startBlock: Number,
  revokedAt: Date
}
```

## WebSocket Events

The governance system emits the following WebSocket events:

### proposal_created
```javascript
{
  proposalId: String,
  title: String,
  proposer: String,
  endTime: Date
}
```

### vote_cast
```javascript
{
  proposalId: String,
  voter: String,
  support: Boolean,
  votingPower: Number,
  votesFor: Number,
  votesAgainst: Number
}
```

### proposal_executed
```javascript
{
  proposalId: String,
  title: String,
  executedBy: String,
  executionResult: Object
}
```

### delegation_created
```javascript
{
  delegate: String,
  amount: Number
}
```

### delegation_received
```javascript
{
  delegator: String,
  amount: Number
}
```

### delegation_revoked
```javascript
{
  delegationId: String,
  delegate: String,
  amount: Number
}
```

## Example Usage Flows

### 1. Creating and Voting on a Proposal

```javascript
// Step 1: Create proposal
const createResponse = await fetch('http://localhost:3000/api/governance/proposals', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: "Reduce Transaction Fees",
    description: "Proposal to reduce minimum transaction fee from 0.01 to 0.005 STRAT",
    proposer: "wallet123",
    executionData: {
      type: "parameter_change",
      target: "min_transaction_fee",
      value: 0.005,
      description: "Update minimum transaction fee"
    },
    votingPeriodDays: 7
  })
});

const { proposal } = await createResponse.json();
const proposalId = proposal.id;

// Step 2: Vote on proposal
await fetch(`http://localhost:3000/api/governance/proposals/${proposalId}/vote`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    voter: "wallet456",
    support: true,
    reason: "Lower fees will increase adoption"
  })
});

// Step 3: After voting period ends, execute if passed
await fetch(`http://localhost:3000/api/governance/proposals/${proposalId}/execute`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    executor: "wallet123"
  })
});
```

### 2. Delegating Voting Power

```javascript
// Delegate 1000 STRAT worth of voting power
const delegateResponse = await fetch('http://localhost:3000/api/governance/delegate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    delegator: "myWallet",
    delegate: "trustedDelegate",
    amount: 1000
  })
});

const { delegation } = await delegateResponse.json();

// Later, revoke the delegation
await fetch(`http://localhost:3000/api/governance/delegations/${delegation.id}/revoke`, {
  method: 'POST'
});
```

### 3. Monitoring Governance Activity

```javascript
// Get all active proposals
const proposals = await fetch('http://localhost:3000/api/governance/proposals?status=active')
  .then(r => r.json());

// Get voting power
const power = await fetch('http://localhost:3000/api/governance/voting-power/myWallet')
  .then(r => r.json());

// Get governance statistics
const stats = await fetch('http://localhost:3000/api/governance/stats')
  .then(r => r.json());
```

## Security Considerations

1. **Proposal Creation Threshold:** Requires 100 STRAT staked to prevent spam
2. **One Vote Per Address:** Enforced by unique compound index
3. **Voting Power Verification:** Calculated from actual staked tokens
4. **Delegation Validation:** Cannot delegate more than staked amount
5. **Execution Validation:** Proposals must pass quorum and threshold

## Future Enhancements

Consider implementing:
1. Time-locked execution delays for security
2. Emergency pause mechanism for critical issues
3. Proposal cancellation with governance vote
4. Multi-signature execution for high-value proposals
5. Automated proposal execution after passing
6. Snapshot-based voting power calculation
7. Quadratic voting to reduce whale dominance
8. Proposal categories with different parameters

## Testing

Test the governance system with these scenarios:

1. **Proposal Creation:** Verify threshold enforcement
2. **Voting:** Test voting power calculation with staked and delegated tokens
3. **Quorum:** Test proposals that fail to reach quorum
4. **Delegation:** Test delegation creation, usage, and revocation
5. **Execution:** Test all execution types
6. **Edge Cases:** Test concurrent votes, delegation changes during voting

## Troubleshooting

### Proposal Creation Fails
- Check proposer has at least 100 STRAT staked
- Verify execution data format is correct
- Ensure all required fields are provided

### Vote Fails
- Verify proposal is currently active
- Check voter hasn't already voted
- Confirm voter has voting power (staked or delegated)

### Delegation Fails
- Verify delegator has sufficient staked tokens
- Check for existing delegation to same address
- Ensure delegator != delegate

## Support

For questions or issues with the governance system, refer to:
- API documentation at `/api`
- Proposal model at `models/Proposal.js`
- Controller logic at `controllers/governanceController.js`
