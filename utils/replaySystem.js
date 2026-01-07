const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Replay System for game recordings
 * Records, compresses, and plays back game sessions
 */
class ReplaySystem {
  constructor() {
    this.recordings = new Map(); // sessionId -> recording data
    this.activeRecordings = new Map(); // sessionId -> active recording
  }

  /**
   * Start recording a game session
   * @param {string} sessionId - Session ID
   * @param {object} metadata - Session metadata
   * @returns {object} Recording info
   */
  startRecording(sessionId, metadata = {}) {
    const recording = {
      replayId: this.generateReplayId(),
      sessionId,
      metadata: {
        ...metadata,
        startTime: Date.now(),
        version: '1.0.0'
      },
      events: [],
      frames: [],
      startTime: Date.now(),
      lastEventTime: Date.now(),
      isRecording: true,
      frameRate: metadata.frameRate || 30,
      compression: metadata.compression !== false
    };

    this.activeRecordings.set(sessionId, recording);

    return {
      replayId: recording.replayId,
      sessionId,
      startTime: recording.startTime
    };
  }

  /**
   * Record an event
   * @param {string} sessionId - Session ID
   * @param {string} eventType - Event type
   * @param {object} data - Event data
   * @returns {boolean} Success
   */
  recordEvent(sessionId, eventType, data) {
    const recording = this.activeRecordings.get(sessionId);
    if (!recording || !recording.isRecording) return false;

    const timestamp = Date.now();
    const deltaTime = timestamp - recording.lastEventTime;

    const event = {
      type: eventType,
      data,
      timestamp,
      deltaTime,
      frame: recording.frames.length
    };

    recording.events.push(event);
    recording.lastEventTime = timestamp;

    return true;
  }

  /**
   * Record a frame snapshot
   * @param {string} sessionId - Session ID
   * @param {object} state - Game state
   * @returns {boolean} Success
   */
  recordFrame(sessionId, state) {
    const recording = this.activeRecordings.get(sessionId);
    if (!recording || !recording.isRecording) return false;

    const timestamp = Date.now();

    const frame = {
      index: recording.frames.length,
      timestamp,
      deltaTime: recording.frames.length > 0
        ? timestamp - recording.frames[recording.frames.length - 1].timestamp
        : 0,
      state: this.compressState(state),
      eventCount: recording.events.filter(e => e.frame === recording.frames.length).length
    };

    recording.frames.push(frame);

    return true;
  }

  /**
   * Record player action
   * @param {string} sessionId - Session ID
   * @param {string} playerId - Player ID
   * @param {string} action - Action type
   * @param {object} data - Action data
   */
  recordAction(sessionId, playerId, action, data) {
    return this.recordEvent(sessionId, 'PLAYER_ACTION', {
      playerId,
      action,
      ...data
    });
  }

  /**
   * Stop recording
   * @param {string} sessionId - Session ID
   * @param {object} finalStats - Final session statistics
   * @returns {object} Recording summary
   */
  async stopRecording(sessionId, finalStats = {}) {
    const recording = this.activeRecordings.get(sessionId);
    if (!recording) return null;

    recording.isRecording = false;
    recording.endTime = Date.now();
    recording.duration = recording.endTime - recording.startTime;

    // Add final statistics
    recording.metadata.endTime = recording.endTime;
    recording.metadata.duration = recording.duration;
    recording.metadata.eventCount = recording.events.length;
    recording.metadata.frameCount = recording.frames.length;
    recording.metadata.averageFrameTime = recording.duration / recording.frames.length;
    recording.metadata.stats = finalStats;

    // Compress recording
    if (recording.compression) {
      recording.compressed = await this.compressRecording(recording);
      recording.compressedSize = Buffer.byteLength(recording.compressed);
      recording.originalSize = this.calculateSize(recording);
      recording.compressionRatio = recording.compressedSize / recording.originalSize;
    }

    // Move to completed recordings
    this.recordings.set(recording.replayId, recording);
    this.activeRecordings.delete(sessionId);

    return {
      replayId: recording.replayId,
      duration: recording.duration,
      eventCount: recording.events.length,
      frameCount: recording.frames.length,
      size: recording.compressed ? recording.compressedSize : recording.originalSize,
      compressionRatio: recording.compressionRatio
    };
  }

  /**
   * Get replay data
   * @param {string} replayId - Replay ID
   * @param {boolean} decompress - Decompress if compressed
   * @returns {object} Replay data
   */
  async getReplay(replayId, decompress = true) {
    const recording = this.recordings.get(replayId);
    if (!recording) return null;

    if (recording.compressed && decompress) {
      const decompressed = await this.decompressRecording(recording.compressed);
      return decompressed;
    }

    return {
      replayId: recording.replayId,
      metadata: recording.metadata,
      events: recording.events,
      frames: recording.frames
    };
  }

  /**
   * Play replay with callback for each event
   * @param {string} replayId - Replay ID
   * @param {function} eventCallback - Called for each event
   * @param {object} options - Playback options
   * @returns {object} Playback controller
   */
  async playReplay(replayId, eventCallback, options = {}) {
    const replay = await this.getReplay(replayId);
    if (!replay) throw new Error('Replay not found');

    const playback = {
      replayId,
      playing: false,
      paused: false,
      currentEventIndex: 0,
      currentTime: 0,
      speed: options.speed || 1.0,
      startTime: null,
      pauseTime: null
    };

    const playEvent = async (index) => {
      if (!playback.playing || playback.paused) return;
      if (index >= replay.events.length) {
        playback.playing = false;
        if (options.onComplete) options.onComplete();
        return;
      }

      const event = replay.events[index];
      playback.currentEventIndex = index;
      playback.currentTime = event.timestamp - replay.metadata.startTime;

      // Call event callback
      await eventCallback(event);

      // Calculate delay until next event
      const nextEvent = replay.events[index + 1];
      if (nextEvent) {
        const delay = (nextEvent.deltaTime / playback.speed) || 0;
        setTimeout(() => playEvent(index + 1), delay);
      } else {
        playback.playing = false;
        if (options.onComplete) options.onComplete();
      }
    };

    // Playback controls
    return {
      play: () => {
        if (!playback.playing) {
          playback.playing = true;
          playback.paused = false;
          playback.startTime = Date.now();
          playEvent(playback.currentEventIndex);
        } else if (playback.paused) {
          playback.paused = false;
          playEvent(playback.currentEventIndex);
        }
      },
      pause: () => {
        playback.paused = true;
        playback.pauseTime = Date.now();
      },
      stop: () => {
        playback.playing = false;
        playback.paused = false;
        playback.currentEventIndex = 0;
        playback.currentTime = 0;
      },
      seek: (time) => {
        // Find event closest to target time
        const targetIndex = replay.events.findIndex(
          e => (e.timestamp - replay.metadata.startTime) >= time
        );
        if (targetIndex !== -1) {
          playback.currentEventIndex = targetIndex;
          playback.currentTime = time;
        }
      },
      setSpeed: (speed) => {
        playback.speed = Math.max(0.1, Math.min(speed, 5.0));
      },
      getStatus: () => ({
        playing: playback.playing,
        paused: playback.paused,
        currentTime: playback.currentTime,
        duration: replay.metadata.duration,
        progress: playback.currentTime / replay.metadata.duration,
        speed: playback.speed
      })
    };
  }

  /**
   * Get replay metadata
   * @param {string} replayId - Replay ID
   * @returns {object} Metadata
   */
  getReplayMetadata(replayId) {
    const recording = this.recordings.get(replayId);
    if (!recording) return null;

    return {
      replayId: recording.replayId,
      sessionId: recording.sessionId,
      metadata: recording.metadata,
      size: recording.compressed ? recording.compressedSize : this.calculateSize(recording),
      compressed: !!recording.compressed
    };
  }

  /**
   * Export replay to file format
   * @param {string} replayId - Replay ID
   * @param {string} format - Export format (json, binary)
   * @returns {Buffer} Exported data
   */
  async exportReplay(replayId, format = 'json') {
    const replay = await this.getReplay(replayId);
    if (!replay) return null;

    if (format === 'json') {
      return Buffer.from(JSON.stringify(replay, null, 2));
    } else if (format === 'binary') {
      // Compress as binary
      const json = JSON.stringify(replay);
      return await gzip(Buffer.from(json));
    }

    return null;
  }

  /**
   * Import replay from file
   * @param {Buffer} data - Replay data
   * @param {string} format - Format (json, binary)
   * @returns {string} Replay ID
   */
  async importReplay(data, format = 'json') {
    let replay;

    if (format === 'json') {
      replay = JSON.parse(data.toString());
    } else if (format === 'binary') {
      const decompressed = await gunzip(data);
      replay = JSON.parse(decompressed.toString());
    } else {
      throw new Error('Unsupported format');
    }

    const replayId = replay.replayId || this.generateReplayId();
    replay.replayId = replayId;

    this.recordings.set(replayId, {
      replayId,
      metadata: replay.metadata,
      events: replay.events,
      frames: replay.frames,
      isRecording: false
    });

    return replayId;
  }

  /**
   * Generate highlights from replay
   * @param {string} replayId - Replay ID
   * @param {object} criteria - Highlight criteria
   * @returns {Array} Highlight moments
   */
  async generateHighlights(replayId, criteria = {}) {
    const replay = await this.getReplay(replayId);
    if (!replay) return [];

    const highlights = [];

    // Find important events
    for (let i = 0; i < replay.events.length; i++) {
      const event = replay.events[i];

      // Check if event matches highlight criteria
      if (this.isHighlightEvent(event, criteria)) {
        highlights.push({
          timestamp: event.timestamp - replay.metadata.startTime,
          eventIndex: i,
          type: event.type,
          description: this.getHighlightDescription(event),
          duration: criteria.highlightDuration || 10000, // 10 seconds default
          startTime: Math.max(0, (event.timestamp - replay.metadata.startTime) - 5000),
          endTime: (event.timestamp - replay.metadata.startTime) + 5000
        });
      }
    }

    return highlights;
  }

  /**
   * Check if event qualifies as highlight
   * @param {object} event - Event
   * @param {object} criteria - Criteria
   * @returns {boolean} Is highlight
   */
  isHighlightEvent(event, criteria) {
    const highlightTypes = criteria.types || [
      'PLAYER_ELIMINATED',
      'MATCH_WON',
      'ACHIEVEMENT_UNLOCKED',
      'EPIC_MOMENT',
      'COMEBACK',
      'MULTIKILL'
    ];

    return highlightTypes.includes(event.type) ||
      (event.data && event.data.isHighlight);
  }

  /**
   * Get highlight description
   * @param {object} event - Event
   * @returns {string} Description
   */
  getHighlightDescription(event) {
    const descriptions = {
      'PLAYER_ELIMINATED': 'Player Elimination',
      'MATCH_WON': 'Victory!',
      'ACHIEVEMENT_UNLOCKED': 'Achievement Unlocked',
      'EPIC_MOMENT': 'Epic Moment',
      'COMEBACK': 'Amazing Comeback',
      'MULTIKILL': 'Multikill!'
    };

    return descriptions[event.type] || event.type;
  }

  /**
   * Compress game state
   * @param {object} state - State object
   * @returns {object} Compressed state
   */
  compressState(state) {
    // Only store changed values from previous state
    // For demo, just return state (implement delta compression in production)
    return state;
  }

  /**
   * Compress recording
   * @param {object} recording - Recording data
   * @returns {string} Compressed data
   */
  async compressRecording(recording) {
    const data = {
      replayId: recording.replayId,
      metadata: recording.metadata,
      events: recording.events,
      frames: recording.frames
    };

    const json = JSON.stringify(data);
    const compressed = await gzip(Buffer.from(json));
    return compressed.toString('base64');
  }

  /**
   * Decompress recording
   * @param {string} compressed - Compressed data
   * @returns {object} Decompressed recording
   */
  async decompressRecording(compressed) {
    const buffer = Buffer.from(compressed, 'base64');
    const decompressed = await gunzip(buffer);
    return JSON.parse(decompressed.toString());
  }

  /**
   * Calculate recording size
   * @param {object} recording - Recording
   * @returns {number} Size in bytes
   */
  calculateSize(recording) {
    const json = JSON.stringify({
      events: recording.events,
      frames: recording.frames
    });
    return Buffer.byteLength(json);
  }

  /**
   * Generate replay ID
   * @returns {string} Replay ID
   */
  generateReplayId() {
    return `replay_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Delete replay
   * @param {string} replayId - Replay ID
   * @returns {boolean} Success
   */
  deleteReplay(replayId) {
    return this.recordings.delete(replayId);
  }

  /**
   * List all replays
   * @returns {Array} Replay list
   */
  listReplays() {
    const replays = [];

    for (const [replayId, recording] of this.recordings) {
      replays.push({
        replayId,
        sessionId: recording.sessionId,
        duration: recording.metadata.duration,
        eventCount: recording.metadata.eventCount,
        frameCount: recording.metadata.frameCount,
        size: recording.compressed ? recording.compressedSize : this.calculateSize(recording),
        createdAt: recording.metadata.startTime
      });
    }

    return replays.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get statistics
   * @returns {object} Statistics
   */
  getStats() {
    return {
      totalReplays: this.recordings.size,
      activeRecordings: this.activeRecordings.size,
      totalSize: Array.from(this.recordings.values()).reduce((sum, r) =>
        sum + (r.compressed ? r.compressedSize : this.calculateSize(r)), 0
      )
    };
  }
}

module.exports = ReplaySystem;
