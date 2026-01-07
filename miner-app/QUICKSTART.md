# STRAT Miner - Quick Start Guide

Get started mining STRAT in just a few minutes!

## Prerequisites

- Node.js 18 or higher
- npm (comes with Node.js)
- Windows, macOS, or Linux

## Installation

1. **Navigate to the miner directory**
   ```bash
   cd miner-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

## Development Mode

Run the application in development mode:

```bash
# Terminal 1: Start the Vite dev server
npm run dev

# Terminal 2: Run Electron (after Vite starts)
npm run electron:dev
```

This will open the STRAT Miner application in a desktop window.

## First Time Setup

1. **Enter your wallet address**
   - Click on "Settings" in the sidebar
   - Enter your STRAT wallet address
   - This is where your mining rewards will be sent

2. **Configure mining settings**
   - Choose between Pool Mining (recommended) or Solo Mining
   - Select CPU, GPU, or both
   - Adjust thread count and intensity based on your hardware

3. **Select a mining pool** (if using pool mining)
   - Go to the "Mining Pools" tab
   - Select one of the pre-configured pools or add a custom one
   - The default pool is STRAT Official Pool

4. **Start mining**
   - Click the "Start Mining" button in the header
   - Watch your hashrate and earnings on the Dashboard

## Building for Production

Create distributable packages:

```bash
# Build everything
npm run build:electron

# Create installers for your platform
npm run dist
```

The installers will be in the `release/` directory.

## Troubleshooting

### Development Server Won't Start
```bash
# Clear cache and reinstall
rm -rf node_modules dist dist-electron
npm install
```

### Can't Connect to Pool
- Check your internet connection
- Verify the pool URL is correct
- Try a different pool from the list

### Low Performance
- Reduce mining intensity in Settings
- Use fewer CPU threads
- Close other applications

## Need Help?

- Check the main README.md for detailed documentation
- Join the STRAT community Discord
- Report issues on GitHub

Happy Mining!
