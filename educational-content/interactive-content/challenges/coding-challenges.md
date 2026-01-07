# STRAT Coding Challenges
## Build Your Skills Through Practice

---

## Challenge 1: Hello STRAT Contract (Beginner)

### Objective
Create your first smart contract that stores and retrieves a greeting message.

### Requirements
- Create a contract named `HelloSTRAT`
- Store a greeting message
- Function to set greeting
- Function to get greeting
- Deploy to testnet

### Starter Code
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract HelloSTRAT {
    // Your code here
}
```

### Solution
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract HelloSTRAT {
    string public greeting;

    constructor() {
        greeting = "Hello, STRAT!";
    }

    function setGreeting(string memory _greeting) public {
        greeting = _greeting;
    }

    function getGreeting() public view returns (string memory) {
        return greeting;
    }
}
```

### Testing
```javascript
const { expect } = require("chai");

describe("HelloSTRAT", function () {
    it("Should set and get greeting", async function () {
        const HelloSTRAT = await ethers.getContractFactory("HelloSTRAT");
        const hello = await HelloSTRAT.deploy();

        expect(await hello.getGreeting()).to.equal("Hello, STRAT!");

        await hello.setGreeting("GM STRAT!");
        expect(await hello.getGreeting()).to.equal("GM STRAT!");
    });
});
```

**Points**: 10
**Time**: 30 minutes

---

## Challenge 2: Simple Token (Beginner)

### Objective
Create an ERC-20 token with basic functionality.

### Requirements
- Name: "MyToken"
- Symbol: "MTK"
- Decimals: 18
- Initial supply: 1,000,000
- Transfer function
- Balance checking

### Starter Code
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    // Implement here
}
```

### Solution
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("MyToken", "MTK") {
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }
}
```

**Points**: 15
**Time**: 45 minutes

---

## Challenge 3: Voting System (Intermediate)

### Objective
Build a simple voting contract for proposals.

### Requirements
- Create proposals
- Vote on proposals
- Track vote counts
- Prevent double voting
- Declare winners

### Template
```solidity
pragma solidity ^0.8.19;

contract Voting {
    struct Proposal {
        string description;
        uint voteCount;
    }

    // Your implementation
}
```

### Solution
```solidity
pragma solidity ^0.8.19;

contract Voting {
    struct Proposal {
        string description;
        uint voteCount;
    }

    Proposal[] public proposals;
    mapping(address => mapping(uint => bool)) public hasVoted;

    function createProposal(string memory _description) public {
        proposals.push(Proposal({
            description: _description,
            voteCount: 0
        }));
    }

    function vote(uint proposalIndex) public {
        require(proposalIndex < proposals.length, "Invalid proposal");
        require(!hasVoted[msg.sender][proposalIndex], "Already voted");

        proposals[proposalIndex].voteCount++;
        hasVoted[msg.sender][proposalIndex] = true;
    }

    function getWinner() public view returns (uint winningProposal) {
        uint winningVoteCount = 0;
        for (uint i = 0; i < proposals.length; i++) {
            if (proposals[i].voteCount > winningVoteCount) {
                winningVoteCount = proposals[i].voteCount;
                winningProposal = i;
            }
        }
    }
}
```

**Points**: 25
**Time**: 90 minutes

---

## Challenge 4: NFT Minting (Intermediate)

### Objective
Create an NFT contract with minting functionality.

### Requirements
- ERC-721 implementation
- Minting function
- Token URI support
- Ownership tracking
- Maximum supply limit (100)

### Solution
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MyNFT is ERC721 {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    uint256 public constant MAX_SUPPLY = 100;
    mapping(uint256 => string) private _tokenURIs;

    constructor() ERC721("MyNFT", "MNFT") {}

    function mint(address to, string memory tokenURI) public returns (uint256) {
        require(_tokenIds.current() < MAX_SUPPLY, "Max supply reached");

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _mint(to, newTokenId);
        _tokenURIs[newTokenId] = tokenURI;

        return newTokenId;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token doesn't exist");
        return _tokenURIs[tokenId];
    }
}
```

**Points**: 30
**Time**: 2 hours

---

## Challenge 5: Staking Contract (Advanced)

### Objective
Build a staking contract with rewards.

### Requirements
- Stake tokens
- Unstake tokens
- Calculate rewards based on time
- Withdraw rewards
- Emergency withdraw

### Solution
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract StakingPool is ReentrancyGuard {
    IERC20 public stakingToken;

    uint256 public constant REWARD_RATE = 100; // 100 tokens per second

    struct Stake {
        uint256 amount;
        uint256 timestamp;
        uint256 rewardDebt;
    }

    mapping(address => Stake) public stakes;

    constructor(address _stakingToken) {
        stakingToken = IERC20(_stakingToken);
    }

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "Cannot stake 0");

        if (stakes[msg.sender].amount > 0) {
            uint256 pending = calculateRewards(msg.sender);
            stakes[msg.sender].rewardDebt += pending;
        }

        stakingToken.transferFrom(msg.sender, address(this), amount);
        stakes[msg.sender].amount += amount;
        stakes[msg.sender].timestamp = block.timestamp;
    }

    function unstake(uint256 amount) external nonReentrant {
        require(stakes[msg.sender].amount >= amount, "Insufficient stake");

        uint256 rewards = calculateRewards(msg.sender);

        stakes[msg.sender].amount -= amount;
        stakes[msg.sender].timestamp = block.timestamp;
        stakes[msg.sender].rewardDebt = 0;

        stakingToken.transfer(msg.sender, amount + rewards);
    }

    function calculateRewards(address user) public view returns (uint256) {
        Stake memory userStake = stakes[user];
        uint256 timeStaked = block.timestamp - userStake.timestamp;
        uint256 rewards = (userStake.amount * timeStaked * REWARD_RATE) / 1e18;
        return rewards + userStake.rewardDebt;
    }

    function claimRewards() external nonReentrant {
        uint256 rewards = calculateRewards(msg.sender);
        require(rewards > 0, "No rewards");

        stakes[msg.sender].timestamp = block.timestamp;
        stakes[msg.sender].rewardDebt = 0;

        stakingToken.transfer(msg.sender, rewards);
    }
}
```

**Points**: 50
**Time**: 4 hours

---

## Challenge 6: DEX Pair (Advanced)

### Objective
Create a simple automated market maker (AMM) for token swaps.

### Requirements
- Add liquidity
- Remove liquidity
- Swap tokens
- Constant product formula (x * y = k)
- Price calculation

### Partial Solution Framework
```solidity
pragma solidity ^0.8.19;

contract SimpleDEX {
    address public tokenA;
    address public tokenB;

    uint256 public reserveA;
    uint256 public reserveB;

    // Implement:
    // - addLiquidity()
    // - removeLiquidity()
    // - swap()
    // - getAmountOut()
}
```

**Points**: 75
**Time**: 6 hours

---

## Challenge 7: Multi-Signature Wallet (Expert)

### Objective
Build a multi-sig wallet requiring multiple approvals.

### Requirements
- Add/remove owners
- Submit transactions
- Approve transactions
- Execute after threshold
- Revoke approvals

### Framework
```solidity
pragma solidity ^0.8.19;

contract MultiSigWallet {
    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
        uint approvals;
    }

    // Implement full multi-sig logic
}
```

**Points**: 100
**Time**: 8 hours

---

## Challenge 8: DAO Treasury (Expert)

### Objective
Complete DAO with treasury management.

### Requirements
- Proposal creation
- Voting mechanism
- Token-weighted voting
- Treasury operations
- Timelock for execution

**Points**: 100
**Time**: 10 hours

---

## Challenge 9: NFT Marketplace (Expert)

### Objective
Build a marketplace for NFT trading.

### Requirements
- List NFTs for sale
- Buy NFTs
- Auction mechanism
- Royalty payments
- Offer system

**Points**: 125
**Time**: 12 hours

---

## Challenge 10: Flash Loan Protocol (Master)

### Objective
Implement a flash loan protocol.

### Requirements
- Lend any amount in single transaction
- Require payback in same transaction
- Fee mechanism
- Security checks
- Prevent exploits

**Points**: 150
**Time**: 15 hours

---

## Bug Bounty Challenges

### Bug Hunt 1: Find the Vulnerability

```solidity
contract VulnerableContract {
    mapping(address => uint) public balances;

    function withdraw() public {
        uint amount = balances[msg.sender];
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success);
        balances[msg.sender] = 0;
    }
}
```

**Question**: What's the vulnerability?
**Answer**: Reentrancy! Balance should be zeroed before external call.

**Points**: 20

---

### Bug Hunt 2: Integer Overflow

```solidity
contract BuggyToken {
    mapping(address => uint8) public balances;

    function transfer(address to, uint8 amount) public {
        balances[msg.sender] -= amount;
        balances[to] += amount;
    }
}
```

**Question**: What's wrong?
**Answer**: uint8 can overflow. Use uint256 or Solidity 0.8+ with built-in checks.

**Points**: 20

---

## Hackathon Challenges

### Hackathon 1: Build a dApp (48 hours)

**Theme**: DeFi for Good

**Requirements**:
- Smart contracts
- Frontend interface
- Novel use case
- Security considerations
- Documentation

**Prize**: 1,000 STRAT + Grants

---

### Hackathon 2: NFT Innovation (24 hours)

**Theme**: Beyond Art

**Requirements**:
- Innovative NFT utility
- Working prototype
- User experience focus
- Scalability plan

**Prize**: 500 STRAT

---

## CTF (Capture The Flag) Challenges

### CTF 1: Contract Exploit
Find and exploit the vulnerability to drain funds.

**Points**: 50

---

### CTF 2: Signature Forgery
Forge a valid signature to claim rewards.

**Points**: 75

---

### CTF 3: Front-Running
Successfully front-run a transaction.

**Points**: 100

---

## Leaderboard

| Rank | User | Points | Challenges Completed |
|------|------|--------|---------------------|
| 1 | --- | --- | --- |
| 2 | --- | --- | --- |
| 3 | --- | --- | --- |

---

## Rewards

**Point Tiers**:
- 100 points: Bronze Badge NFT
- 300 points: Silver Badge NFT
- 500 points: Gold Badge NFT
- 1000 points: Platinum Badge NFT + 100 STRAT
- 2000 points: Diamond Badge NFT + 500 STRAT + Job Referral

---

## Submission Guidelines

1. Fork the challenge repository
2. Complete your solution
3. Write comprehensive tests
4. Submit pull request
5. Wait for review (24-48 hours)
6. Receive points and feedback

---

## Community Challenges

Submit your own challenges:
- Novel problem statements
- Educational value
- Clear requirements
- Provided solutions
- Test cases

**Reward**: 50 points for accepted challenges

---

**Start coding and earn your place on the leaderboard!**
