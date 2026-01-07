/**
 * RPG Game Template for STRAT Gaming Platform
 * Framework for creating role-playing games with characters, combat, quests, and inventory
 */

class RPGGameTemplate {
  constructor(config = {}) {
    this.gameType = 'RPG';
    this.config = {
      maxLevel: config.maxLevel || 100,
      startingLevel: config.startingLevel || 1,
      startingHealth: config.startingHealth || 100,
      startingMana: config.startingMana || 50,
      combatTurnTime: config.combatTurnTime || 30000,
      ...config
    };

    this.state = {
      players: [],
      monsters: [],
      npcs: [],
      quests: [],
      world: {
        currentArea: 'START',
        time: 0
      },
      combat: {
        active: false,
        turn: 0,
        participants: []
      }
    };
  }

  /**
   * Create a character
   * @param {object} playerData - Player data
   * @returns {object} Character
   */
  createCharacter(playerData) {
    const character = {
      id: playerData.address,
      name: playerData.username,
      class: playerData.class || 'WARRIOR',
      level: this.config.startingLevel,
      experience: 0,
      experienceToNextLevel: this.calculateExpForLevel(this.config.startingLevel + 1),
      stats: {
        health: this.config.startingHealth,
        maxHealth: this.config.startingHealth,
        mana: this.config.startingMana,
        maxMana: this.config.startingMana,
        strength: 10,
        intelligence: 10,
        dexterity: 10,
        vitality: 10,
        luck: 10
      },
      inventory: {
        items: [],
        maxSlots: 20,
        gold: 0
      },
      equipment: {
        weapon: null,
        armor: null,
        helmet: null,
        boots: null,
        accessory: null
      },
      skills: this.getStartingSkills(playerData.class),
      quests: {
        active: [],
        completed: []
      },
      position: { x: 0, y: 0, area: 'START' },
      status: 'ALIVE'
    };

    this.state.players.push(character);
    return character;
  }

  /**
   * Get starting skills based on class
   */
  getStartingSkills(className) {
    const skillSets = {
      WARRIOR: [
        { name: 'Power Strike', damage: 20, manaCost: 10, cooldown: 0 },
        { name: 'Shield Block', defense: 15, manaCost: 5, cooldown: 0 }
      ],
      MAGE: [
        { name: 'Fireball', damage: 30, manaCost: 20, cooldown: 0 },
        { name: 'Ice Shield', defense: 10, manaCost: 15, cooldown: 0 }
      ],
      ROGUE: [
        { name: 'Backstab', damage: 25, manaCost: 8, cooldown: 0 },
        { name: 'Stealth', evasion: 20, manaCost: 10, cooldown: 0 }
      ],
      CLERIC: [
        { name: 'Heal', healing: 30, manaCost: 15, cooldown: 0 },
        { name: 'Smite', damage: 15, manaCost: 10, cooldown: 0 }
      ]
    };

    return skillSets[className] || skillSets.WARRIOR;
  }

  /**
   * Calculate experience needed for level
   */
  calculateExpForLevel(level) {
    return Math.floor(100 * Math.pow(level, 1.5));
  }

  /**
   * Gain experience
   */
  gainExperience(playerId, amount) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return { success: false };

    player.experience += amount;
    const levelsGained = [];

    while (player.experience >= player.experienceToNextLevel && player.level < this.config.maxLevel) {
      player.level++;
      player.experience -= player.experienceToNextLevel;
      player.experienceToNextLevel = this.calculateExpForLevel(player.level + 1);

      // Level up bonuses
      player.stats.maxHealth += 10;
      player.stats.maxMana += 5;
      player.stats.health = player.stats.maxHealth;
      player.stats.mana = player.stats.maxMana;
      player.stats.strength += 2;
      player.stats.intelligence += 2;
      player.stats.dexterity += 1;
      player.stats.vitality += 1;

      levelsGained.push(player.level);
    }

    return {
      success: true,
      currentLevel: player.level,
      levelsGained,
      experienceGained: amount
    };
  }

  /**
   * Start combat
   */
  startCombat(players, enemies) {
    this.state.combat = {
      active: true,
      turn: 0,
      turnOrder: [...players, ...enemies].sort((a, b) => b.stats.dexterity - a.stats.dexterity),
      currentTurnIndex: 0,
      log: []
    };

    return {
      success: true,
      turnOrder: this.state.combat.turnOrder.map(p => ({ id: p.id, name: p.name }))
    };
  }

  /**
   * Execute combat action
   */
  executeCombatAction(actorId, action, targetId) {
    if (!this.state.combat.active) {
      return { success: false, error: 'No combat active' };
    }

    const actor = this.state.combat.turnOrder.find(p => p.id === actorId);
    const target = this.state.combat.turnOrder.find(p => p.id === targetId);

    if (!actor || !target) {
      return { success: false, error: 'Invalid actor or target' };
    }

    let damage = 0;
    let healing = 0;

    switch (action.type) {
      case 'ATTACK':
        damage = Math.max(1, actor.stats.strength + (action.weaponDamage || 0) - target.stats.defense || 0);
        target.stats.health -= damage;
        break;

      case 'SKILL':
        const skill = actor.skills.find(s => s.name === action.skillName);
        if (!skill) return { success: false, error: 'Skill not found' };

        if (actor.stats.mana < skill.manaCost) {
          return { success: false, error: 'Insufficient mana' };
        }

        actor.stats.mana -= skill.manaCost;

        if (skill.damage) {
          damage = skill.damage + Math.floor(actor.stats.intelligence * 0.5);
          target.stats.health -= damage;
        }

        if (skill.healing) {
          healing = skill.healing;
          target.stats.health = Math.min(target.stats.maxHealth, target.stats.health + healing);
        }
        break;

      case 'ITEM':
        // Use item from inventory
        break;

      case 'DEFEND':
        actor.defending = true;
        break;
    }

    // Check if target died
    if (target.stats.health <= 0) {
      target.status = 'DEAD';
      this.state.combat.turnOrder = this.state.combat.turnOrder.filter(p => p.id !== target.id);
    }

    // Advance turn
    this.state.combat.turn++;
    this.state.combat.currentTurnIndex = (this.state.combat.currentTurnIndex + 1) % this.state.combat.turnOrder.length;

    // Check if combat should end
    const playersAlive = this.state.combat.turnOrder.filter(p => this.state.players.find(pl => pl.id === p.id));
    const enemiesAlive = this.state.combat.turnOrder.filter(p => !this.state.players.find(pl => pl.id === p.id));

    if (playersAlive.length === 0 || enemiesAlive.length === 0) {
      return this.endCombat();
    }

    return {
      success: true,
      damage,
      healing,
      targetHealth: target.stats.health,
      actorMana: actor.stats.mana,
      nextTurn: this.state.combat.turnOrder[this.state.combat.currentTurnIndex].id
    };
  }

  /**
   * End combat
   */
  endCombat() {
    const playersAlive = this.state.combat.turnOrder.filter(p =>
      this.state.players.find(pl => pl.id === p.id)
    );

    const victory = playersAlive.length > 0;

    // Award experience and loot
    const rewards = { experience: 0, gold: 0, items: [] };

    if (victory) {
      rewards.experience = this.state.combat.turn * 10;
      rewards.gold = Math.floor(Math.random() * 100) + 50;

      // Award to all living players
      for (const player of playersAlive) {
        this.gainExperience(player.id, rewards.experience);
        player.inventory.gold += rewards.gold;
      }
    }

    this.state.combat.active = false;

    return {
      success: true,
      victory,
      rewards
    };
  }

  /**
   * Add item to inventory
   */
  addItem(playerId, item) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return { success: false };

    if (player.inventory.items.length >= player.inventory.maxSlots) {
      return { success: false, error: 'Inventory full' };
    }

    player.inventory.items.push(item);

    return { success: true, item };
  }

  /**
   * Equip item
   */
  equipItem(playerId, itemId) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return { success: false };

    const item = player.inventory.items.find(i => i.id === itemId);
    if (!item) return { success: false, error: 'Item not found' };

    const slot = item.slot; // weapon, armor, helmet, etc.

    // Unequip current item
    if (player.equipment[slot]) {
      player.inventory.items.push(player.equipment[slot]);
    }

    // Equip new item
    player.equipment[slot] = item;
    player.inventory.items = player.inventory.items.filter(i => i.id !== itemId);

    // Apply stat bonuses
    if (item.stats) {
      for (const [stat, value] of Object.entries(item.stats)) {
        player.stats[stat] = (player.stats[stat] || 0) + value;
      }
    }

    return { success: true, equipped: item };
  }

  /**
   * Start quest
   */
  startQuest(playerId, questId) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return { success: false };

    const quest = this.getQuestDefinition(questId);
    if (!quest) return { success: false, error: 'Quest not found' };

    player.quests.active.push({
      ...quest,
      progress: {},
      startedAt: Date.now()
    });

    return { success: true, quest };
  }

  /**
   * Get quest definition
   */
  getQuestDefinition(questId) {
    // Example quest definitions
    const quests = {
      'quest_1': {
        id: 'quest_1',
        name: 'Defeat the Goblins',
        description: 'Defeat 10 goblins in the forest',
        objectives: [
          { type: 'KILL', target: 'GOBLIN', count: 10 }
        ],
        rewards: {
          experience: 500,
          gold: 200,
          items: []
        }
      }
    };

    return quests[questId];
  }

  /**
   * Get player state
   */
  getPlayerState(playerId) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return null;

    return {
      character: player,
      nearbyPlayers: this.state.players.filter(p =>
        p.id !== playerId &&
        Math.abs(p.position.x - player.position.x) < 10 &&
        Math.abs(p.position.y - player.position.y) < 10
      ),
      combat: this.state.combat.active ? {
        active: true,
        yourTurn: this.state.combat.turnOrder[this.state.combat.currentTurnIndex]?.id === playerId,
        participants: this.state.combat.turnOrder
      } : null
    };
  }
}

module.exports = RPGGameTemplate;
