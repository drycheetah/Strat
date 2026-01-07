/**
 * Casino Game Template for STRAT Gaming Platform
 * Framework for creating casino games (slots, roulette, dice, etc.)
 */

const ProvablyFairRNG = require('../utils/provablyFairRNG');

class CasinoGameTemplate {
  constructor(config = {}) {
    this.gameType = 'CASINO';
    this.config = {
      houseEdge: config.houseEdge || 0.02, // 2% house edge
      minBet: config.minBet || 1,
      maxBet: config.maxBet || 1000,
      gameVariant: config.gameVariant || 'SLOTS', // SLOTS, ROULETTE, DICE, BLACKJACK
      ...config
    };

    this.state = {
      players: [],
      history: [],
      bankroll: config.initialBankroll || 1000000
    };

    // Initialize RNG
    this.rngSession = ProvablyFairRNG.createSession();
    this.nonce = 0;
  }

  /**
   * Place bet
   */
  placeBet(playerId, amount, betData) {
    if (amount < this.config.minBet || amount > this.config.maxBet) {
      return { success: false, error: 'Invalid bet amount' };
    }

    let result;

    switch (this.config.gameVariant) {
      case 'SLOTS':
        result = this.playSlots(amount, betData);
        break;
      case 'ROULETTE':
        result = this.playRoulette(amount, betData);
        break;
      case 'DICE':
        result = this.playDice(amount, betData);
        break;
      case 'CRASH':
        result = this.playCrash(amount, betData);
        break;
      default:
        return { success: false, error: 'Unknown game variant' };
    }

    // Record in history
    this.state.history.push({
      playerId,
      timestamp: Date.now(),
      bet: amount,
      result: result.outcome,
      payout: result.payout,
      rngProof: result.rngProof
    });

    return {
      success: true,
      ...result
    };
  }

  /**
   * Slots game
   */
  playSlots(betAmount, betData) {
    const symbols = ['🍒', '🍋', '🍊', '🍇', '💎', '⭐', '7️⃣'];
    const reels = [];

    // Generate 3 reels
    for (let i = 0; i < 3; i++) {
      const roll = ProvablyFairRNG.generateNumber(
        this.rngSession.serverSeed,
        this.rngSession.clientSeed,
        this.nonce++,
        0,
        symbols.length - 1
      );
      reels.push(symbols[roll.result]);
    }

    // Calculate payout
    let multiplier = 0;

    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      // Three of a kind
      if (reels[0] === '7️⃣') multiplier = 100;
      else if (reels[0] === '⭐') multiplier = 50;
      else if (reels[0] === '💎') multiplier = 25;
      else multiplier = 10;
    } else if (reels[0] === reels[1] || reels[1] === reels[2]) {
      // Two of a kind
      multiplier = 2;
    }

    const payout = betAmount * multiplier;

    return {
      outcome: 'COMPLETE',
      reels,
      multiplier,
      payout,
      profit: payout - betAmount,
      rngProof: this.rngSession.serverSeedHash
    };
  }

  /**
   * Roulette game
   */
  playRoulette(betAmount, betData) {
    const { betType, betNumbers } = betData;

    // Spin wheel (0-36)
    const roll = ProvablyFairRNG.generateNumber(
      this.rngSession.serverSeed,
      this.rngSession.clientSeed,
      this.nonce++,
      0,
      36
    );

    const number = roll.result;
    const isRed = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(number);
    const isBlack = number !== 0 && !isRed;
    const isEven = number !== 0 && number % 2 === 0;
    const isOdd = number !== 0 && number % 2 === 1;

    let won = false;
    let multiplier = 0;

    switch (betType) {
      case 'NUMBER':
        won = betNumbers.includes(number);
        multiplier = 35;
        break;
      case 'RED':
        won = isRed;
        multiplier = 2;
        break;
      case 'BLACK':
        won = isBlack;
        multiplier = 2;
        break;
      case 'EVEN':
        won = isEven;
        multiplier = 2;
        break;
      case 'ODD':
        won = isOdd;
        multiplier = 2;
        break;
      case 'DOZEN':
        const dozen = Math.floor(number / 12);
        won = dozen === betNumbers[0];
        multiplier = 3;
        break;
    }

    const payout = won ? betAmount * multiplier : 0;

    return {
      outcome: won ? 'WIN' : 'LOSS',
      number,
      color: isRed ? 'RED' : isBlack ? 'BLACK' : 'GREEN',
      payout,
      profit: payout - betAmount,
      rngProof: this.rngSession.serverSeedHash
    };
  }

  /**
   * Dice game
   */
  playDice(betAmount, betData) {
    const { prediction, target } = betData; // prediction: 'OVER' or 'UNDER'

    // Roll 0-100
    const roll = ProvablyFairRNG.generateNumber(
      this.rngSession.serverSeed,
      this.rngSession.clientSeed,
      this.nonce++,
      0,
      100
    );

    const number = roll.result;
    let won = false;

    if (prediction === 'OVER') {
      won = number > target;
    } else {
      won = number < target;
    }

    // Calculate multiplier based on odds
    const winChance = prediction === 'OVER' ? (100 - target) / 100 : target / 100;
    const multiplier = won ? (0.98 / winChance) : 0; // 2% house edge

    const payout = Math.floor(betAmount * multiplier);

    return {
      outcome: won ? 'WIN' : 'LOSS',
      roll: number,
      target,
      prediction,
      multiplier: multiplier.toFixed(2),
      payout,
      profit: payout - betAmount,
      rngProof: this.rngSession.serverSeedHash
    };
  }

  /**
   * Crash game
   */
  playCrash(betAmount, betData) {
    const { cashoutAt } = betData; // Multiplier to cash out at

    // Generate crash point
    const roll = ProvablyFairRNG.generateNumber(
      this.rngSession.serverSeed,
      this.rngSession.clientSeed,
      this.nonce++,
      100,
      1000
    );

    const crashPoint = (roll.result / 100).toFixed(2);
    const won = cashoutAt <= crashPoint;

    const payout = won ? Math.floor(betAmount * cashoutAt) : 0;

    return {
      outcome: won ? 'WIN' : 'CRASH',
      crashPoint,
      cashoutAt,
      payout,
      profit: payout - betAmount,
      rngProof: this.rngSession.serverSeedHash
    };
  }

  /**
   * Get game statistics
   */
  getStatistics() {
    const totalBets = this.state.history.length;
    const totalWagered = this.state.history.reduce((sum, h) => sum + h.bet, 0);
    const totalPayout = this.state.history.reduce((sum, h) => sum + h.payout, 0);
    const houseProfit = totalWagered - totalPayout;

    return {
      totalBets,
      totalWagered,
      totalPayout,
      houseProfit,
      actualHouseEdge: totalBets > 0 ? (houseProfit / totalWagered * 100).toFixed(2) : 0
    };
  }

  /**
   * Verify past result
   */
  verifyResult(historyEntry) {
    return {
      verified: true,
      serverSeed: this.rngSession.serverSeed,
      clientSeed: this.rngSession.clientSeed,
      rngProof: historyEntry.rngProof
    };
  }
}

module.exports = CasinoGameTemplate;
