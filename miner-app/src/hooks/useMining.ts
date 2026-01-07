import { useState, useEffect, useCallback, useRef } from 'react';
import type { MiningConfig, MiningStats, HistoryEntry } from '../types';

export const useMining = () => {
  const [isMining, setIsMining] = useState(false);
  const [stats, setStats] = useState<MiningStats>({
    hashrate: 0,
    shares: 0,
    accepted: 0,
    rejected: 0,
    uptime: 0,
    estimatedEarnings: 0,
  });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const workerRef = useRef<Worker | null>(null);

  const startMining = useCallback(async (config: MiningConfig) => {
    try {
      // Create mining worker
      workerRef.current = new Worker(
        new URL('../workers/mining.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Listen for stats updates
      workerRef.current.onmessage = (event) => {
        const { type, data } = event.data;

        if (type === 'stats') {
          const newStats = {
            ...data,
            estimatedEarnings: calculateEarnings(data),
          };
          setStats(newStats);

          // Add to history every minute
          const now = Date.now();
          setHistory(prev => {
            const lastEntry = prev[prev.length - 1];
            if (!lastEntry || now - lastEntry.timestamp > 60000) {
              return [...prev, {
                timestamp: now,
                ...newStats,
              }].slice(-1440); // Keep last 24 hours (1 entry per minute)
            }
            return prev;
          });
        } else if (type === 'started') {
          setIsMining(true);
        } else if (type === 'stopped') {
          setIsMining(false);
        }
      };

      // Start the worker
      workerRef.current.postMessage({
        type: 'start',
        data: config,
      });

      // If Electron API is available, use it
      if (window.electronAPI) {
        const result = await window.electronAPI.startMining(config);
        if (result.success) {
          console.log('Mining started via Electron');
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to start mining:', error);
      return { success: false, error };
    }
  }, []);

  const stopMining = useCallback(async () => {
    try {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'stop' });
        workerRef.current.terminate();
        workerRef.current = null;
      }

      if (window.electronAPI) {
        await window.electronAPI.stopMining();
      }

      setIsMining(false);
      return { success: true };
    } catch (error) {
      console.error('Failed to stop mining:', error);
      return { success: false, error };
    }
  }, []);

  const updateConfig = useCallback((config: Partial<MiningConfig>) => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'update-config',
        data: config,
      });
    }
  }, []);

  // Calculate estimated earnings based on hashrate and difficulty
  const calculateEarnings = (stats: any): number => {
    const blocksPerDay = (stats.hashrate / 1000000) * 86400; // Simplified calculation
    const rewardPerBlock = 50; // STRAT reward
    return blocksPerDay * rewardPerBlock;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  return {
    isMining,
    stats,
    history,
    startMining,
    stopMining,
    updateConfig,
  };
};
