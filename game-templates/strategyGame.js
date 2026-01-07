/**
 * Strategy Game Template for STRAT Gaming Platform
 * Framework for creating turn-based strategy games (tower defense, base building, etc.)
 */

class StrategyGameTemplate {
  constructor(config = {}) {
    this.gameType = 'STRATEGY';
    this.config = {
      mapWidth: config.mapWidth || 20,
      mapHeight: config.mapHeight || 20,
      maxPlayers: config.maxPlayers || 4,
      turnTimeLimit: config.turnTimeLimit || 60000, // 60 seconds
      startingResources: config.startingResources || {
        gold: 1000,
        wood: 500,
        stone: 500,
        food: 200
      },
      ...config
    };

    this.state = {
      players: [],
      map: this.generateMap(),
      turn: 0,
      currentPlayerIndex: 0,
      phase: 'SETUP', // SETUP, PLAYING, ENDED
      winner: null
    };
  }

  /**
   * Generate game map
   */
  generateMap() {
    const map = [];

    for (let y = 0; y < this.config.mapHeight; y++) {
      const row = [];
      for (let x = 0; x < this.config.mapWidth; x++) {
        row.push({
          x,
          y,
          type: 'GRASS',
          occupiedBy: null,
          building: null,
          unit: null,
          resources: Math.random() > 0.9 ? {
            type: Math.random() > 0.5 ? 'GOLD' : 'WOOD',
            amount: 100
          } : null
        });
      }
      map.push(row);
    }

    return map;
  }

  /**
   * Add player to game
   */
  addPlayer(playerData) {
    const startPositions = [
      { x: 2, y: 2 },
      { x: this.config.mapWidth - 3, y: 2 },
      { x: 2, y: this.config.mapHeight - 3 },
      { x: this.config.mapWidth - 3, y: this.config.mapHeight - 3 }
    ];

    const position = startPositions[this.state.players.length];

    const player = {
      id: playerData.address,
      name: playerData.username,
      color: ['RED', 'BLUE', 'GREEN', 'YELLOW'][this.state.players.length],
      resources: { ...this.config.startingResources },
      buildings: [],
      units: [],
      territory: [],
      basePosition: position,
      isAlive: true,
      actionsThisTurn: 0
    };

    // Place base building
    this.placeBuilding(player.id, position.x, position.y, 'BASE');

    this.state.players.push(player);
    return player;
  }

  /**
   * Start game
   */
  startGame() {
    if (this.state.players.length < 2) {
      return { success: false, error: 'Need at least 2 players' };
    }

    this.state.phase = 'PLAYING';
    return { success: true };
  }

  /**
   * Build structure
   */
  buildStructure(playerId, x, y, structureType) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'Player not found' };

    if (!this.isCurrentPlayer(playerId)) {
      return { success: false, error: 'Not your turn' };
    }

    const cost = this.getBuildingCost(structureType);
    if (!this.canAfford(player, cost)) {
      return { success: false, error: 'Insufficient resources' };
    }

    const tile = this.state.map[y][x];
    if (tile.building || tile.unit) {
      return { success: false, error: 'Tile occupied' };
    }

    // Deduct resources
    for (const [resource, amount] of Object.entries(cost)) {
      player.resources[resource] -= amount;
    }

    // Place building
    this.placeBuilding(playerId, x, y, structureType);

    return {
      success: true,
      building: tile.building
    };
  }

  /**
   * Place building on map
   */
  placeBuilding(playerId, x, y, type) {
    const building = {
      id: `building_${Date.now()}_${Math.random()}`,
      type,
      owner: playerId,
      position: { x, y },
      health: this.getBuildingHealth(type),
      maxHealth: this.getBuildingHealth(type),
      level: 1,
      production: this.getBuildingProduction(type)
    };

    this.state.map[y][x].building = building;
    this.state.map[y][x].occupiedBy = playerId;

    const player = this.state.players.find(p => p.id === playerId);
    player.buildings.push(building);

    return building;
  }

  /**
   * Train unit
   */
  trainUnit(playerId, unitType, x, y) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return { success: false };

    const cost = this.getUnitCost(unitType);
    if (!this.canAfford(player, cost)) {
      return { success: false, error: 'Insufficient resources' };
    }

    const tile = this.state.map[y][x];
    if (tile.unit) {
      return { success: false, error: 'Tile occupied' };
    }

    // Deduct resources
    for (const [resource, amount] of Object.entries(cost)) {
      player.resources[resource] -= amount;
    }

    // Create unit
    const unit = {
      id: `unit_${Date.now()}_${Math.random()}`,
      type: unitType,
      owner: playerId,
      position: { x, y },
      health: this.getUnitHealth(unitType),
      maxHealth: this.getUnitHealth(unitType),
      attack: this.getUnitAttack(unitType),
      defense: this.getUnitDefense(unitType),
      movement: this.getUnitMovement(unitType),
      hasActed: false
    };

    this.state.map[y][x].unit = unit;
    player.units.push(unit);

    return {
      success: true,
      unit
    };
  }

  /**
   * Move unit
   */
  moveUnit(playerId, unitId, toX, toY) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return { success: false };

    const unit = player.units.find(u => u.id === unitId);
    if (!unit || unit.hasActed) {
      return { success: false, error: 'Unit cannot move' };
    }

    const distance = Math.abs(toX - unit.position.x) + Math.abs(toY - unit.position.y);
    if (distance > unit.movement) {
      return { success: false, error: 'Too far to move' };
    }

    const targetTile = this.state.map[toY][toX];
    if (targetTile.unit || targetTile.building) {
      return { success: false, error: 'Tile occupied' };
    }

    // Move unit
    this.state.map[unit.position.y][unit.position.x].unit = null;
    unit.position = { x: toX, y: toY };
    this.state.map[toY][toX].unit = unit;
    unit.hasActed = true;

    // Collect resources if on resource tile
    if (targetTile.resources) {
      const collected = Math.min(targetTile.resources.amount, 50);
      player.resources[targetTile.resources.type.toLowerCase()] += collected;
      targetTile.resources.amount -= collected;
      if (targetTile.resources.amount <= 0) {
        targetTile.resources = null;
      }
    }

    return { success: true, unit };
  }

  /**
   * Attack with unit
   */
  attackUnit(playerId, attackerUnitId, targetX, targetY) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return { success: false };

    const attacker = player.units.find(u => u.id === attackerUnitId);
    if (!attacker || attacker.hasActed) {
      return { success: false, error: 'Unit cannot attack' };
    }

    const distance = Math.abs(targetX - attacker.position.x) + Math.abs(targetY - attacker.position.y);
    if (distance > 1) {
      return { success: false, error: 'Target out of range' };
    }

    const targetTile = this.state.map[targetY][targetX];
    const target = targetTile.unit || targetTile.building;

    if (!target || target.owner === playerId) {
      return { success: false, error: 'Invalid target' };
    }

    // Calculate damage
    const damage = Math.max(1, attacker.attack - (target.defense || 0));
    target.health -= damage;

    attacker.hasActed = true;

    // Check if target destroyed
    if (target.health <= 0) {
      if (targetTile.unit) {
        targetTile.unit = null;
        const owner = this.state.players.find(p => p.id === target.owner);
        owner.units = owner.units.filter(u => u.id !== target.id);
      } else if (targetTile.building) {
        targetTile.building = null;
        targetTile.occupiedBy = null;
        const owner = this.state.players.find(p => p.id === target.owner);
        owner.buildings = owner.buildings.filter(b => b.id !== target.id);

        // Check if base was destroyed
        if (target.type === 'BASE') {
          owner.isAlive = false;
          this.checkGameEnd();
        }
      }
    }

    return {
      success: true,
      damage,
      targetDestroyed: target.health <= 0
    };
  }

  /**
   * End turn
   */
  endTurn(playerId) {
    if (!this.isCurrentPlayer(playerId)) {
      return { success: false, error: 'Not your turn' };
    }

    const player = this.state.players[this.state.currentPlayerIndex];

    // Collect resources from buildings
    for (const building of player.buildings) {
      if (building.production) {
        for (const [resource, amount] of Object.entries(building.production)) {
          player.resources[resource] = (player.resources[resource] || 0) + amount;
        }
      }
    }

    // Reset unit actions
    for (const unit of player.units) {
      unit.hasActed = false;
    }

    // Next player
    this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;

    // Skip dead players
    while (!this.state.players[this.state.currentPlayerIndex].isAlive) {
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
    }

    this.state.turn++;

    return {
      success: true,
      nextPlayer: this.state.players[this.state.currentPlayerIndex].id,
      turn: this.state.turn
    };
  }

  /**
   * Check if game should end
   */
  checkGameEnd() {
    const alivePlayers = this.state.players.filter(p => p.isAlive);

    if (alivePlayers.length === 1) {
      this.state.phase = 'ENDED';
      this.state.winner = alivePlayers[0];
      return true;
    }

    return false;
  }

  /**
   * Helper methods
   */
  isCurrentPlayer(playerId) {
    return this.state.players[this.state.currentPlayerIndex].id === playerId;
  }

  canAfford(player, cost) {
    for (const [resource, amount] of Object.entries(cost)) {
      if ((player.resources[resource] || 0) < amount) {
        return false;
      }
    }
    return true;
  }

  getBuildingCost(type) {
    const costs = {
      BASE: { gold: 0, wood: 0, stone: 0 },
      BARRACKS: { gold: 200, wood: 150, stone: 100 },
      FARM: { gold: 100, wood: 200 },
      MINE: { gold: 150, stone: 200 },
      TOWER: { gold: 300, wood: 100, stone: 200 }
    };
    return costs[type] || {};
  }

  getBuildingHealth(type) {
    return { BASE: 500, BARRACKS: 200, FARM: 100, MINE: 150, TOWER: 300 }[type] || 100;
  }

  getBuildingProduction(type) {
    return {
      FARM: { food: 10 },
      MINE: { gold: 5, stone: 5 }
    }[type] || {};
  }

  getUnitCost(type) {
    return {
      WORKER: { gold: 50, food: 10 },
      SOLDIER: { gold: 100, food: 20 },
      ARCHER: { gold: 120, wood: 50, food: 15 },
      CAVALRY: { gold: 200, food: 30 }
    }[type] || {};
  }

  getUnitHealth(type) {
    return { WORKER: 50, SOLDIER: 100, ARCHER: 75, CAVALRY: 120 }[type] || 50;
  }

  getUnitAttack(type) {
    return { WORKER: 5, SOLDIER: 20, ARCHER: 25, CAVALRY: 30 }[type] || 10;
  }

  getUnitDefense(type) {
    return { WORKER: 2, SOLDIER: 10, ARCHER: 5, CAVALRY: 8 }[type] || 5;
  }

  getUnitMovement(type) {
    return { WORKER: 3, SOLDIER: 2, ARCHER: 2, CAVALRY: 4 }[type] || 2;
  }

  /**
   * Get player view of game state
   */
  getPlayerView(playerId) {
    const player = this.state.players.find(p => p.id === playerId);

    return {
      turn: this.state.turn,
      phase: this.state.phase,
      isMyTurn: this.isCurrentPlayer(playerId),
      currentPlayer: this.state.players[this.state.currentPlayerIndex].id,
      myResources: player.resources,
      myBuildings: player.buildings,
      myUnits: player.units,
      map: this.state.map,
      players: this.state.players.map(p => ({
        id: p.id,
        name: p.name,
        color: p.color,
        isAlive: p.isAlive,
        buildingCount: p.buildings.length,
        unitCount: p.units.length
      }))
    };
  }
}

module.exports = StrategyGameTemplate;
