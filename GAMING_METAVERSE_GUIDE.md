# STRAT Gaming & Metaverse Platform Guide

Complete guide to building games and virtual worlds on the STRAT blockchain.

## Table of Contents

1. [Gaming Infrastructure](#gaming-infrastructure)
2. [Metaverse Features](#metaverse-features)
3. [Game Templates](#game-templates)
4. [Gaming SDK](#gaming-sdk)
5. [API Reference](#api-reference)
6. [Examples](#examples)

---

## Gaming Infrastructure

### Core Systems

#### 1. Game Registration
Register your game on the STRAT platform to enable play-to-earn mechanics and blockchain integration.

```javascript
POST /api/gaming/games
{
  "name": "My Awesome Game",
  "type": "CARD|RPG|RACING|CASINO|STRATEGY|CUSTOM",
  "description": "Game description",
  "minPlayers": 2,
  "maxPlayers": 8,
  "entryFee": 10,
  "playToEarn": {
    "enabled": true,
    "rewardPerGame": 5,
    "rewardPerWin": 20,
    "rewardPerKill": 1,
    "rewardPerLevel": 10
  }
}
```

#### 2. Game Sessions
Create and manage game sessions with anti-cheat and replay recording.

```javascript
// Create session
POST /api/gaming/sessions
{
  "gameId": "game_123",
  "players": [
    { "address": "0x123...", "username": "Player1" }
  ],
  "prizePool": 100
}

// Update session
PATCH /api/gaming/sessions/:sessionId
{
  "gameState": { /* game state */ },
  "event": {
    "type": "PLAYER_ACTION",
    "data": { /* event data */ }
  }
}

// End session
POST /api/gaming/sessions/:sessionId/end
{
  "winner": { "address": "0x123...", "score": 100 },
  "duration": 300000
}
```

#### 3. Play-to-Earn
Automatic reward distribution based on game configuration.

- **Per Game**: Base reward for playing
- **Per Win**: Bonus for winning
- **Per Kill**: Reward for eliminations
- **Per Level**: Reward for leveling up

#### 4. Provably Fair RNG
Cryptographically secure random number generation with verification.

```javascript
POST /api/gaming/rng/number
{
  "sessionId": "session_123",
  "min": 1,
  "max": 100,
  "clientSeed": "player_seed_123"
}

// Returns verifiable random result
{
  "result": 42,
  "hash": "abc123...",
  "serverSeedHash": "def456...",
  "verification": { /* proof data */ }
}
```

#### 5. Matchmaking System
ELO-based matchmaking with skill ratings and divisions.

**Divisions:**
- Bronze (800-999)
- Silver (1000-1299)
- Gold (1300-1599)
- Platinum (1600-1899)
- Diamond (1900-2199)
- Master (2200+)

```javascript
// Join queue
POST /api/gaming/matchmaking/queue
{
  "gameId": "game_123",
  "address": "0x123...",
  "preferences": {
    "region": "NA",
    "mode": "RANKED"
  }
}

// Automatically matched with similar skill players
```

#### 6. Anti-Cheat System
Multi-layered cheat detection:

- **Client Integrity**: File checksum verification
- **Speed Hack Detection**: Movement analysis
- **Botting Detection**: Pattern recognition
- **Aim Assist Detection**: Statistical analysis
- **Action Validation**: Cooldown enforcement

#### 7. Replay System
Record and playback game sessions.

```javascript
// Replays automatically recorded
// Access with:
GET /api/gaming/replay/:replayId

// Features:
- Compression (gzip)
- Event recording
- Frame snapshots
- Highlight generation
- Export/import
```

### Game Assets (NFTs)

Create in-game items as blockchain assets:

```javascript
POST /api/gaming/assets
{
  "gameId": "game_123",
  "owner": "0x123...",
  "name": "Legendary Sword",
  "type": "WEAPON",
  "rarity": "LEGENDARY",
  "attributes": {
    "strength": 50,
    "durability": 100,
    "maxDurability": 100
  }
}
```

**Asset Types:**
- WEAPON
- ARMOR
- SKIN
- CHARACTER
- VEHICLE
- POWERUP
- COLLECTIBLE
- LAND
- BUILDING
- PET

**Rarity Levels:**
- COMMON
- UNCOMMON
- RARE
- EPIC
- LEGENDARY
- MYTHIC

---

## Metaverse Features

### Virtual Land

Mint and own virtual land as NFTs:

```javascript
POST /api/metaverse/land/mint
{
  "name": "My Land",
  "world": "MAIN_WORLD",
  "coordinates": { "x": 10, "y": 20 },
  "size": { "width": 100, "height": 100 },
  "type": "RESIDENTIAL|COMMERCIAL|ENTERTAINMENT",
  "terrain": "FLAT|HILLS|WATER|URBAN",
  "owner": "0x123..."
}
```

**Land Features:**
- Building placement
- Asset placement
- Access control
- Rental system
- Visit tracking
- Revenue tracking

### Avatars

Customizable 3D avatars with equipment:

```javascript
POST /api/metaverse/avatars
{
  "owner": "0x123...",
  "name": "My Avatar",
  "type": "HUMANOID|ROBOT|ALIEN|FANTASY",
  "appearance": {
    "body": { /* body customization */ },
    "head": { /* head customization */ },
    "clothing": { /* clothing items */ }
  },
  "asNFT": true
}
```

**Avatar Types:**
- HUMANOID
- ROBOT
- ALIEN
- FANTASY
- ANIMAL
- CUSTOM

### Metaverse Events

Host virtual events:

```javascript
POST /api/metaverse/events
{
  "name": "Virtual Concert",
  "type": "CONCERT|CONFERENCE|PARTY|GAMING",
  "location": {
    "world": "MAIN_WORLD",
    "landId": "land_123",
    "coordinates": { "x": 10, "y": 20, "z": 0 }
  },
  "schedule": {
    "startTime": "2026-01-15T20:00:00Z",
    "endTime": "2026-01-15T23:00:00Z"
  },
  "capacity": { "maxAttendees": 1000 },
  "ticketing": {
    "free": false,
    "tiers": [
      { "name": "VIP", "price": 50, "supply": 100 }
    ]
  }
}
```

### Virtual Assets

3D assets for the metaverse:

```javascript
POST /api/metaverse/assets
{
  "name": "Modern Chair",
  "type": "FURNITURE",
  "category": "Seating",
  "model": {
    "format": "GLB",
    "file": "https://...",
    "polyCount": 5000
  },
  "marketplace": {
    "forSale": true,
    "price": 10,
    "royalty": {
      "enabled": true,
      "percentage": 5
    }
  }
}
```

---

## Game Templates

### 1. Card Game Template

Perfect for poker, blackjack, collectible card games:

```javascript
const CardGameTemplate = require('./game-templates/cardGame');

const game = new CardGameTemplate({
  deckSize: 52,
  handSize: 5,
  maxPlayers: 8
});

game.initialize(players, rng);
game.dealCards();
game.playCard(playerId, card);
game.placeBet(playerId, amount);
```

**Features:**
- 52-card deck
- Poker hand evaluation
- Betting system
- Fold mechanics
- Multiple rounds

### 2. RPG Template

Character-based role-playing games:

```javascript
const RPGGameTemplate = require('./game-templates/rpgGame');

const game = new RPGGameTemplate({
  maxLevel: 100,
  startingHealth: 100
});

game.createCharacter(playerData);
game.gainExperience(playerId, 100);
game.startCombat(players, enemies);
game.executeCombatAction(actorId, action, targetId);
```

**Features:**
- 4 classes (Warrior, Mage, Rogue, Cleric)
- Level/experience system
- Turn-based combat
- Inventory management
- Quest system

### 3. Racing Template

Vehicle racing games:

```javascript
const RacingGameTemplate = require('./game-templates/racingGame');

const game = new RacingGameTemplate({
  maxPlayers: 8,
  lapCount: 3,
  trackLength: 1000
});

game.addRacer(playerData);
game.startCountdown();
game.updateRacer(racerId, { accelerate: true, boost: false });
```

**Features:**
- Vehicle physics
- Multi-lap racing
- Power-ups
- Position tracking
- Checkpoints

### 4. Casino Template

Casino games with provably fair RNG:

```javascript
const CasinoGameTemplate = require('./game-templates/casinoGame');

const game = new CasinoGameTemplate({
  gameVariant: 'SLOTS|ROULETTE|DICE|CRASH',
  houseEdge: 0.02
});

game.placeBet(playerId, 100, betData);
```

**Game Variants:**
- Slots (3-reel)
- Roulette (European style)
- Dice (over/under)
- Crash (multiplier)

### 5. Strategy Template

Turn-based strategy games:

```javascript
const StrategyGameTemplate = require('./game-templates/strategyGame');

const game = new StrategyGameTemplate({
  mapWidth: 20,
  mapHeight: 20,
  maxPlayers: 4
});

game.addPlayer(playerData);
game.buildStructure(playerId, x, y, 'BARRACKS');
game.trainUnit(playerId, 'SOLDIER', x, y);
game.moveUnit(playerId, unitId, toX, toY);
game.attackUnit(playerId, attackerUnitId, targetX, targetY);
```

**Features:**
- Resource management
- Building system
- Unit training/combat
- Territory control
- Turn-based gameplay

---

## Gaming SDK

Complete SDK for game developers:

```javascript
const STRATGamingSDK = require('./sdk/gamingSDK');

const sdk = new STRATGamingSDK({
  apiUrl: 'http://localhost:3000/api',
  gameId: 'game_123',
  apiKey: 'your_api_key',
  address: '0x123...'
});

await sdk.initialize();

// Session management
const session = await sdk.createSession({ players: [...] });
await sdk.updateSession({ gameState: {...} });
await sdk.endSession({ winner: {...} });

// Rewards
await sdk.awardTokens(address, 100, 'Victory bonus');
await sdk.awardNFT(address, { name: 'Trophy', rarity: 'LEGENDARY' });

// Matchmaking
await sdk.joinQueue({ region: 'NA' });

// Assets
const asset = await sdk.createAsset({ name: 'Sword', type: 'WEAPON' });
await sdk.equipAsset(assetId);

// RNG
const roll = await sdk.generateRandom(1, 100);
const deck = await sdk.shuffleDeck(52);

// Replay
await sdk.startRecording();
await sdk.recordEvent('PLAYER_KILL', data);
await sdk.stopRecording();
```

---

## API Reference

### Gaming Endpoints

```
POST   /api/gaming/games                    - Register game
GET    /api/gaming/games/:gameId            - Get game info
GET    /api/gaming/games                    - List games

POST   /api/gaming/sessions                 - Create session
GET    /api/gaming/sessions/:sessionId      - Get session
PATCH  /api/gaming/sessions/:sessionId      - Update session
POST   /api/gaming/sessions/:sessionId/end  - End session

POST   /api/gaming/assets                   - Create asset
GET    /api/gaming/assets/:assetId          - Get asset
POST   /api/gaming/assets/:assetId/transfer - Transfer asset

POST   /api/gaming/matchmaking/queue        - Join queue
DELETE /api/gaming/matchmaking/queue        - Leave queue
GET    /api/gaming/matchmaking/queue/:gameId - Queue status

GET    /api/gaming/leaderboards/:leaderboardId - Get leaderboard
POST   /api/gaming/leaderboards/:leaderboardId/update - Update score

POST   /api/gaming/rng/number               - Generate random number
POST   /api/gaming/anticheat/verify         - Verify integrity
GET    /api/gaming/replay/:replayId         - Get replay
```

### Metaverse Endpoints

```
POST   /api/metaverse/land/mint             - Mint land
GET    /api/metaverse/land/:landId          - Get land
PATCH  /api/metaverse/land/:landId          - Update land
POST   /api/metaverse/land/:landId/visit    - Visit land

POST   /api/metaverse/avatars               - Create avatar
GET    /api/metaverse/avatars/:avatarId     - Get avatar
PATCH  /api/metaverse/avatars/:avatarId     - Update avatar

POST   /api/metaverse/events                - Create event
GET    /api/metaverse/events/:eventId       - Get event
POST   /api/metaverse/events/:eventId/register - Register for event

POST   /api/metaverse/assets                - Create asset
GET    /api/metaverse/assets/:assetId       - Get asset
POST   /api/metaverse/assets/:assetId/purchase - Purchase asset

GET    /api/metaverse/stats                 - Get statistics
```

---

## Examples

### Example 1: Simple Card Game

```javascript
const sdk = new STRATGamingSDK({ gameId: 'poker_game' });

// Create session
const session = await sdk.createSession({
  players: [
    { address: '0x123...', username: 'Alice' },
    { address: '0x456...', username: 'Bob' }
  ]
});

// Award tokens on win
await sdk.awardTokens('0x123...', 50, 'Won poker hand');
```

### Example 2: Metaverse Land

```javascript
// Mint land
const land = await fetch('/api/metaverse/land/mint', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Gaming Arena',
    world: 'MAIN_WORLD',
    coordinates: { x: 100, y: 100 },
    size: { width: 200, height: 200 },
    type: 'ENTERTAINMENT',
    owner: '0x123...'
  })
});

// Add buildings
await fetch(`/api/metaverse/land/${land.landId}`, {
  method: 'PATCH',
  body: JSON.stringify({
    buildings: [
      {
        name: 'Main Arena',
        type: 'ENTERTAINMENT',
        position: { x: 100, y: 100, z: 0 }
      }
    ]
  })
});
```

### Example 3: Tournament

```javascript
// Create tournament
const tournament = await sdk.createTournament({
  name: 'Monthly Championship',
  format: 'SINGLE_ELIMINATION',
  maxParticipants: 16,
  entryFee: 10,
  prizePool: { total: 1000 }
});

// Register
await sdk.registerForTournament(tournament.tournamentId);
```

---

## Best Practices

1. **Always use provably fair RNG** for randomness
2. **Enable anti-cheat** for competitive games
3. **Record replays** for important matches
4. **Award NFTs** for achievements
5. **Use matchmaking** for balanced games
6. **Implement leaderboards** for engagement
7. **Create land events** for community building
8. **Offer play-to-earn** rewards

---

## Support

For support and questions:
- GitHub: https://github.com/yourusername/strat
- Discord: https://discord.gg/strat
- Docs: https://docs.strat.io

---

Built with STRAT Gaming & Metaverse Platform
