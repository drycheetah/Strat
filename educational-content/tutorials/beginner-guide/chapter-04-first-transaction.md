# Chapter 4: Your First STRAT Transaction

## Understanding Transactions

A blockchain transaction is a transfer of value from one address to another. Every transaction includes:

- **Sender address**: Where funds come from
- **Receiver address**: Where funds go
- **Amount**: How much to send
- **Gas fee**: Payment to network validators
- **Nonce**: Transaction sequence number
- **Signature**: Cryptographic proof of authorization

## Transaction Lifecycle

### 1. Creation
You initiate a transaction in your wallet.

### 2. Signing
Your private key signs the transaction, proving ownership.

### 3. Broadcasting
Transaction is sent to the network.

### 4. Pending
Transaction waits in the mempool (memory pool).

### 5. Validation
Validators verify the transaction.

### 6. Inclusion
Transaction is added to a block.

### 7. Confirmation
Block is added to the blockchain.

### 8. Finality
After multiple confirmations, transaction is permanent.

## Getting Your First STRAT

### Method 1: Purchase from Exchange
1. Create account on supported exchange
2. Complete KYC (Know Your Customer) verification
3. Deposit fiat currency (USD, EUR, etc.)
4. Buy STRAT
5. Withdraw to your wallet

**Popular exchanges**:
- Binance
- Coinbase
- Kraken
- KuCoin

### Method 2: Peer-to-Peer (P2P)
Purchase directly from other users:
- LocalCryptos
- Bisq
- HodlHodl

### Method 3: Earn STRAT
- Complete bounties
- Participate in airdrops
- Contribute to ecosystem
- Stake existing holdings

### Method 4: Receive from Friend
The easiest way to get started - have a friend send you a small amount!

## Receiving Your First STRAT

### Step 1: Open Your Wallet
Log into your STRAT wallet.

### Step 2: Navigate to Receive
Click the "Receive" button.

### Step 3: Copy Your Address
Your wallet will display your address:
```
0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

**Two ways to share**:
- **Copy text**: Use the copy button
- **QR code**: Show the QR code for mobile scanning

### Step 4: Share Address
Send your address to the person or exchange sending you STRAT.

**Security note**: Your public address is safe to share. NEVER share your private key or seed phrase!

### Step 5: Wait for Transaction
After sender initiates, you'll see:
- Pending transaction notification
- Confirmation progress
- Balance update

**Typical confirmation time**: 15-60 seconds

### Step 6: Verify Receipt
Check your balance and transaction history.

## Sending Your First STRAT

### Before You Send - Critical Checks

**1. Verify Recipient Address**
- Double-check every character
- Use copy-paste (don't type manually)
- Some wallets support ENS names (like alice.strat)

**2. Check Network**
- Ensure you're on STRAT mainnet
- Wrong network = lost funds

**3. Understand Gas Fees**
- Small fee required for processing
- Varies based on network congestion
- Typically 0.0001-0.001 STRAT

**4. Start Small**
- Send a test amount first
- Confirm receipt
- Then send the full amount

### Step-by-Step Sending Process

### Step 1: Click "Send"
Navigate to the Send section of your wallet.

### Step 2: Enter Recipient Address
Paste the destination address:
```
0xRecipientAddressHere...
```

**Pro tip**: Many wallets have address books to save frequent recipients.

### Step 3: Enter Amount
Specify how much STRAT to send.

**Options**:
- Enter specific amount: `10.5 STRAT`
- Click "Max" to send entire balance (minus gas)
- Select from recent amounts

### Step 4: Review Gas Fee
The wallet estimates the transaction fee.

**Gas fee options**:
- **Slow**: Lower fee, slower confirmation (~2-5 minutes)
- **Normal**: Standard fee, typical confirmation (~30-60 seconds)
- **Fast**: Higher fee, quick confirmation (~15-30 seconds)

**Example**:
```
Amount to send: 10 STRAT
Gas fee: 0.0005 STRAT
Total: 10.0005 STRAT
```

### Step 5: Review Transaction Details
Verify everything is correct:
- Recipient address
- Amount
- Gas fee
- Total cost

**This is your last chance to catch errors!**

### Step 6: Confirm and Sign
Click "Send" or "Confirm."

Your wallet will ask you to:
- Enter password or
- Confirm on hardware wallet or
- Use biometric authentication

### Step 7: Transaction Submitted
You'll receive a transaction hash (ID):
```
0x8f3d5e2b9a1c4d7e6f8a9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2
```

**Save this hash!** You can use it to:
- Track transaction status
- Prove you sent funds
- Contact support if needed

### Step 8: Monitor Status
Track your transaction:
- In-wallet notification
- Block explorer
- Email/SMS alerts (if configured)

**Status indicators**:
- **Pending**: Waiting for confirmation
- **Confirming**: Being added to blockchain (1/12 confirmations)
- **Confirmed**: Transaction complete (12+ confirmations)
- **Failed**: Transaction rejected (rare)

### Step 9: Confirmation
Once confirmed, the transaction is permanent and irreversible.

## Understanding Gas Fees

### What is Gas?
Gas is the fee paid to validators for processing your transaction.

**Gas price factors**:
- Network congestion
- Transaction complexity
- Speed preference

### Gas Price Terminology

**Gwei**: Gas price unit (1 STRAT = 1,000,000,000 Gwei)

**Gas Limit**: Maximum gas you're willing to use

**Gas Used**: Actual gas consumed

**Formula**: `Total Fee = Gas Used × Gas Price`

### Example Calculation
```
Gas Limit: 21,000 units
Gas Price: 20 Gwei
Max Fee: 21,000 × 20 = 420,000 Gwei = 0.00042 STRAT
```

### When to Use Different Gas Prices

**Slow/Low (5-10 Gwei)**:
- Non-urgent transactions
- Save on fees
- During low network usage

**Normal (15-25 Gwei)**:
- Standard transactions
- Balanced speed and cost
- Most common choice

**Fast/High (30-50+ Gwei)**:
- Time-sensitive transactions
- DeFi opportunities
- High network congestion

### Failed Transactions
If gas limit is too low, transaction fails but you still pay the gas fee.

**Prevention**: Use wallet's recommended gas limit.

## Transaction Best Practices

### 1. Always Test First
Send a small amount to new addresses before sending large sums.

```
Test: Send 0.1 STRAT
Confirm receipt
Send remaining amount
```

### 2. Verify Addresses Multiple Times
Check first few and last few characters:
```
0x742d...f0bEb ✓
0x742d...f0bEb ✓
0x742d...f0bEb ✓
```

### 3. Use Address Book
Save trusted addresses with labels:
- "Mom's wallet"
- "Exchange deposit"
- "Alice NFT trades"

### 4. Beware of Clipboard Malware
Some malware replaces copied addresses.

**Protection**:
- Always verify pasted address
- Use hardware wallet
- Keep antivirus updated

### 5. Understand Finality
Wait for multiple confirmations for large amounts:
- 1 confirmation: Small amounts
- 3+ confirmations: Medium amounts
- 12+ confirmations: Large amounts
- Exchange deposits: Varies (check exchange requirements)

### 6. Keep Records
Document all transactions:
- Date and time
- Amount sent/received
- Purpose
- Transaction hash
- Recipient/sender

**Why**: Tax reporting, accounting, dispute resolution

## Advanced Transaction Features

### Transaction Speed-Up
If transaction is stuck, you can:
1. Increase gas price (replace transaction)
2. Wait for network to clear
3. Cancel and resend (if not confirmed)

### Transaction Cancellation
Before confirmation, you can cancel by:
1. Sending 0 STRAT to yourself
2. Using same nonce
3. Higher gas price

**Important**: Only works for pending transactions!

### Batch Transactions
Send to multiple recipients at once:
- Lower total fees
- More efficient
- Supported by some wallets

### Scheduled Transactions
Set up recurring or future transactions:
- Regular payments
- Dollar-cost averaging
- Automated strategies

## Common Transaction Errors

### "Insufficient Funds"
**Cause**: Not enough balance to cover amount + gas
**Solution**: Reduce amount or add more STRAT

### "Nonce Too Low"
**Cause**: Transaction already processed with this nonce
**Solution**: Refresh wallet, transaction may already be confirmed

### "Gas Price Too Low"
**Cause**: Network requires higher gas
**Solution**: Increase gas price

### "Transaction Reverted"
**Cause**: Smart contract execution failed
**Solution**: Check contract conditions, increase gas limit

### "Invalid Address"
**Cause**: Recipient address is malformed
**Solution**: Verify address format and checksum

## Transaction Privacy

### Public Nature
All STRAT transactions are public and viewable on blockchain explorers.

**What's visible**:
- Sender address
- Recipient address
- Amount transferred
- Timestamp
- Gas paid

**What's NOT visible**:
- Your identity (unless linked elsewhere)
- Purpose of transaction
- Personal information

### Enhancing Privacy

**Use Multiple Addresses**:
Separate addresses for different purposes

**Mixing Services** (use with caution):
Obscure transaction trails (check local regulations)

**Privacy-Focused Practices**:
- Don't reuse addresses
- Avoid linking addresses to personal info
- Use VPN when accessing wallet

## Block Explorers

### What is a Block Explorer?
A website to view blockchain data.

**STRAT Explorer**: explorer.strat.io

### Using a Block Explorer

**Search by**:
- Transaction hash
- Address
- Block number
- Token name

### Information Available

**For Transactions**:
- Status (success/failed)
- Block number
- Timestamp
- From/To addresses
- Value transferred
- Gas used
- Input data

**For Addresses**:
- Current balance
- Transaction history
- Token holdings
- Contract interactions

### Practical Uses
- Verify transaction status
- Check balance without wallet access
- Audit address activity
- Research contract interactions
- Prove payment

## Practice Exercises

### Exercise 1: Receive Test Transaction
1. Share your address with a friend
2. Receive small amount of STRAT
3. Verify on block explorer
4. Check wallet balance

### Exercise 2: Send Test Transaction
1. Send 0.01 STRAT to a test address
2. Monitor transaction status
3. Wait for confirmation
4. Verify on block explorer

### Exercise 3: Gas Price Experiment
1. Send transaction with low gas
2. Send transaction with high gas
3. Compare confirmation times
4. Analyze cost vs. speed

### Exercise 4: Address Verification
Practice verifying addresses:
1. Copy an address
2. Paste it
3. Compare character by character
4. Use QR code validation

## Safety Checklist

Before every transaction:
- [ ] Verified recipient address (twice)
- [ ] Checked amount (correct decimal places)
- [ ] Reviewed gas fee (reasonable?)
- [ ] Confirmed network (STRAT mainnet)
- [ ] Test transaction sent (for new addresses)
- [ ] Saved transaction details
- [ ] Double-checked everything

## Emergency Situations

### "I sent to wrong address!"
**Reality**: Transactions are irreversible.
**Prevention**: Always verify addresses, send test amounts first.
**Possible solution**: Contact recipient if you know them.

### "Transaction is stuck for hours"
**Solutions**:
1. Wait (network may be congested)
2. Speed up with higher gas
3. Check on block explorer for status

### "I lost transaction hash"
**Solution**: Check wallet history or email notifications.

### "Recipient says they didn't receive funds"
**Verification**:
1. Check transaction on block explorer
2. Verify correct address used
3. Confirm confirmations completed
4. Check they're on correct network

## Summary

You now know:
- How to receive STRAT safely
- How to send STRAT transactions
- Understanding gas fees
- Using block explorers
- Transaction best practices
- Common errors and solutions

**Key takeaway**: Blockchain transactions are irreversible. Always verify before confirming!

---

**Previous Chapter**: [Chapter 3: Setting Up Your STRAT Wallet](chapter-03-wallet-setup.md)
**Next Chapter**: [Chapter 5: Understanding STRAT Tokenomics](chapter-05-tokenomics.md)

**Estimated Time**: 35 minutes
**Difficulty**: Beginner
**Prerequisites**: Chapters 1-3
**Hands-on**: Yes
