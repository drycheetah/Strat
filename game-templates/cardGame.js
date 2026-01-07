/**
 * Card Game Template for STRAT Gaming Platform
 * A complete framework for creating card games (poker, blackjack, collectible card games, etc.)
 */

class CardGameTemplate {
  constructor(config = {}) {
    this.gameType = 'CARD';
    this.config = {
      deckSize: config.deckSize || 52,
      handSize: config.handSize || 5,
      minPlayers: config.minPlayers || 2,
      maxPlayers: config.maxPlayers || 8,
      turnTime: config.turnTime || 30000, // 30 seconds
      roundLimit: config.roundLimit || 10,
      ...config
    };

    this.state = {
      deck: [],
      discardPile: [],
      players: [],
      currentPlayerIndex: 0,
      round: 0,
      phase: 'WAITING', // WAITING, DEALING, PLAYING, ENDED
      pot: 0
    };
  }

  /**
   * Initialize the game
   * @param {Array} players - Array of player objects
   * @param {object} rng - RNG instance for shuffling
   */
  initialize(players, rng) {
    this.state.players = players.map(p => ({
      id: p.address,
      name: p.username || p.address,
      hand: [],
      score: 0,
      bet: 0,
      chips: p.chips || 1000,
      isActive: true,
      isFolded: false
    }));

    // Shuffle deck using provably fair RNG
    this.state.deck = this.createDeck();
    this.state.deck = this.shuffleDeck(this.state.deck, rng);

    this.state.phase = 'DEALING';
  }

  /**
   * Create a standard 52-card deck
   * @returns {Array} Deck of cards
   */
  createDeck() {
    const suits = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];

    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({
          suit,
          rank,
          value: this.getCardValue(rank),
          id: `${rank}_${suit}`
        });
      }
    }

    return deck;
  }

  /**
   * Get numeric value of card
   * @param {string} rank - Card rank
   * @returns {number} Value
   */
  getCardValue(rank) {
    if (rank === 'A') return 11;
    if (['K', 'Q', 'J'].includes(rank)) return 10;
    return parseInt(rank);
  }

  /**
   * Shuffle deck
   * @param {Array} deck - Deck to shuffle
   * @param {object} rng - RNG instance
   * @returns {Array} Shuffled deck
   */
  shuffleDeck(deck, rng) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Deal cards to players
   */
  dealCards() {
    const cardsPerPlayer = this.config.handSize;

    for (let i = 0; i < cardsPerPlayer; i++) {
      for (const player of this.state.players) {
        if (player.isActive && this.state.deck.length > 0) {
          player.hand.push(this.state.deck.pop());
        }
      }
    }

    this.state.phase = 'PLAYING';
  }

  /**
   * Play a card
   * @param {string} playerId - Player ID
   * @param {object} card - Card to play
   * @param {object} options - Play options
   * @returns {object} Result
   */
  playCard(playerId, card, options = {}) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (this.state.players[this.state.currentPlayerIndex].id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    const cardIndex = player.hand.findIndex(c => c.id === card.id);
    if (cardIndex === -1) {
      return { success: false, error: 'Card not in hand' };
    }

    // Remove card from hand
    const playedCard = player.hand.splice(cardIndex, 1)[0];
    this.state.discardPile.push(playedCard);

    // Advance to next player
    this.nextTurn();

    return {
      success: true,
      card: playedCard,
      nextPlayer: this.state.players[this.state.currentPlayerIndex].id
    };
  }

  /**
   * Draw a card
   * @param {string} playerId - Player ID
   * @returns {object} Result
   */
  drawCard(playerId) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player || this.state.deck.length === 0) {
      return { success: false, error: 'Cannot draw card' };
    }

    const card = this.state.deck.pop();
    player.hand.push(card);

    return {
      success: true,
      card
    };
  }

  /**
   * Place a bet
   * @param {string} playerId - Player ID
   * @param {number} amount - Bet amount
   * @returns {object} Result
   */
  placeBet(playerId, amount) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (player.chips < amount) {
      return { success: false, error: 'Insufficient chips' };
    }

    player.chips -= amount;
    player.bet += amount;
    this.state.pot += amount;

    return {
      success: true,
      bet: player.bet,
      pot: this.state.pot
    };
  }

  /**
   * Fold hand
   * @param {string} playerId - Player ID
   * @returns {object} Result
   */
  fold(playerId) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    player.isFolded = true;
    player.isActive = false;

    // Check if only one player remains
    const activePlayers = this.state.players.filter(p => p.isActive && !p.isFolded);
    if (activePlayers.length === 1) {
      this.endRound(activePlayers[0]);
    }

    return { success: true };
  }

  /**
   * Calculate hand score
   * @param {Array} hand - Player's hand
   * @returns {number} Score
   */
  calculateHandScore(hand) {
    // Basic scoring - override for specific game rules
    return hand.reduce((sum, card) => sum + card.value, 0);
  }

  /**
   * Evaluate poker hand
   * @param {Array} hand - 5 cards
   * @returns {object} Hand rank and value
   */
  evaluatePokerHand(hand) {
    const ranks = hand.map(c => c.rank);
    const suits = hand.map(c => c.suit);

    // Count rank occurrences
    const rankCounts = {};
    ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);
    const counts = Object.values(rankCounts).sort((a, b) => b - a);

    // Check flush
    const isFlush = suits.every(s => s === suits[0]);

    // Check straight
    const rankValues = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
      '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };
    const sortedValues = ranks.map(r => rankValues[r]).sort((a, b) => a - b);
    const isStraight = sortedValues.every((v, i, arr) =>
      i === 0 || v === arr[i - 1] + 1
    );

    // Determine hand
    if (isStraight && isFlush) {
      return { rank: 'STRAIGHT_FLUSH', value: 9, description: 'Straight Flush' };
    }
    if (counts[0] === 4) {
      return { rank: 'FOUR_OF_A_KIND', value: 8, description: 'Four of a Kind' };
    }
    if (counts[0] === 3 && counts[1] === 2) {
      return { rank: 'FULL_HOUSE', value: 7, description: 'Full House' };
    }
    if (isFlush) {
      return { rank: 'FLUSH', value: 6, description: 'Flush' };
    }
    if (isStraight) {
      return { rank: 'STRAIGHT', value: 5, description: 'Straight' };
    }
    if (counts[0] === 3) {
      return { rank: 'THREE_OF_A_KIND', value: 4, description: 'Three of a Kind' };
    }
    if (counts[0] === 2 && counts[1] === 2) {
      return { rank: 'TWO_PAIR', value: 3, description: 'Two Pair' };
    }
    if (counts[0] === 2) {
      return { rank: 'ONE_PAIR', value: 2, description: 'One Pair' };
    }

    return { rank: 'HIGH_CARD', value: 1, description: 'High Card' };
  }

  /**
   * Advance to next turn
   */
  nextTurn() {
    do {
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
    } while (!this.state.players[this.state.currentPlayerIndex].isActive);
  }

  /**
   * End current round
   * @param {object} winner - Winning player
   */
  endRound(winner) {
    if (winner) {
      winner.chips += this.state.pot;
      winner.score++;
    }

    this.state.round++;
    this.state.pot = 0;
    this.state.discardPile = [];

    // Reset players
    for (const player of this.state.players) {
      player.hand = [];
      player.bet = 0;
      player.isFolded = false;
      if (player.chips > 0) {
        player.isActive = true;
      }
    }

    // Check if game should end
    const activePlayers = this.state.players.filter(p => p.chips > 0);
    if (activePlayers.length <= 1 || this.state.round >= this.config.roundLimit) {
      this.endGame();
    } else {
      this.state.deck = this.createDeck();
      this.dealCards();
    }
  }

  /**
   * End game and calculate final results
   * @returns {object} Final results
   */
  endGame() {
    this.state.phase = 'ENDED';

    // Sort players by chips/score
    const results = this.state.players
      .sort((a, b) => b.chips - a.chips)
      .map((p, index) => ({
        rank: index + 1,
        playerId: p.id,
        name: p.name,
        score: p.score,
        chips: p.chips
      }));

    return {
      winner: results[0],
      results,
      totalRounds: this.state.round
    };
  }

  /**
   * Get game state for a specific player (hide opponent's cards)
   * @param {string} playerId - Player ID
   * @returns {object} Filtered state
   */
  getPlayerView(playerId) {
    return {
      round: this.state.round,
      phase: this.state.phase,
      pot: this.state.pot,
      currentPlayer: this.state.players[this.state.currentPlayerIndex].id,
      myHand: this.state.players.find(p => p.id === playerId)?.hand || [],
      players: this.state.players.map(p => ({
        id: p.id,
        name: p.name,
        cardCount: p.hand.length,
        chips: p.chips,
        bet: p.bet,
        isActive: p.isActive,
        isFolded: p.isFolded,
        isCurrentPlayer: this.state.players[this.state.currentPlayerIndex].id === p.id
      })),
      deckSize: this.state.deck.length,
      discardPileTop: this.state.discardPile[this.state.discardPile.length - 1] || null
    };
  }

  /**
   * Get full game state
   * @returns {object} Complete state
   */
  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }
}

module.exports = CardGameTemplate;
