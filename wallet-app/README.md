# Stratis Wallet

A secure, production-ready HD wallet application for Stratis (STRAT) cryptocurrency built with Electron, React, and TypeScript.

## Features

- **HD Wallet Generation**: Create new wallets with BIP39 24-word mnemonic seed phrases
- **Multi-Account Support**: Derive multiple accounts from a single seed phrase (BIP44)
- **Send & Receive STRAT**: Full transaction support with QR code generation
- **Transaction History**: View all your transaction history with confirmations
- **Address Book**: Save and manage frequently used addresses
- **Network Selection**: Switch between mainnet and testnet
- **Encrypted Storage**: All wallet data is encrypted using AES-256
- **Import/Export**: Restore wallets from seed phrases
- **Cross-Platform**: Available for Windows, macOS, and Linux

## Security Features

- **Strong Password Requirements**: Enforced password complexity
- **AES-256 Encryption**: All sensitive data is encrypted locally
- **Isolated Storage**: Wallet data is stored in OS-specific secure directories
- **No Remote Key Storage**: Private keys never leave your device
- **Mnemonic Verification**: Required verification during wallet creation
- **Context Isolation**: Electron security best practices

## Technology Stack

- **Frontend**: React 19 + TypeScript
- **Desktop Framework**: Electron
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Crypto Libraries**:
  - bitcoinjs-lib (transaction handling)
  - bip39 (mnemonic generation)
  - bip32 (HD key derivation)
  - crypto-js (AES encryption)
- **UI Icons**: Heroicons

## Prerequisites

- Node.js 18.x or higher
- npm or yarn package manager

## Installation

### Clone and Install Dependencies

```bash
cd wallet-app
npm install
```

## Development

### Run in Development Mode

```bash
npm run dev
```

This will start the Vite development server and launch the Electron application with hot reload enabled.

## Building for Production

### Build for Current Platform

```bash
npm run build
```

### Build for Specific Platforms

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux

# All platforms
npm run build:all
```

The built applications will be available in the `release/` directory.

## Build Output

- **Windows**: `.exe` installer and portable `.exe`
- **macOS**: `.dmg` installer and `.zip` archive
- **Linux**: `.AppImage` and `.deb` package

## Project Structure

```
wallet-app/
├── electron/              # Electron main process files
│   ├── main.js           # Main Electron process
│   └── preload.js        # Preload script for IPC
├── src/
│   ├── components/       # React components
│   │   ├── CreateWallet.tsx
│   │   ├── UnlockWallet.tsx
│   │   ├── RestoreWallet.tsx
│   │   ├── Dashboard.tsx
│   │   ├── WalletView.tsx
│   │   ├── Send.tsx
│   │   ├── Receive.tsx
│   │   ├── History.tsx
│   │   ├── AddressBook.tsx
│   │   └── Settings.tsx
│   ├── utils/            # Utility functions
│   │   ├── wallet.ts     # HD wallet functionality
│   │   ├── encryption.ts # AES encryption
│   │   └── storage.ts    # Secure storage
│   ├── services/         # API services
│   │   └── api.ts        # Blockchain API client
│   ├── types/            # TypeScript definitions
│   │   └── electron.d.ts
│   ├── App.tsx           # Main React component
│   ├── main.tsx          # React entry point
│   └── index.css         # Tailwind styles
├── electron-builder.json # Electron Builder config
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # Tailwind configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Project dependencies

```

## Usage Guide

### Creating a New Wallet

1. Launch the application
2. Click "Get Started" to create a new wallet
3. Set a strong password (minimum 8 characters, uppercase, lowercase, and numbers)
4. Write down your 24-word recovery phrase in order
5. Verify the recovery phrase by entering requested words
6. Your wallet is now created and ready to use

### Restoring an Existing Wallet

1. Launch the application
2. Click "Restore wallet from recovery phrase"
3. Enter your 24-word recovery phrase
4. Set a new password
5. Your wallet will be restored with all accounts

### Sending STRAT

1. Go to the "Send" tab
2. Enter the recipient address or select from address book
3. Enter the amount to send
4. Review the transaction details
5. Confirm and send

### Receiving STRAT

1. Go to the "Receive" tab
2. Share your address or QR code
3. Optionally specify an amount and label for the payment request

### Managing Accounts

1. Go to the "Wallet" tab
2. View all your accounts and their balances
3. Click "Add Account" to create a new account
4. Click on any account to make it active

## Configuration

### Network Configuration

The wallet supports both mainnet and testnet networks. You can switch between them in the Settings tab.

- **Mainnet**: Production network with real STRAT
- **Testnet**: Development network for testing

### Data Storage Locations

Wallet data is stored in OS-specific secure directories:

- **Windows**: `%APPDATA%\strat-wallet\wallet-data\`
- **macOS**: `~/Library/Application Support/strat-wallet/wallet-data/`
- **Linux**: `~/.config/strat-wallet/wallet-data/`

## Security Best Practices

1. **Backup Your Recovery Phrase**: Write it down and store it in a secure location
2. **Never Share Your Recovery Phrase**: Anyone with your phrase can access your funds
3. **Use a Strong Password**: Follow the password requirements
4. **Verify Addresses**: Always double-check recipient addresses before sending
5. **Keep Software Updated**: Update to the latest version for security patches
6. **Use Testnet First**: Test the wallet on testnet before using real funds

## API Endpoints

The wallet connects to Stratis blockchain APIs:

- **Mainnet API**: `https://api.stratisplatform.com/api`
- **Testnet API**: `https://testnet-api.stratisplatform.com/api`

## Known Limitations

- **Transaction Signing**: The current implementation includes a placeholder for transaction signing. Full transaction creation and broadcasting requires integration with the Stratis network's UTXO model and transaction format.
- **Price Data**: Price information is fetched from external APIs (CoinGecko) and may not always be available.

## Troubleshooting

### Build Issues

If you encounter build errors:

```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf dist dist-electron release
```

### Development Issues

If the app doesn't start in development mode:

```bash
# Check Node.js version
node --version  # Should be 18.x or higher

# Restart the dev server
npm run dev
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Disclaimer

This is a cryptocurrency wallet. Always test thoroughly with small amounts first. The developers are not responsible for any loss of funds. Use at your own risk.

## Support

For issues, questions, or contributions, please visit the project repository.

## Acknowledgments

- Stratis Platform for the blockchain infrastructure
- Bitcoin.js library for cryptographic functions
- Electron and React communities for excellent frameworks

---

**Version**: 1.0.0
**Last Updated**: 2026-01-06
