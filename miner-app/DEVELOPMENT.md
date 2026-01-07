# STRAT Miner - Development Guide

## Development Setup

### Prerequisites
- Node.js 18+ (includes npm)
- Git (optional)
- Code editor (VS Code recommended)

### Initial Setup

1. **Install Dependencies**
   ```bash
   cd miner-app
   npm install
   ```

2. **Verify Installation**
   ```bash
   npm list --depth=0
   ```

## Development Workflow

### Running in Development Mode

**Option 1: Web Browser (Fastest)**
```bash
npm run dev
```
Open http://localhost:5173 in your browser.

**Option 2: Electron Desktop (Full Experience)**

Terminal 1:
```bash
npm run dev
```

Terminal 2 (after Vite starts):
```bash
npm run electron:dev
```

### Building

**Build React App Only**
```bash
npm run build
```
Output: `dist/` directory

**Build Electron App**
```bash
npm run build:electron
```
Output: `dist/` and `dist-electron/` directories

**Create Distribution Packages**
```bash
npm run dist
```
Output: `release/` directory

**Create Unpacked Build (Testing)**
```bash
npm run package
```
Output: `release/` directory (unpacked)

## Project Structure

### Source Files

```
src/
├── components/           # React UI components
├── hooks/               # Custom React hooks
├── workers/             # Web Workers
├── types/               # TypeScript types
├── App.tsx              # Root component
├── App.css              # Styles
├── index.css            # Global styles
└── main.tsx             # React entry
```

### Electron Files

```
electron/
├── main.ts              # Main process
└── preload.ts           # Preload script
```

### Configuration Files

```
├── package.json         # Dependencies & scripts
├── tsconfig.json        # React TypeScript
├── tsconfig.electron.json # Electron TypeScript
├── vite.config.ts       # Vite config
└── .gitignore           # Git ignore
```

## Making Changes

### Adding a New Component

1. Create file in `src/components/`
   ```tsx
   // src/components/MyComponent.tsx
   interface MyComponentProps {
     title: string;
   }

   const MyComponent = ({ title }: MyComponentProps) => {
     return <div>{title}</div>;
   };

   export default MyComponent;
   ```

2. Import and use
   ```tsx
   import MyComponent from './components/MyComponent';
   ```

### Adding New Types

1. Edit `src/types/index.ts`
   ```typescript
   export interface MyNewType {
     field: string;
   }
   ```

2. Import with type-only import
   ```typescript
   import type { MyNewType } from '../types';
   ```

### Modifying Mining Logic

1. Edit `src/workers/mining.worker.ts`
2. The worker runs in a separate thread
3. Communicate via `postMessage` and `onmessage`

### Styling

1. Global styles: `src/index.css`
2. Component styles: `src/App.css`
3. Use existing CSS classes for consistency

## Common Tasks

### Adding a New Mining Pool

Edit `src/components/Pools.tsx`:

```typescript
const [pools] = useState<Pool[]>([
  // Add new pool here
  {
    name: 'New Pool',
    url: 'stratum+tcp://newpool.com:3333',
    fee: 1,
    minPayout: 10,
    difficulty: 'Variable',
    miners: 1000,
    hashrate: '5 GH/s',
  },
  // ... existing pools
]);
```

### Changing Default Settings

Edit `src/App.tsx`:

```typescript
const [config, setConfig] = useState<MiningConfig>({
  mode: 'pool',
  poolUrl: 'stratum+tcp://your-pool.com:3333',
  walletAddress: '',
  miningType: 'cpu',
  threads: 4, // Change default threads
  intensity: 7, // Change default intensity
  algorithm: 'sha256',
  autoStart: false,
  difficulty: 4,
});
```

### Adding Menu Items

Edit `electron/main.ts`:

```typescript
const template: any = [
  {
    label: 'My Menu',
    submenu: [
      {
        label: 'My Action',
        click: () => {
          mainWindow?.webContents.send('my-event');
        },
      },
    ],
  },
  // ... existing menus
];
```

## Debugging

### Browser DevTools

- Right-click → Inspect Element
- Or press F12
- Console tab for logs
- Network tab for requests
- Performance tab for profiling

### Electron DevTools

Automatically opens in development mode.

To manually open:
```typescript
mainWindow.webContents.openDevTools();
```

### Console Logging

```typescript
console.log('Debug:', data);
console.error('Error:', error);
console.warn('Warning:', warning);
```

### TypeScript Errors

```bash
# Check types without building
npx tsc --noEmit
```

## Testing

### Manual Testing Checklist

**Mining Functions**
- [ ] Start mining
- [ ] Stop mining
- [ ] Restart mining
- [ ] Mine with different thread counts
- [ ] Mine with different intensities

**Configuration**
- [ ] Change pool URL
- [ ] Change wallet address
- [ ] Toggle mining modes
- [ ] Adjust settings while mining
- [ ] Enable auto-start

**UI/UX**
- [ ] Navigate between views
- [ ] Resize window
- [ ] Check all charts render
- [ ] Verify stats update
- [ ] Test responsive layout

**System**
- [ ] Monitor CPU usage
- [ ] Check memory consumption
- [ ] Verify temperature display
- [ ] Test on different OS (if available)

### Build Testing

```bash
# Clean build
rm -rf node_modules dist dist-electron release
npm install
npm run build:electron
```

## Performance Optimization

### Bundle Size

Check bundle size:
```bash
npm run build
# Look at dist/ file sizes
```

### React DevTools

Install React DevTools browser extension for:
- Component tree inspection
- Props/state viewing
- Performance profiling

### Memory Leaks

Watch for:
- Unmounted components with active intervals
- Event listeners not cleaned up
- Large arrays in state

## Common Issues

### Port Already in Use

```bash
# Kill process on port 5173
npx kill-port 5173
```

### TypeScript Errors

```bash
# Clear cache
rm -rf node_modules dist dist-electron
npm install
```

### Build Fails

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Electron Won't Start

1. Ensure React app is built first
2. Check `dist/` directory exists
3. Verify `dist-electron/` has main.js

## Code Style

### TypeScript

- Use `interface` for object types
- Use `type` for unions/intersections
- Prefer `const` over `let`
- Use type-only imports: `import type { ... }`

### React

- Functional components only
- Use hooks for state
- Extract complex logic to custom hooks
- Keep components focused and small

### Naming

- Components: PascalCase
- Files: PascalCase.tsx
- Hooks: useCamelCase
- Types: PascalCase
- CSS classes: kebab-case

### Formatting

- 2 spaces indentation
- Single quotes for strings
- Trailing commas in objects/arrays
- Semicolons required

## Git Workflow (Optional)

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
git add .
git commit -m "Add my feature"

# Push to remote
git push origin feature/my-feature
```

## Resources

### Documentation
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Electron](https://www.electronjs.org/)
- [Vite](https://vitejs.dev/)
- [Recharts](https://recharts.org/)

### Tools
- [VS Code](https://code.visualstudio.com/)
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [TypeScript Playground](https://www.typescriptlang.org/play)

## Support

- Issues: Report on GitHub
- Questions: STRAT Discord
- Email: support@strat.network

---

Happy Coding! 🚀
