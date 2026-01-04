// Example Smart Contracts for STRAT Blockchain

// 1. Simple Counter Contract
const counterContract = `
const count = state.count || 0;
state.count = count + (params.increment || 1);
return { count: state.count, message: 'Counter incremented' };
`;

// 2. Token Contract (ERC20-like)
const tokenContract = `
if (!state.balances) {
  state.balances = {};
  state.totalSupply = 0;
}

if (params.action === 'mint') {
  const amount = params.amount || 0;
  state.balances[caller] = (state.balances[caller] || 0) + amount;
  state.totalSupply += amount;
  return { success: true, balance: state.balances[caller] };
}

if (params.action === 'transfer') {
  const to = params.to;
  const amount = params.amount;

  if ((state.balances[caller] || 0) < amount) {
    return { success: false, error: 'Insufficient balance' };
  }

  state.balances[caller] -= amount;
  state.balances[to] = (state.balances[to] || 0) + amount;
  return { success: true, from: caller, to: to, amount: amount };
}

if (params.action === 'balance') {
  return { balance: state.balances[params.address] || 0 };
}

return { error: 'Unknown action' };
`;

// 3. Voting Contract
const votingContract = `
if (!state.votes) {
  state.votes = {};
  state.voters = {};
}

if (params.action === 'vote') {
  if (state.voters[caller]) {
    return { success: false, error: 'Already voted' };
  }

  const candidate = params.candidate;
  state.votes[candidate] = (state.votes[candidate] || 0) + 1;
  state.voters[caller] = candidate;

  return { success: true, candidate: candidate, votes: state.votes[candidate] };
}

if (params.action === 'results') {
  return { votes: state.votes };
}

return { error: 'Unknown action' };
`;

// 4. Simple Storage Contract
const storageContract = `
if (!state.data) {
  state.data = {};
}

if (params.action === 'set') {
  state.data[params.key] = params.value;
  return { success: true, key: params.key, value: params.value };
}

if (params.action === 'get') {
  return { value: state.data[params.key] };
}

if (params.action === 'delete') {
  delete state.data[params.key];
  return { success: true, deleted: params.key };
}

return { error: 'Unknown action' };
`;

// 5. Auction Contract
const auctionContract = `
if (!state.auction) {
  state.auction = {
    highestBid: 0,
    highestBidder: null,
    bids: []
  };
}

if (params.action === 'bid') {
  const amount = params.amount;

  if (amount <= state.auction.highestBid) {
    return { success: false, error: 'Bid too low', currentHighest: state.auction.highestBid };
  }

  state.auction.highestBid = amount;
  state.auction.highestBidder = caller;
  state.auction.bids.push({ bidder: caller, amount: amount, timestamp: Date.now() });

  return {
    success: true,
    highestBid: amount,
    highestBidder: caller
  };
}

if (params.action === 'status') {
  return {
    highestBid: state.auction.highestBid,
    highestBidder: state.auction.highestBidder,
    totalBids: state.auction.bids.length
  };
}

return { error: 'Unknown action' };
`;

module.exports = {
  counterContract,
  tokenContract,
  votingContract,
  storageContract,
  auctionContract
};
