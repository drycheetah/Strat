# STRAT Mobile Applications

Complete suite of mobile applications for the STRAT blockchain ecosystem.

## Applications Overview

### 1. Wallet App (React Native)
**Location:** `mobile-apps/wallet-app/`

A full-featured cryptocurrency wallet with advanced security and DeFi integration.

#### Features
- **HD Wallet:** BIP39/BIP32 mnemonic generation and recovery
- **Biometric Security:** Face ID, Touch ID, and fingerprint authentication
- **QR Code Support:** Scan and generate QR codes for transactions
- **Push Notifications:** Real-time transaction and price alerts
- **Transaction History:** Complete transaction tracking with status
- **DeFi Integration:** Staking, liquidity pools, and yield farming
- **Multi-Account:** Derive multiple accounts from single seed
- **Secure Storage:** AES-256 encryption for private keys

#### Technology Stack
- React Native 0.73
- Expo SDK 50
- TypeScript
- Zustand (State Management)
- Socket.IO (Real-time updates)
- Expo Local Authentication
- Expo Camera (QR Scanning)

#### Setup
```bash
cd mobile-apps/wallet-app
npm install
npm start

# Run on device
npm run android
npm run ios
```

#### Key Services
- `WalletService.ts` - HD wallet operations
- `BiometricService.ts` - Biometric authentication
- `QRService.ts` - QR code scanning/generation
- `NotificationService.ts` - Push notifications
- `ApiService.ts` - Backend API integration

---

### 2. Miner App (React Native)
**Location:** `mobile-apps/miner-app/`

Mobile cryptocurrency mining application with background mining support.

#### Features
- **Background Mining:** Continue mining when app is in background
- **Pool Mining:** Connect to mining pools or mine solo
- **Real-time Stats:** Live hash rate, blocks found, earnings
- **Power Management:** Adjustable mining power (low, medium, high)
- **Hash Rate Chart:** Visual hash rate monitoring
- **Earnings Tracking:** Track total STRAT earned
- **Notification Alerts:** Block found notifications

#### Technology Stack
- React Native 0.73
- Expo Background Fetch
- Expo Task Manager
- React Native Chart Kit
- Crypto-JS (SHA-256 hashing)

#### Setup
```bash
cd mobile-apps/miner-app
npm install
npm start
```

#### Mining Algorithm
- Proof-of-Work (SHA-256)
- Configurable difficulty
- Mobile-optimized CPU mining
- Background task execution

---

### 3. Portfolio Tracker (Flutter)
**Location:** `mobile-apps/portfolio-tracker/`

Advanced portfolio management with multi-wallet support and analytics.

#### Features
- **Multi-Wallet Support:** Track multiple STRAT wallets
- **Price Charts:** Candlestick, line, and area charts
- **Portfolio Analytics:** Asset allocation, performance tracking
- **News Feed:** Latest cryptocurrency news
- **Price Alerts:** Set custom price alert notifications
- **Real-time Updates:** WebSocket-based live data
- **Beautiful UI:** Material Design with dark theme

#### Technology Stack
- Flutter 3.0+
- Dart SDK
- Provider (State Management)
- FL Chart & Syncfusion Charts
- Hive (Local Database)
- Socket.IO Client

#### Setup
```bash
cd mobile-apps/portfolio-tracker
flutter pub get
flutter run
```

#### Screens
- Dashboard - Overview of entire portfolio
- Portfolio - Detailed wallet management
- Charts - Advanced price charts
- News - Cryptocurrency news feed
- Alerts - Price alert management

---

### 4. NFT Gallery (React Native)
**Location:** `mobile-apps/nft-gallery/`

NFT collection viewer and manager.

#### Features
- **Grid/List Views:** Toggle between viewing modes
- **Rarity Filtering:** Filter by legendary, epic, rare, common
- **Collection Stats:** Total value, items, collections
- **Fast Image Loading:** Optimized image rendering
- **NFT Creation:** Create and mint new NFTs
- **Beautiful UI:** Card-based design with rarity colors

#### Technology Stack
- React Native 0.73
- Expo Image Picker
- React Native Fast Image
- Zustand

#### Setup
```bash
cd mobile-apps/nft-gallery
npm install
npm start
```

---

### 5. DAO Voting (React Native)
**Location:** `mobile-apps/dao-voting/`

Decentralized governance and proposal voting.

#### Features
- **Proposal Listing:** Browse active, passed, and rejected proposals
- **Category Filtering:** Technical, economic, governance, community
- **Vote Progress:** Real-time voting statistics
- **Voting Power Display:** See your voting influence
- **Time Remaining:** Countdown for active proposals
- **Create Proposals:** Submit new governance proposals

#### Technology Stack
- React Native 0.73
- React Native Chart Kit
- Socket.IO (Real-time voting updates)

#### Setup
```bash
cd mobile-apps/dao-voting
npm install
npm start
```

---

### 6. Social Feed (React Native)
**Location:** `mobile-apps/social-feed/`

Social networking for the STRAT community.

#### Features
- **News Feed:** Instagram-style social feed
- **Stories:** Temporary status updates
- **Post Creation:** Share text and images
- **Interactions:** Like, comment, share, send
- **Verified Badges:** Verified user indicators
- **Pull-to-Refresh:** Easy feed updates
- **Real-time Updates:** Live social interactions

#### Technology Stack
- React Native 0.73
- Expo Image Picker
- Socket.IO
- Timeago.js

#### Setup
```bash
cd mobile-apps/social-feed
npm install
npm start
```

---

## Platform Support

### iOS
- Minimum Version: iOS 13.0+
- Hermes Engine: Enabled
- Face ID / Touch ID: Supported
- Push Notifications: Firebase Cloud Messaging

### Android
- Minimum SDK: 23 (Android 6.0)
- Target SDK: 34 (Android 14)
- Hermes Engine: Enabled
- Biometric: Fingerprint and Face Recognition
- ProGuard: Enabled for release builds

---

## Common Setup

### Prerequisites
```bash
# Node.js
node --version  # v18.0.0 or higher

# React Native CLI
npm install -g react-native-cli

# Expo CLI
npm install -g expo-cli

# Flutter (for portfolio tracker)
flutter doctor
```

### Environment Variables
Create `.env` file in each app:

```env
API_BASE_URL=https://api.strat.io
WS_URL=wss://api.strat.io
FIREBASE_API_KEY=your_firebase_key
```

---

## Development

### Running All Apps

#### Wallet App
```bash
cd mobile-apps/wallet-app && npm start
```

#### Miner App
```bash
cd mobile-apps/miner-app && npm start
```

#### Portfolio Tracker
```bash
cd mobile-apps/portfolio-tracker && flutter run
```

#### NFT Gallery
```bash
cd mobile-apps/nft-gallery && npm start
```

#### DAO Voting
```bash
cd mobile-apps/dao-voting && npm start
```

#### Social Feed
```bash
cd mobile-apps/social-feed && npm start
```

---

## Building for Production

### Android

#### React Native Apps
```bash
cd mobile-apps/wallet-app
npx expo build:android

# Or using EAS Build
eas build --platform android
```

#### Flutter App
```bash
cd mobile-apps/portfolio-tracker
flutter build apk --release
flutter build appbundle --release
```

### iOS

#### React Native Apps
```bash
cd mobile-apps/wallet-app
npx expo build:ios

# Or using EAS Build
eas build --platform ios
```

#### Flutter App
```bash
cd mobile-apps/portfolio-tracker
flutter build ios --release
```

---

## Security Features

### Wallet App
- AES-256 encryption for private keys
- Biometric authentication
- Secure enclave storage (iOS)
- Keystore system (Android)
- SSL certificate pinning
- No private key transmission

### Authentication
- Local biometric authentication
- Encrypted local storage
- Session management
- Auto-logout on inactivity

---

## Performance Optimizations

### React Native
- Hermes JavaScript engine
- Code splitting
- Image optimization
- Lazy loading
- Memoization
- Virtual lists

### Flutter
- Tree shaking
- Code obfuscation
- Asset compression
- Cached network images
- Efficient state management

---

## Testing

### Unit Tests
```bash
# React Native apps
npm test

# Flutter app
flutter test
```

### E2E Tests
```bash
# Detox for React Native
npm run e2e:ios
npm run e2e:android

# Integration tests for Flutter
flutter drive --target=test_driver/app.dart
```

---

## API Integration

All apps connect to the STRAT blockchain backend:

### Endpoints
- REST API: `https://api.strat.io/api`
- WebSocket: `wss://api.strat.io`

### Features
- Real-time balance updates
- Transaction broadcasting
- Price data
- NFT metadata
- Governance proposals
- Social feed

---

## Deployment

### App Stores

#### Google Play
1. Build signed APK/AAB
2. Create developer account
3. Upload to Play Console
4. Fill app details and screenshots
5. Submit for review

#### Apple App Store
1. Build IPA file
2. Create App Store Connect account
3. Upload via Xcode or Transporter
4. Fill app metadata
5. Submit for review

---

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

---

## License

MIT License - See LICENSE file for details

---

## Support

- Documentation: https://docs.strat.io
- Discord: https://discord.gg/strat
- Twitter: @STRATBlockchain
- Email: support@strat.io

---

## Changelog

### v1.0.0 (2024-01-06)
- Initial release of all mobile apps
- HD wallet implementation
- Background mining
- Portfolio tracking
- NFT gallery
- DAO voting
- Social feed
- Biometric authentication
- Push notifications
- Real-time updates

---

## Roadmap

### Q1 2024
- Hardware wallet support
- Advanced charting
- DEX integration
- Cross-chain swaps

### Q2 2024
- NFT marketplace
- Advanced governance features
- Social video support
- Live streaming

### Q3 2024
- DeFi dashboard
- Lending/borrowing
- Options trading
- Portfolio rebalancing

---

**Built with ❤️ for the STRAT Community**
