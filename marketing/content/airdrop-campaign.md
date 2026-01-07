# STRAT Airdrop Campaign Strategy

## Campaign Overview

**Objective**: Distribute tokens to early supporters and incentivize community growth
**Total Allocation**: 50,000,000 STRAT (5% of total supply)
**Timeline**: 6-month campaign across multiple phases
**Budget**: Tokens + $100K marketing spend

---

## Airdrop Phases

### Phase 1: Retroactive Airdrop (Immediate)
**Allocation**: 10,000,000 STRAT
**Recipients**: Early supporters and testnet participants

### Phase 2: Community Growth Airdrop (Months 1-2)
**Allocation**: 15,000,000 STRAT
**Recipients**: Social media engagement and referrals

### Phase 3: DeFi Participation Airdrop (Months 2-4)
**Allocation**: 15,000,000 STRAT
**Recipients**: Liquidity providers and protocol users

### Phase 4: Developer Airdrop (Months 4-6)
**Allocation**: 10,000,000 STRAT
**Recipients**: Developers building on STRAT

---

## Phase 1: Retroactive Airdrop

### Eligibility Criteria

**Testnet Validators (5M STRAT)**
- Ran validator node during testnet
- Minimum 30 days uptime
- Reward: 10,000 - 50,000 STRAT based on performance
- Claim window: 90 days

**Testnet Users (2M STRAT)**
- Made 100+ testnet transactions
- Reward: 1,000 - 5,000 STRAT based on activity
- Claim window: 90 days

**Discord Early Members (1M STRAT)**
- Joined Discord before [DATE]
- Active participation (10+ messages)
- Reward: 500 - 2,000 STRAT
- Verification via Collab.Land

**Twitter Early Followers (1M STRAT)**
- Followed @STRATblockchain before [DATE]
- Retweeted announcement
- Reward: 300 - 1,000 STRAT
- Verify via tweet linking wallet

**Telegram Early Members (1M STRAT)**
- Joined before [DATE]
- Active participation
- Reward: 500 STRAT
- Verify via bot

### Implementation

**Smart Contract**:
```solidity
// Merkle tree airdrop contract
// Users claim by providing proof
// Unclaimed tokens returned after 90 days
```

**Claiming Process**:
1. Go to airdrop.strat.network
2. Connect wallet
3. Check eligibility
4. Sign message to verify ownership
5. Claim tokens (gas fee applies)
6. Receive STRAT instantly

**Announcement**:
```
🎁 RETROACTIVE AIRDROP IS LIVE!

10M STRAT distributed to early supporters!

Eligible:
✅ Testnet validators
✅ Testnet users
✅ Early Discord members
✅ Early Twitter followers
✅ Early Telegram members

Check your eligibility: airdrop.strat.network

Claim window: 90 days
Don't miss out! 🚀

#STRATairdrop
```

---

## Phase 2: Community Growth Airdrop

### Task-Based Rewards (15M STRAT over 8 weeks)

**Weekly Tasks** (Users earn points, converted to STRAT)

**Social Media Tasks**:
- Follow STRAT on Twitter: 10 points
- Retweet announcement: 5 points per retweet (max 3/week)
- Quote tweet with thoughts: 15 points
- Join Discord: 10 points
- Join Telegram: 10 points
- Join Reddit: 5 points

**Engagement Tasks**:
- Daily Discord message: 2 points per day
- React to announcements: 1 point per reaction
- Share meme: 10 points (weekly)
- Create content (video, article): 50-500 points (judged)

**Referral System**:
- Refer friend who completes tasks: 20% of their points
- Top 10 referrers: Bonus 10,000 STRAT each

**Point Conversion**:
```
100 points = 10 STRAT (adjustable based on participation)

Weekly distribution:
- Week 1-2: 2M STRAT total
- Week 3-4: 2M STRAT total
- Week 5-6: 2M STRAT total
- Week 7-8: 2M STRAT total
- Bonus pool: 7M STRAT (top performers)
```

### Leaderboard System

**Weekly Leaderboard**:
- Top 100 users displayed
- Real-time point tracking
- Weekly winners announced

**Prizes**:
- 1st place: 5,000 STRAT
- 2nd place: 3,000 STRAT
- 3rd place: 2,000 STRAT
- 4th-10th: 1,000 STRAT each
- 11th-50th: 500 STRAT each
- 51st-100th: 200 STRAT each

### Platform: Zealy or Galxe

**Why Zealy/Galxe**:
- Built for Web3 community campaigns
- Automated task verification
- Leaderboards included
- Sybil resistance
- Easy user onboarding

**Setup**:
1. Create STRAT campaign
2. Configure tasks and rewards
3. Connect wallet for distributions
4. Promote to community
5. Monitor and adjust weekly

**Campaign URL**: zealy.io/c/strat or galxe.com/strat

---

## Phase 3: DeFi Participation Airdrop

### Liquidity Provider Rewards (10M STRAT)

**Eligible Pools**:
- STRAT/USDC on Uniswap
- STRAT/ETH on Uniswap
- STRAT/BUSD on PancakeSwap
- STRAT native DEX pools

**Reward Calculation**:
```
User Reward = (User Liquidity × Days Provided) / Total Liquidity-Days × Pool Allocation

Minimum: $1,000 liquidity for 30 days
Snapshot: Weekly
Distribution: Monthly
```

**Example**:
```
Pool allocation: 2M STRAT for STRAT/USDC
Your share: $10,000 for 60 days = 600,000 liquidity-days
Total pool: 30M liquidity-days
Your reward: (600,000 / 30,000,000) × 2,000,000 = 40,000 STRAT
```

**Bonus Multipliers**:
- 30+ days: 1x
- 60+ days: 1.2x
- 90+ days: 1.5x

### Trading Volume Incentives (3M STRAT)

**Eligible Platforms**:
- STRAT native DEX
- Uniswap
- PancakeSwap

**Tiers**:
- $1K+ volume: 50 STRAT
- $10K+ volume: 500 STRAT
- $50K+ volume: 2,500 STRAT
- $100K+ volume: 5,000 STRAT
- Top 10 traders: Bonus 10,000 STRAT each

**Period**: 60 days
**Snapshot**: Daily
**Distribution**: End of period

### Staking Rewards (2M STRAT)

**Eligibility**:
- Stake minimum 1,000 STRAT
- Lock for 30+ days
- Bonus on top of regular staking APY

**Bonus Structure**:
```
Base staking APY: 12%
Airdrop bonus: +3% for campaign period
Total: 15% APY

Example:
Stake 10,000 STRAT for 60 days
Regular rewards: ~197 STRAT (12% APY pro-rated)
Bonus airdrop: ~49 STRAT (3% bonus)
Total: ~246 STRAT
```

---

## Phase 4: Developer Airdrop

### Deployed Contract Rewards (5M STRAT)

**Criteria**:
- Deploy smart contract on STRAT mainnet
- Contract must be verified on explorer
- Must have genuine utility (no spam)
- Active usage (10+ transactions)

**Tiers**:
- Simple contract: 500 STRAT
- DeFi protocol: 5,000 STRAT
- Complex dApp: 10,000 STRAT
- Innovative/novel: 25,000 STRAT

**Application**:
1. Deploy contract
2. Submit form: developers.strat.network/airdrop
3. Provide: Contract address, description, repo
4. Team reviews (2 weeks)
5. Approval and distribution

### Grant Recipients Bonus (2M STRAT)

**Eligibility**:
- Received STRAT developer grant
- Delivered milestones on time
- Bonus on top of grant

**Amount**: 10% of grant amount in STRAT tokens

**Example**:
```
Grant: $50,000
Bonus: $5,000 worth of STRAT tokens
If STRAT = $0.50: 10,000 STRAT bonus
```

### Open Source Contributions (2M STRAT)

**Eligible**:
- Contributions to STRAT core
- Developer tools
- Documentation
- SDKs and libraries

**Rewards**:
- Minor contribution (docs, typos): 50 STRAT
- Medium contribution (features): 500 STRAT
- Major contribution (protocol): 5,000 STRAT
- Ongoing maintainer: 1,000 STRAT/month

**Process**:
- Submit PR to STRAT GitHub
- Get PR merged
- Fill out contributor form
- Receive STRAT to GitHub-linked wallet

### Hackathon Winners (1M STRAT)

**STRAT Hackathons**:
- Quarterly hackathons
- Themes: DeFi, NFT, Gaming, Infrastructure

**Prizes**:
- 1st place: 100,000 STRAT
- 2nd place: 50,000 STRAT
- 3rd place: 25,000 STRAT
- Top 10: 10,000 STRAT each
- All valid submissions: 1,000 STRAT

---

## Anti-Sybil Measures

### Identity Verification

**Options**:
1. **BrightID**: Decentralized social identity
2. **Gitcoin Passport**: Humanity score
3. **Proof of Humanity**: Video verification
4. **KYC (for large claims)**: Optional, increases allocation

### Detection Methods

**Red Flags**:
- Multiple wallets from same IP
- Identical on-chain behavior patterns
- Newly created accounts with no history
- Automated/bot-like activity
- Suspicious referral patterns

**Mitigation**:
- Require minimum account age
- Task completion verification
- Manual review for large claims
- Gradual vesting for suspicious accounts
- Community reporting system

### Fair Distribution

**Caps**:
- Max per wallet (across all phases): 50,000 STRAT
- Requires verification for claims >10,000 STRAT
- Vesting for claims >25,000 STRAT

---

## Vesting Schedule

**Small Claims** (<1,000 STRAT):
- 100% immediate unlock

**Medium Claims** (1,000-10,000 STRAT):
- 50% immediate
- 50% vested over 3 months (linear)

**Large Claims** (10,000+ STRAT):
- 25% immediate
- 75% vested over 6 months (linear)

**Rationale**: Prevent dump, encourage long-term holding

---

## Marketing Campaign

### Pre-Launch (2 weeks before)

**Teaser Campaign**:
```
Week 1:
"Something big is coming to STRAT..."
Mysterious graphics, countdown

Week 2:
"The biggest airdrop in STRAT history"
Details drip-fed daily
```

**Content**:
- Twitter teasers daily
- Discord announcements
- Telegram countdowns
- YouTube trailer video
- Medium article outline

### Launch Day

**Coordinated Announcement**:
- Twitter thread (pinned)
- Reddit post (multiple subreddits)
- Discord/Telegram announcement
- Email newsletter blast
- Press release
- Influencer partnerships

**Announcement Template**:
```
🎁 STRAT MEGA AIRDROP IS LIVE! 🎁

50,000,000 STRAT up for grabs!

4 Ways to Participate:

1️⃣ RETROACTIVE: Claim rewards for early support
   Check eligibility: airdrop.strat.network

2️⃣ COMMUNITY: Earn points for social tasks
   Start earning: zealy.io/c/strat

3️⃣ DeFi: Provide liquidity & earn
   Add liquidity: strat.network/liquidity

4️⃣ DEVELOPERS: Build on STRAT & get rewarded
   Deploy now: docs.strat.network

Campaign runs for 6 months!
Total value: $25M+ at current prices

Don't miss out! 🚀

Details: strat.network/airdrop
#STRATairdrop
```

### Ongoing Promotion

**Weekly**:
- Leaderboard updates
- Winner announcements
- Success stories
- Reminder posts
- Tutorial content

**Monthly**:
- Progress reports
- Distribution announcements
- Feature top participants
- Milestone celebrations

---

## Budget Breakdown

**Token Allocation**: 50M STRAT (~$25M at $0.50)

**Marketing Spend**: $100,000
- Influencer partnerships: $30,000
- Paid social ads: $25,000
- PR and press releases: $15,000
- Design and content creation: $10,000
- Platform fees (Zealy/Galxe): $5,000
- Tools and infrastructure: $5,000
- Community management: $10,000

**Total Campaign Value**: ~$25M+ in tokens + $100K marketing

---

## Success Metrics

### Participation
- Total participants: Target 100,000+
- Task completion rate: >60%
- Claim rate: >80%
- Sybil detection rate: <5%

### Community Growth
- Twitter followers: +50,000
- Discord members: +30,000
- Telegram members: +20,000
- Reddit subscribers: +10,000

### Network Activity
- New wallets created: +50,000
- Total transactions: +5M
- Liquidity added: +$10M
- Contracts deployed: +100

### Token Distribution
- Unique claimants: 50,000+
- Average claim size: 1,000 STRAT
- Geographic distribution: Global
- Retention after 90 days: >50%

---

## Legal Considerations

**Compliance**:
- Consult legal counsel in key jurisdictions
- Ensure airdrop doesn't classify as security offering
- KYC for large claims (optional but recommended)
- Terms of service for participation
- Privacy policy for data collection

**Geographic Restrictions** (if needed):
- Exclude sanctioned countries
- Comply with local regulations
- Display terms clearly

**Tax Implications**:
- Inform users of potential tax obligations
- Provide documentation for claims
- Disclaimer: "Consult your tax advisor"

---

## Airdrop Dashboard

**Features**:
- Check eligibility
- View claimable amount
- Track points (for Phase 2)
- See leaderboard
- Claim tokens
- View transaction history
- Referral tracking

**URL**: airdrop.strat.network

**Tech Stack**:
- Frontend: React + Web3Modal
- Backend: Node.js + MongoDB
- Blockchain: Smart contracts on STRAT
- Verification: Merkle trees for Phase 1

---

## Communication Templates

### Claim Reminder Email
```
Subject: You have unclaimed STRAT tokens! ⏰

Hi [Name],

Great news! You're eligible for the STRAT airdrop, but you haven't claimed yet.

Your allocation: [X] STRAT
Current value: ~$[X]
Claim deadline: [DATE] ([X] days remaining)

⚠️ Unclaimed tokens will be returned to treasury!

Claim now: airdrop.strat.network

Questions? Reply to this email or visit our Discord support channel.

Don't leave money on the table!

STRAT Team
```

### Weekly Leaderboard Tweet
```
🏆 WEEK [X] AIRDROP LEADERBOARD 🏆

Top performers:

🥇 @user1 - [X] points
🥈 @user2 - [X] points
🥉 @user3 - [X] points

Rewards this week: [X] STRAT distributed!

Join the competition: zealy.io/c/strat

[X] days remaining in campaign!

#STRATairdrop
```

### Distribution Announcement
```
📢 AIRDROP DISTRIBUTION COMPLETE

Phase [X] rewards distributed:
✅ [X] STRAT sent to [X] wallets
✅ Average claim: [X] STRAT
✅ Total value: $[X]

Thank you for participating!

Phase [X+1] starts [DATE]
Details: strat.network/airdrop

#STRATairdrop
```

---

## Post-Campaign Analysis

### Evaluation Metrics

**Effectiveness**:
- Cost per acquisition (CPA)
- Token distribution efficiency
- Sybil resistance success rate
- Community growth ROI
- Network activity increase

**Community Impact**:
- Retention rate after 90 days
- Active users vs. farmers
- Quality of new participants
- Organic growth vs. airdrop hunters

**Recommendations for Future**:
- What worked well
- What to improve
- Lessons learned
- Adjustments for next campaign

---

## Conclusion

This comprehensive airdrop campaign:
- ✅ Rewards early supporters (retroactive)
- ✅ Drives community growth (social tasks)
- ✅ Increases liquidity (DeFi incentives)
- ✅ Attracts developers (builder rewards)
- ✅ Fair distribution (anti-Sybil measures)
- ✅ Long-term focus (vesting schedules)

**Total Impact**: 50M STRAT distributed to 50,000+ community members, driving massive growth and engagement.

**Launch Timeline**: Start within 30 days of mainnet launch for maximum impact.

---

**Ready to deploy! This airdrop will supercharge STRAT's community growth and ecosystem development.**
