# STRAT Miner - Desktop Mining Application

A professional, feature-rich desktop application for mining STRAT cryptocurrency. Built with Electron, React, and TypeScript, this miner provides both beginners and advanced users with powerful mining capabilities wrapped in a beautiful, intuitive interface.

![STRAT Miner](https://img.shields.io/badge/STRAT-Miner-blue?style=for-the-badge)
![Electron](https://img.shields.io/badge/Electron-39.2.7-47848F?style=for-the-badge&logo=electron)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=for-the-badge&logo=typescript)

## Features

### Core Mining Features
- **Multi-Mode Mining**: Support for both solo and pool mining
- **CPU & GPU Mining**: Mine with CPU, GPU, or both simultaneously
- **Real-time Statistics**: Live hashrate, shares, and earnings tracking
- **Web Workers**: Efficient mining using dedicated worker threads
- **Multiple Algorithms**: SHA-256 and Scrypt algorithm support
- **Auto-start**: Configure mining to start automatically on launch

### Pool Management
- **Pre-configured Pools**: Popular STRAT mining pools built-in
- **Custom Pools**: Add your own pool URLs
- **Pool Statistics**: View pool hashrate, fees, and miner count
- **Easy Switching**: Switch between pools with one click

### Performance Monitoring
- **Real-time Charts**: Beautiful graphs showing hashrate over time
- **System Monitoring**: CPU, memory, temperature, and power tracking
- **Resource Usage**: Monitor system performance impact
- **Temperature Alerts**: Track hardware temperature

### History & Analytics
- **Mining History**: Complete record of all mining sessions
- **Earnings Calculator**: Estimated daily earnings based on hashrate
- **Share Statistics**: Track accepted and rejected shares
- **Hourly Reports**: Aggregated statistics by hour

### User Interface
- **Modern Design**: Beautiful dark-themed interface
- **Responsive Layout**: Adapts to different window sizes
- **Interactive Charts**: Powered by Recharts
- **Status Indicators**: Clear visual feedback on mining status

## Installation

### Prerequisites
- Node.js 18+ and npm
- Windows, macOS, or Linux operating system

### Quick Start

1. **Install Dependencies**
   ```bash
   cd miner-app
   npm install
   ```

2. **Development Mode**
   ```bash
   # Start the web interface
   npm run dev

   # In another terminal, build and run Electron
   npm run electron:dev
   ```

3. **Build for Production**
   ```bash
   # Build the application
   npm run build:electron

   # Or create distributable packages
   npm run dist
   ```

## Usage

### For Beginners

1. **Enter Wallet Address**: Go to Settings and enter your STRAT wallet address
2. **Select Mining Pool**: Choose a pool from the Pools tab
3. **Start Mining**: Click the "Start Mining" button in the header
4. **Monitor Progress**: Watch your hashrate and earnings on the Dashboard

### For Advanced Users

#### Performance Tuning
- Adjust thread count based on your CPU cores
- Higher intensity = more hashrate but higher CPU usage
- Monitor temperature to avoid overheating

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| Mining Mode | Solo or Pool mining | Pool |
| Pool URL | Stratum pool address | pool.strat.network:3333 |
| Wallet Address | Your STRAT wallet | (empty) |
| Mining Type | CPU, GPU, or Both | CPU |
| Threads | Number of CPU threads | Auto-detected |
| Intensity | Mining intensity (1-10) | 5 |
| Algorithm | SHA-256 or Scrypt | SHA-256 |
| Auto-start | Start mining on launch | false |

## Building & Distribution

### Build Commands

```bash
# Development build
npm run build

# Build Electron app
npm run build:electron

# Create installers for current platform
npm run dist
```

### Distribution Packages

**Windows:** NSIS Installer (.exe), Portable version
**macOS:** DMG disk image (.dmg), ZIP archive
**Linux:** AppImage (.AppImage), Debian package (.deb)

Output location: `miner-app/release/`

## Project Structure

```
miner-app/
├── electron/              # Electron main process
│   ├── main.ts           # Main Electron entry point
│   └── preload.ts        # Preload script for IPC
├── src/
│   ├── components/       # React components
│   ├── hooks/           # Custom React hooks
│   ├── workers/         # Web Workers for mining
│   ├── types/           # TypeScript type definitions
│   ├── App.tsx          # Main React component
│   └── App.css          # Application styles
├── public/              # Static assets
└── README.md
```

## Technical Details

- **Frontend**: React 19.2 with TypeScript
- **Desktop Framework**: Electron 39.2
- **Build Tool**: Vite 7.2
- **Charts**: Recharts 3.6
- **Packaging**: electron-builder 26.4

## Troubleshooting

### Mining Won't Start
- Ensure wallet address is entered in Settings
- Check pool URL is valid and reachable
- Try switching to a different pool

### Low Hashrate
- Increase mining intensity
- Add more CPU threads
- Enable GPU mining if available

## Security Considerations

- Always verify pool URLs before connecting
- Never share your private keys
- Only enter your wallet address (public address)
- Download only from official sources

## License

MIT License - feel free to use, modify, and distribute.

## Disclaimer

**Important:** Cryptocurrency mining can be resource-intensive and may increase power consumption and hardware wear. Always ensure proper cooling and monitor your hardware. This software is provided "as-is" without warranty.

---

**Happy Mining!** Made with care for the STRAT community
