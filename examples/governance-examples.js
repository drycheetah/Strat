/**
 * STRAT DAO Governance System - Usage Examples
 *
 * This file contains practical examples of using the governance system API
 */

const API_BASE = 'http://localhost:3000/api/governance';

// ============================================================================
// PROPOSAL EXAMPLES
// ============================================================================

/**
 * Example 1: Create a Parameter Change Proposal
 * Use case: Change block reward from 50 to 60 STRAT
 */
async function createParameterChangeProposal() {
  const response = await fetch(`${API_BASE}/proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: "Increase Block Mining Reward",
      description: "This proposal aims to increase the block reward from 50 STRAT to 60 STRAT to incentivize more miners to join the network and improve security.",
      proposer: "your_wallet_address_here",
      executionData: {
        type: "parameter_change",
        target: "block_reward",
        value: 60,
        description: "Update block reward parameter from 50 to 60 STRAT"
      },
      votingPeriodDays: 7,
      quorum: 0.1,              // 10% participation required
      passingThreshold: 0.5      // 50% must vote in favor
    })
  });

  const result = await response.json();
  console.log('Proposal created:', result);
  return result.proposal.id;
}

/**
 * Example 2: Create a Treasury Transfer Proposal
 * Use case: Allocate funds for development
 */
async function createTreasuryProposal() {
  const response = await fetch(`${API_BASE}/proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: "Development Fund Allocation",
      description: "Allocate 10,000 STRAT from treasury to fund development of mobile wallet application. Team has provided detailed roadmap and budget breakdown.",
      proposer: "your_wallet_address_here",
      executionData: {
        type: "treasury_transfer",
        target: "dev_team_wallet_address",
        value: 10000,
        description: "Transfer 10,000 STRAT for mobile wallet development"
      },
      votingPeriodDays: 14,     // Longer period for financial decisions
      quorum: 0.15,             // Higher quorum for treasury
      passingThreshold: 0.66    // Super-majority required
    })
  });

  const result = await response.json();
  console.log('Treasury proposal created:', result);
  return result.proposal.id;
}

/**
 * Example 3: Create a Contract Upgrade Proposal
 * Use case: Upgrade smart contract to new version
 */
async function createContractUpgradeProposal() {
  const response = await fetch(`${API_BASE}/proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: "Upgrade DEX Contract to v2.0",
      description: "Upgrade the DEX smart contract to version 2.0 which includes gas optimizations, improved security, and new features like limit orders.",
      proposer: "your_wallet_address_here",
      executionData: {
        type: "contract_upgrade",
        target: "dex_contract_address",
        value: "v2.0.0",
        calldata: "0x...", // Contract upgrade calldata
        description: "Upgrade DEX contract to version 2.0"
      },
      votingPeriodDays: 10,
      quorum: 0.2,
      passingThreshold: 0.75    // High threshold for contract changes
    })
  });

  const result = await response.json();
  console.log('Contract upgrade proposal created:', result);
  return result.proposal.id;
}

/**
 * Example 4: Create a Custom Proposal
 * Use case: Any custom governance action
 */
async function createCustomProposal() {
  const response = await fetch(`${API_BASE}/proposals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: "Establish Partnership with DeFi Protocol",
      description: "Vote to establish official partnership with Protocol X for cross-chain liquidity provision. This is a signaling proposal to gauge community support.",
      proposer: "your_wallet_address_here",
      executionData: {
        type: "custom",
        description: "Community vote on partnership establishment - no on-chain execution"
      },
      votingPeriodDays: 5,
      quorum: 0.05,             // Lower quorum for signaling votes
      passingThreshold: 0.5
    })
  });

  const result = await response.json();
  console.log('Custom proposal created:', result);
  return result.proposal.id;
}

// ============================================================================
// VOTING EXAMPLES
// ============================================================================

/**
 * Example 5: Cast a Vote FOR a Proposal
 */
async function voteFor(proposalId) {
  const response = await fetch(`${API_BASE}/proposals/${proposalId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      voter: "your_wallet_address_here",
      support: true,
      reason: "I support this proposal because it will improve network security and decentralization by attracting more miners."
    })
  });

  const result = await response.json();
  console.log('Vote cast:', result);
  return result;
}

/**
 * Example 6: Cast a Vote AGAINST a Proposal
 */
async function voteAgainst(proposalId) {
  const response = await fetch(`${API_BASE}/proposals/${proposalId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      voter: "your_wallet_address_here",
      support: false,
      reason: "This change could lead to inflation issues. We should wait for more data before making this decision."
    })
  });

  const result = await response.json();
  console.log('Vote cast:', result);
  return result;
}

// ============================================================================
// DELEGATION EXAMPLES
// ============================================================================

/**
 * Example 7: Delegate Voting Power
 * Use case: Delegate to a trusted community member
 */
async function delegateVotingPower() {
  const response = await fetch(`${API_BASE}/delegate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      delegator: "your_wallet_address_here",
      delegate: "trusted_delegate_address_here",
      amount: 1000  // Delegate 1000 STRAT worth of voting power
    })
  });

  const result = await response.json();
  console.log('Voting power delegated:', result);
  return result.delegation.id;
}

/**
 * Example 8: Revoke Delegation
 */
async function revokeDelegation(delegationId) {
  const response = await fetch(`${API_BASE}/delegations/${delegationId}/revoke`, {
    method: 'POST'
  });

  const result = await response.json();
  console.log('Delegation revoked:', result);
  return result;
}

// ============================================================================
// QUERY EXAMPLES
// ============================================================================

/**
 * Example 9: Get All Active Proposals
 */
async function getActiveProposals() {
  const response = await fetch(`${API_BASE}/proposals?status=active&limit=20`);
  const result = await response.json();

  console.log('Active proposals:', result.proposals);
  result.proposals.forEach(proposal => {
    console.log(`
      ID: ${proposal.id}
      Title: ${proposal.title}
      Votes For: ${proposal.stats.votesFor}
      Votes Against: ${proposal.stats.votesAgainst}
      Time Remaining: ${Math.floor(proposal.stats.timeRemaining / (1000 * 60 * 60))} hours
    `);
  });

  return result.proposals;
}

/**
 * Example 10: Get Proposal Details
 */
async function getProposalDetails(proposalId) {
  const response = await fetch(`${API_BASE}/proposals/${proposalId}`);
  const result = await response.json();

  const proposal = result.proposal;
  console.log(`
    Title: ${proposal.title}
    Status: ${proposal.status}
    Proposer: ${proposal.proposer}

    Voting Stats:
    - Total Votes: ${proposal.stats.totalVotes}
    - Votes For: ${proposal.stats.votesFor}
    - Votes Against: ${proposal.stats.votesAgainst}
    - Vote Percentage: ${proposal.stats.votePercentage}%
    - Quorum Reached: ${proposal.stats.hasReachedQuorum}
    - Has Passed: ${proposal.stats.hasPassed}

    Execution Data:
    - Type: ${proposal.executionData.type}
    - Target: ${proposal.executionData.target}
    - Value: ${proposal.executionData.value}
  `);

  return proposal;
}

/**
 * Example 11: Get Voting Power
 */
async function getVotingPower(address) {
  const response = await fetch(`${API_BASE}/voting-power/${address}`);
  const result = await response.json();

  console.log(`
    Voting Power for ${address}:
    - Staked: ${result.votingPower.staked} STRAT
    - Delegated to others: ${result.votingPower.delegatedTo} STRAT
    - Delegated from others: ${result.votingPower.delegatedFrom} STRAT
    - Total voting power: ${result.votingPower.total} STRAT
    - Available to delegate: ${result.votingPower.available} STRAT
  `);

  return result;
}

/**
 * Example 12: Get Voting History
 */
async function getVotingHistory(address) {
  const response = await fetch(`${API_BASE}/voting-history/${address}?limit=10`);
  const result = await response.json();

  console.log(`
    Voting Statistics for ${address}:
    - Total Votes Cast: ${result.stats.totalVotes}
    - Votes For: ${result.stats.votesFor}
    - Votes Against: ${result.stats.votesAgainst}
    - Total Voting Power Used: ${result.stats.totalVotingPowerUsed} STRAT
  `);

  console.log('\nRecent Votes:');
  result.votes.forEach(vote => {
    console.log(`
      - ${vote.proposalTitle}
      - Position: ${vote.support ? 'FOR' : 'AGAINST'}
      - Voting Power: ${vote.votingPower} STRAT
      - Reason: ${vote.reason}
    `);
  });

  return result;
}

/**
 * Example 13: Get Governance Statistics
 */
async function getGovernanceStats() {
  const response = await fetch(`${API_BASE}/stats`);
  const result = await response.json();

  console.log(`
    Governance Statistics:
    - Total Staked: ${result.stats.totalStaked} STRAT
    - Total Proposals: ${result.stats.totalProposals}
    - Active Proposals: ${result.stats.activeProposals}
    - Passed Proposals: ${result.stats.passedProposals}
    - Executed Proposals: ${result.stats.executedProposals}
    - Total Votes: ${result.stats.totalVotes}
    - Active Delegations: ${result.stats.totalDelegations}
  `);

  console.log('\nTop Delegates:');
  result.topDelegates.forEach((delegate, index) => {
    console.log(`
      ${index + 1}. ${delegate.delegate}
         - Voting Power: ${delegate.totalVotingPower} STRAT
         - Delegators: ${delegate.delegatorCount}
    `);
  });

  return result;
}

/**
 * Example 14: Execute a Passed Proposal
 */
async function executeProposal(proposalId) {
  const response = await fetch(`${API_BASE}/proposals/${proposalId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      executor: "your_wallet_address_here"
    })
  });

  const result = await response.json();
  console.log('Proposal executed:', result);
  return result;
}

// ============================================================================
// COMPLETE WORKFLOW EXAMPLE
// ============================================================================

/**
 * Example 15: Complete Governance Workflow
 * Demonstrates the full lifecycle of a proposal
 */
async function completeGovernanceWorkflow() {
  console.log('=== Starting Complete Governance Workflow ===\n');

  // Step 1: Create a proposal
  console.log('Step 1: Creating proposal...');
  const proposalId = await createParameterChangeProposal();
  console.log(`Proposal created with ID: ${proposalId}\n`);

  // Step 2: Wait a moment, then check proposal details
  console.log('Step 2: Checking proposal details...');
  await getProposalDetails(proposalId);

  // Step 3: Delegate some voting power (optional)
  console.log('\nStep 3: Delegating voting power...');
  const delegationId = await delegateVotingPower();

  // Step 4: Cast votes
  console.log('\nStep 4: Casting votes...');
  await voteFor(proposalId);

  // Step 5: Check updated proposal stats
  console.log('\nStep 5: Checking updated proposal...');
  await getProposalDetails(proposalId);

  // Step 6: Get voting power breakdown
  console.log('\nStep 6: Checking voting power...');
  await getVotingPower("your_wallet_address_here");

  // Step 7: View governance statistics
  console.log('\nStep 7: Viewing governance statistics...');
  await getGovernanceStats();

  // Step 8: After voting period ends, execute if passed
  console.log('\nStep 8: Would execute proposal here (after voting period)...');
  // await executeProposal(proposalId);

  console.log('\n=== Workflow Complete ===');
}

// ============================================================================
// WEBSOCKET INTEGRATION EXAMPLE
// ============================================================================

/**
 * Example 16: Listen to Governance Events via WebSocket
 */
function setupGovernanceWebSocket() {
  const socket = io('http://localhost:3000');

  // Listen for new proposals
  socket.on('proposal_created', (data) => {
    console.log('New proposal created:', data);
    // Update UI to show new proposal
  });

  // Listen for votes
  socket.on('vote_cast', (data) => {
    console.log('Vote cast:', data);
    // Update proposal vote counts in real-time
  });

  // Listen for proposal execution
  socket.on('proposal_executed', (data) => {
    console.log('Proposal executed:', data);
    // Show execution notification
  });

  // Listen for delegations
  socket.on('delegation_created', (data) => {
    console.log('Delegation created:', data);
  });

  socket.on('delegation_received', (data) => {
    console.log('Received delegation:', data);
  });

  socket.on('delegation_revoked', (data) => {
    console.log('Delegation revoked:', data);
  });

  return socket;
}

// ============================================================================
// ERROR HANDLING EXAMPLES
// ============================================================================

/**
 * Example 17: Proper Error Handling
 */
async function voteWithErrorHandling(proposalId) {
  try {
    const response = await fetch(`${API_BASE}/proposals/${proposalId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voter: "your_wallet_address_here",
        support: true,
        reason: "I support this proposal"
      })
    });

    const result = await response.json();

    if (!response.ok) {
      // Handle specific errors
      if (result.error === 'Already voted') {
        console.log('You have already voted on this proposal');
      } else if (result.error === 'No voting power') {
        console.log('You need to stake tokens or receive delegation to vote');
      } else if (result.error === 'Proposal is not active') {
        console.log('This proposal is no longer active');
      } else {
        console.error('Error casting vote:', result.error);
      }
      return null;
    }

    console.log('Vote successfully cast:', result);
    return result;

  } catch (error) {
    console.error('Network error:', error);
    return null;
  }
}

// ============================================================================
// EXPORT EXAMPLES
// ============================================================================

module.exports = {
  // Proposal creation
  createParameterChangeProposal,
  createTreasuryProposal,
  createContractUpgradeProposal,
  createCustomProposal,

  // Voting
  voteFor,
  voteAgainst,

  // Delegation
  delegateVotingPower,
  revokeDelegation,

  // Queries
  getActiveProposals,
  getProposalDetails,
  getVotingPower,
  getVotingHistory,
  getGovernanceStats,

  // Execution
  executeProposal,

  // Workflows
  completeGovernanceWorkflow,
  setupGovernanceWebSocket,
  voteWithErrorHandling
};

// ============================================================================
// USAGE INSTRUCTIONS
// ============================================================================

/*
To use these examples:

1. Start your STRAT server:
   npm start

2. In Node.js REPL or another script:
   const governance = require('./examples/governance-examples');

   // Create a proposal
   governance.createParameterChangeProposal();

   // Get active proposals
   governance.getActiveProposals();

   // Vote on a proposal
   governance.voteFor('proposalId123');

   // Run complete workflow
   governance.completeGovernanceWorkflow();

3. Or use with curl:
   curl -X POST http://localhost:3000/api/governance/proposals \
     -H "Content-Type: application/json" \
     -d @proposal.json

4. Or use with your frontend:
   import { createProposal, vote } from './governance-api';

   await createProposal(proposalData);
   await vote(proposalId, true, "I support this");
*/
