# Smart Contract Development Course - Complete Lessons

## Lesson 1: Development Environment Setup

### Installing Node.js and npm
```bash
# Check installation
node --version
npm --version
```

### Installing STRAT Development Tools
```bash
npm install -g strat-dev-tools
npm install -g hardhat
npm install -g @strat/cli
```

### Project Initialization
```bash
mkdir my-strat-project
cd my-strat-project
npm init -y
npm install --save-dev hardhat @strat/contracts
npx hardhat init
```

### VS Code Setup
Extensions to install:
- Solidity by Juan Blanco
- Hardhat by Nomic Foundation
- Prettier - Code formatter
- ESLint

### Configuration Files
```javascript
// hardhat.config.js
module.exports = {
  solidity: "0.8.19",
  networks: {
    stratTestnet: {
      url: "https://testnet-rpc.strat.io",
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

---

## Lesson 2: Solidity Fundamentals

### Hello World Contract
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract HelloWorld {
    string public greeting = "Hello, STRAT!";

    function setGreeting(string memory _greeting) public {
        greeting = _greeting;
    }

    function getGreeting() public view returns (string memory) {
        return greeting;
    }
}
```

### Data Types
- **Value Types**: uint, int, bool, address
- **Reference Types**: arrays, structs, mappings
- **Special Types**: bytes, string

### Functions
- Visibility: public, private, internal, external
- State Mutability: view, pure, payable
- Modifiers: Custom access control

---

## Lesson 3: Your First Token

### ERC-20 Standard Implementation
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

### Deployment Script
```javascript
async function main() {
    const MyToken = await ethers.getContractFactory("MyToken");
    const token = await MyToken.deploy(1000000);
    await token.deployed();
    console.log("Token deployed to:", token.address);
}
```

---

## Lesson 4: Testing Smart Contracts

### Writing Tests with Hardhat
```javascript
const { expect } = require("chai");

describe("MyToken", function () {
    it("Should deploy with correct supply", async function () {
        const [owner] = await ethers.getSigners();
        const MyToken = await ethers.getContractFactory("MyToken");
        const token = await MyToken.deploy(1000000);

        const balance = await token.balanceOf(owner.address);
        expect(balance).to.equal(ethers.utils.parseEther("1000000"));
    });

    it("Should transfer tokens", async function () {
        // Test implementation
    });
});
```

### Test Coverage
```bash
npx hardhat coverage
```

---

## Lesson 5: Access Control Patterns

### Ownable Pattern
```solidity
contract MyContract is Ownable {
    function restrictedFunction() public onlyOwner {
        // Only owner can call
    }
}
```

### Role-Based Access Control
```solidity
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MyContract is AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        // Minting logic
    }
}
```

---

## Lesson 6: Events and Logging

### Defining Events
```solidity
event Transfer(address indexed from, address indexed to, uint256 value);
event Approval(address indexed owner, address indexed spender, uint256 value);

function transfer(address to, uint256 amount) public {
    // Transfer logic
    emit Transfer(msg.sender, to, amount);
}
```

### Listening to Events
```javascript
contract.on("Transfer", (from, to, value) => {
    console.log(`${from} sent ${value} to ${to}`);
});
```

---

## Lesson 7: Contract Interactions

### Calling Other Contracts
```solidity
interface IToken {
    function transfer(address to, uint256 amount) external returns (bool);
}

contract MyContract {
    IToken public token;

    constructor(address tokenAddress) {
        token = IToken(tokenAddress);
    }

    function sendTokens(address to, uint256 amount) external {
        require(token.transfer(to, amount), "Transfer failed");
    }
}
```

---

## Lesson 8: Gas Optimization

### Optimization Techniques
1. Use `uint256` instead of smaller uints
2. Pack storage variables
3. Use `memory` for function parameters
4. Minimize storage reads/writes
5. Use events instead of storage for historical data

### Example
```solidity
// Unoptimized
function badFunction() public {
    for(uint i = 0; i < items.length; i++) {
        total += items[i];  // Multiple storage reads
    }
}

// Optimized
function goodFunction() public {
    uint256 len = items.length;  // Cache length
    uint256 sum = 0;  // Use memory
    for(uint i = 0; i < len; i++) {
        sum += items[i];
    }
    total = sum;  // Single storage write
}
```

---

## Lesson 9: NFT Development

### ERC-721 Implementation
```solidity
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract MyNFT is ERC721 {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    constructor() ERC721("MyNFT", "MNFT") {}

    function mint(address to) public returns (uint256) {
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _mint(to, newItemId);
        return newItemId;
    }
}
```

---

## Lesson 10: Upgradeable Contracts

### Proxy Pattern
```solidity
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract MyContractV1 is Initializable {
    uint256 public value;

    function initialize(uint256 _value) public initializer {
        value = _value;
    }
}
```

### Deployment
```javascript
const { deployProxy } = require('@openzeppelin/hardhat-upgrades');

const MyContract = await ethers.getContractFactory("MyContractV1");
const proxy = await deployProxy(MyContract, [42]);
```

---

## Lesson 11: DeFi Protocol - Staking

### Staking Contract
```solidity
contract StakingPool {
    mapping(address => uint256) public stakes;
    mapping(address => uint256) public rewards;

    function stake(uint256 amount) external {
        token.transferFrom(msg.sender, address(this), amount);
        stakes[msg.sender] += amount;
    }

    function unstake(uint256 amount) external {
        require(stakes[msg.sender] >= amount, "Insufficient stake");
        stakes[msg.sender] -= amount;
        token.transfer(msg.sender, amount);
    }

    function calculateRewards(address user) public view returns (uint256) {
        // Reward calculation logic
    }
}
```

---

## Lesson 12: DeFi Protocol - DEX

### Automated Market Maker (AMM)
```solidity
contract SimpleDEX {
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256 amountOut) {
        // AMM logic (constant product formula)
        // x * y = k
    }

    function addLiquidity(
        uint256 amountA,
        uint256 amountB
    ) external returns (uint256 liquidity) {
        // Add liquidity logic
    }
}
```

---

## Lesson 13: Oracle Integration

### Using Chainlink Oracles
```solidity
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract PriceConsumer {
    AggregatorV3Interface internal priceFeed;

    constructor() {
        priceFeed = AggregatorV3Interface(0x...);
    }

    function getLatestPrice() public view returns (int) {
        (,int price,,,) = priceFeed.latestRoundData();
        return price;
    }
}
```

---

## Lesson 14: Security Best Practices

### Common Vulnerabilities
1. **Reentrancy**: Use ReentrancyGuard
2. **Integer Overflow**: Use SafeMath or Solidity 0.8+
3. **Access Control**: Implement proper modifiers
4. **Front-Running**: Use commit-reveal patterns

### Secure Pattern
```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SecureContract is ReentrancyGuard {
    function withdraw() external nonReentrant {
        uint256 amount = balances[msg.sender];
        balances[msg.sender] = 0;  // Update state first
        payable(msg.sender).transfer(amount);  // External call last
    }
}
```

---

## Lesson 15: Advanced Security - Auditing

### Security Checklist
- [ ] No reentrancy vulnerabilities
- [ ] Proper access control
- [ ] Input validation
- [ ] Safe math operations
- [ ] No unchecked external calls
- [ ] Tested edge cases

### Using Static Analysis
```bash
npm install -g slither-analyzer
slither .
```

---

## Lesson 16: Deployment Strategies

### Multi-stage Deployment
```javascript
// 1. Deploy to testnet
// 2. Verify contracts
// 3. Test thoroughly
// 4. Deploy to mainnet
// 5. Verify on block explorer

async function deploy() {
    const Contract = await ethers.getContractFactory("MyContract");
    const contract = await Contract.deploy();
    await contract.deployed();

    console.log("Deployed to:", contract.address);

    // Verify on block explorer
    await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: [],
    });
}
```

---

## Lesson 17: Contract Verification

### Etherscan/Explorer Verification
```bash
npx hardhat verify --network stratMainnet DEPLOYED_CONTRACT_ADDRESS "Constructor Args"
```

### Why Verify?
- Transparency
- Trust
- Easy interaction
- Debugging

---

## Lesson 18: Monitoring and Maintenance

### Event Monitoring
```javascript
const provider = new ethers.providers.WebSocketProvider('wss://...');
const contract = new ethers.Contract(address, abi, provider);

contract.on("*", (event) => {
    console.log("Event:", event);
    // Alert on critical events
});
```

### Health Checks
- Monitor gas prices
- Track contract balance
- Alert on anomalies
- Regular security reviews

---

## Lesson 19: Real-World Project - Voting DAO

### Complete DAO Implementation
```solidity
contract VotingDAO {
    struct Proposal {
        string description;
        uint256 voteCount;
        mapping(address => bool) voted;
        bool executed;
    }

    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;

    function createProposal(string memory description) public {
        // Create proposal logic
    }

    function vote(uint256 proposalId) public {
        // Voting logic
    }

    function executeProposal(uint256 proposalId) public {
        // Execution logic
    }
}
```

---

## Lesson 20: Career Development

### Building Your Portfolio
1. Open-source contributions
2. Personal projects
3. Hackathon participation
4. Bug bounties
5. Educational content

### Job Opportunities
- Smart Contract Developer
- Blockchain Architect
- Security Auditor
- DeFi Protocol Engineer
- DAO Contributor

### Continued Learning
- Follow security disclosures
- Read audit reports
- Participate in forums
- Attend conferences
- Build, build, build!

### Congratulations!
You're now a STRAT Smart Contract Developer! Keep building and contributing to the ecosystem.

---

## Additional Resources

### Documentation
- STRAT Docs: docs.strat.io
- Solidity Docs: docs.soliditylang.org
- OpenZeppelin: docs.openzeppelin.com

### Communities
- STRAT Discord
- Developer Forum
- Stack Exchange
- GitHub Discussions

### Tools
- Remix IDE
- Hardhat
- Truffle
- Foundry

**Course Complete - Start Building!**
