# STRAT SOL Bridge Guide

## ⚠️ IMPORTANT DISCLAIMERS

1. **EXPERIMENTAL FEATURE**: This bridge is in beta testing
2. **NO MONETARY VALUE**: STRAT tokens have no monetary value
3. **TESTNET ONLY**: For testing and educational purposes only
4. **USE AT YOUR OWN RISK**: No guarantees or warranties provided

## How It Works

Users can send Solana (SOL) to a designated wallet address and receive STRAT tokens in exchange.

### Exchange Rate
- **1 SOL = 1000 STRAT** (configurable in `.env`)

### Bridge Address
```
7B44YFiRvjFZe7FgRavwKApcpAF452JcMXR4E4befpAq
```

## User Instructions

### Step 1: Send SOL
1. Open your Solana wallet (Phantom, Solflare, etc.)
2. Send SOL to the bridge address above
3. **Copy the transaction signature** from your wallet

### Step 2: Claim STRAT
1. Log into STRAT dashboard
2. Navigate to "SOL Bridge" section
3. Paste your transaction signature
4. Click "Verify & Claim STRAT"
5. Your STRAT tokens will be credited instantly

## Backend Verification Process

The bridge controller (`controllers/bridgeController.js`) performs these checks:

1. **Fetches transaction** from Solana mainnet-beta
2. **Verifies destination** - confirms SOL was sent to bridge address
3. **Calculates amount** - determines how much SOL was received
4. **Credits STRAT** - mints equivalent STRAT tokens to user's wallet
5. **Records history** - saves transaction for future reference

## Configuration

Edit `.env` to configure:

```env
# Bridge address (your SOL wallet)
BRIDGE_SOL_ADDRESS=7B44YFiRvjFZe7FgRavwKApcpAF452JcMXR4E4befpAq

# How many STRAT per 1 SOL
BRIDGE_EXCHANGE_RATE=1000

# Solana RPC endpoint
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## API Endpoints

### GET `/api/bridge/info`
Returns bridge configuration (public, no auth required)

### POST `/api/bridge/verify`
Verifies SOL deposit and credits STRAT (requires authentication)

Body:
```json
{
  "signature": "your-solana-transaction-signature"
}
```

### GET `/api/bridge/history`
Returns user's bridge transaction history (requires authentication)

## Security Considerations

1. **Transaction uniqueness**: Each Solana signature can only be claimed once
2. **On-chain verification**: All transactions are verified against Solana mainnet
3. **Rate limiting**: Consider adding rate limits to prevent abuse
4. **Minimum deposit**: Consider adding minimum SOL amount

## Legal Considerations

This bridge could be considered a:
- Token exchange/swap
- On-ramp service
- Money transmitter (depending on jurisdiction)

**Recommendations:**
1. Keep clear disclaimers that STRAT has no value
2. Don't advertise as "buying" STRAT
3. Consider geoblocking certain jurisdictions
4. Consult with legal counsel before production use

## Troubleshooting

### "Transaction not found"
- Wait a few seconds for Solana finalization
- Verify you're using mainnet-beta transaction

### "Transaction does not involve bridge address"
- Double-check you sent to the correct address
- Verify the destination in your wallet

### "No SOL was sent to bridge address"
- The transaction must transfer SOL (not tokens)
- Make sure you didn't just view the address

## Support

For issues or questions, check the logs:
```bash
tail -f logs/strat.log
```
