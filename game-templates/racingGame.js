/**
 * Racing Game Template for STRAT Gaming Platform
 * Framework for creating racing games with vehicles, tracks, and physics
 */

class RacingGameTemplate {
  constructor(config = {}) {
    this.gameType = 'RACING';
    this.config = {
      maxPlayers: config.maxPlayers || 8,
      lapCount: config.lapCount || 3,
      trackLength: config.trackLength || 1000,
      countdownTime: config.countdownTime || 3000,
      ...config
    };

    this.state = {
      racers: [],
      race: {
        status: 'WAITING', // WAITING, COUNTDOWN, RACING, FINISHED
        startTime: null,
        countdown: 3,
        currentLap: 1
      },
      track: {
        name: config.trackName || 'Default Track',
        length: this.config.trackLength,
        checkpoints: this.generateCheckpoints()
      }
    };
  }

  /**
   * Add racer to game
   */
  addRacer(playerData) {
    const racer = {
      id: playerData.address,
      name: playerData.username,
      vehicle: playerData.vehicle || {
        type: 'SPORTS_CAR',
        speed: 100,
        acceleration: 10,
        handling: 80,
        boost: 3
      },
      position: this.state.racers.length + 1,
      distance: 0,
      lap: 1,
      speed: 0,
      boosts: 3,
      checkpoints: [],
      finishTime: null,
      status: 'READY'
    };

    this.state.racers.push(racer);
    return racer;
  }

  /**
   * Generate track checkpoints
   */
  generateCheckpoints() {
    const checkpoints = [];
    const spacing = this.config.trackLength / 5;

    for (let i = 1; i <= 5; i++) {
      checkpoints.push({
        id: i,
        position: spacing * i,
        name: `Checkpoint ${i}`
      });
    }

    return checkpoints;
  }

  /**
   * Start race countdown
   */
  startCountdown() {
    this.state.race.status = 'COUNTDOWN';

    setTimeout(() => {
      this.state.race.countdown = 2;
    }, 1000);

    setTimeout(() => {
      this.state.race.countdown = 1;
    }, 2000);

    setTimeout(() => {
      this.startRace();
    }, 3000);

    return { success: true, countdown: 3 };
  }

  /**
   * Start race
   */
  startRace() {
    this.state.race.status = 'RACING';
    this.state.race.startTime = Date.now();

    return { success: true, startTime: this.state.race.startTime };
  }

  /**
   * Update racer position
   */
  updateRacer(racerId, input) {
    const racer = this.state.racers.find(r => r.id === racerId);
    if (!racer || this.state.race.status !== 'RACING') {
      return { success: false };
    }

    // Apply acceleration
    if (input.accelerate && racer.speed < racer.vehicle.speed) {
      racer.speed += racer.vehicle.acceleration / 10;
    }

    // Apply braking
    if (input.brake && racer.speed > 0) {
      racer.speed -= racer.vehicle.acceleration / 5;
    }

    // Apply boost
    if (input.boost && racer.boosts > 0) {
      racer.speed += 20;
      racer.boosts--;
      setTimeout(() => { racer.speed -= 20; }, 2000);
    }

    // Update distance
    racer.distance += racer.speed / 60; // Assuming 60 FPS

    // Check checkpoints
    for (const checkpoint of this.state.track.checkpoints) {
      if (!racer.checkpoints.includes(checkpoint.id) &&
          racer.distance >= checkpoint.position + (racer.lap - 1) * this.config.trackLength) {
        racer.checkpoints.push(checkpoint.id);
      }
    }

    // Check lap completion
    if (racer.distance >= racer.lap * this.config.trackLength) {
      racer.lap++;
      racer.checkpoints = [];

      // Check race completion
      if (racer.lap > this.config.lapCount) {
        racer.finishTime = Date.now() - this.state.race.startTime;
        racer.status = 'FINISHED';
        this.updatePositions();

        // Check if all racers finished
        if (this.state.racers.every(r => r.status === 'FINISHED')) {
          this.endRace();
        }
      }
    }

    this.updatePositions();

    return {
      success: true,
      distance: racer.distance,
      lap: racer.lap,
      position: racer.position,
      speed: racer.speed
    };
  }

  /**
   * Update racer positions/rankings
   */
  updatePositions() {
    // Sort by lap then distance
    const sorted = [...this.state.racers].sort((a, b) => {
      if (a.lap !== b.lap) return b.lap - a.lap;
      return b.distance - a.distance;
    });

    sorted.forEach((racer, index) => {
      const r = this.state.racers.find(x => x.id === racer.id);
      r.position = index + 1;
    });
  }

  /**
   * Use power-up
   */
  usePowerUp(racerId, powerUpType) {
    const racer = this.state.racers.find(r => r.id === racerId);
    if (!racer) return { success: false };

    switch (powerUpType) {
      case 'SPEED_BOOST':
        racer.speed += 30;
        setTimeout(() => { racer.speed -= 30; }, 3000);
        break;

      case 'SHIELD':
        racer.shielded = true;
        setTimeout(() => { racer.shielded = false; }, 5000);
        break;

      case 'MISSILE':
        const target = this.state.racers.find(r => r.position === racer.position - 1);
        if (target && !target.shielded) {
          target.speed = Math.max(0, target.speed - 20);
        }
        break;
    }

    return { success: true };
  }

  /**
   * End race
   */
  endRace() {
    this.state.race.status = 'FINISHED';

    const results = [...this.state.racers]
      .sort((a, b) => (a.finishTime || Infinity) - (b.finishTime || Infinity))
      .map((r, index) => ({
        position: index + 1,
        racerId: r.id,
        name: r.name,
        finishTime: r.finishTime,
        laps: r.lap - 1
      }));

    return {
      success: true,
      results,
      winner: results[0]
    };
  }

  /**
   * Get race state for player
   */
  getPlayerView(racerId) {
    const racer = this.state.racers.find(r => r.id === racerId);

    return {
      race: {
        status: this.state.race.status,
        countdown: this.state.race.countdown,
        currentLap: this.state.race.currentLap,
        lapCount: this.config.lapCount
      },
      myRacer: racer,
      leaderboard: this.state.racers
        .sort((a, b) => a.position - b.position)
        .map(r => ({
          position: r.position,
          name: r.name,
          lap: r.lap,
          distance: r.distance
        })),
      track: this.state.track
    };
  }
}

module.exports = RacingGameTemplate;
