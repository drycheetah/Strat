# Quick Start Guide

Get the Stratis Wallet up and running in minutes!

## Prerequisites

- Node.js 18+ installed
- npm or yarn

## Quick Start Steps

### 1. Install Dependencies

```bash
cd wallet-app
npm install
```

### 2. Run Development Version

```bash
npm run dev
```

The wallet application will open automatically. You can now:
- Create a new wallet
- Restore an existing wallet from a recovery phrase
- Test all features in development mode

### 3. Build Production Version (Optional)

To build a distributable application:

```bash
# Build for your current platform
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

The built application will be in the `release/` directory.

## First Time Usage

### Creating Your First Wallet

1. The app will ask you to create a new wallet
2. Set a strong password (min 8 chars, uppercase, lowercase, numbers)
3. **IMPORTANT**: Write down your 24-word recovery phrase on paper
4. Verify the recovery phrase
5. Done! Your wallet is ready

### What You Can Do

- **Wallet Tab**: View your accounts and balances
- **Send Tab**: Send STRAT to another address
- **Receive Tab**: Get your address and QR code to receive STRAT
- **History Tab**: View transaction history
- **Address Book**: Save frequently used addresses
- **Settings**: Change network, lock wallet, view app info

## Important Security Notes

1. Your 24-word recovery phrase is the ONLY way to restore your wallet
2. Store it somewhere safe (write it on paper, keep in a safe)
3. Never share it with anyone
4. The password encrypts your wallet on this computer only
5. If you lose both password and recovery phrase, your funds are lost forever

## Testing on Testnet

By default, the wallet uses mainnet. To test safely:

1. Go to Settings
2. Select "Testnet" network
3. Your addresses will change (this is normal)
4. Get test STRAT from a testnet faucet
5. Test all features without risking real funds

## Troubleshooting

### App won't start?
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Can't see my balance?
- Check your internet connection
- Make sure you're on the correct network (Mainnet/Testnet)
- Wait a few moments for the API to respond

### Forgot password?
- You'll need your 24-word recovery phrase
- Click "Restore wallet from recovery phrase" on the unlock screen
- Enter your recovery phrase
- Set a new password

## Need Help?

Check the full [README.md](README.md) for detailed documentation.

Happy using your Stratis Wallet!
