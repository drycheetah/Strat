import { useEffect, useState, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';

interface UseAutoRefreshOptions<T> {
  fetchFn: () => Promise<{ data: T }>;
  interval?: number; // milliseconds
  wsEvents?: string[]; // WebSocket events that should trigger refresh
  enabled?: boolean;
}

export function useAutoRefresh<T>({
  fetchFn,
  interval = 10000, // default 10 seconds
  wsEvents = [],
  enabled = true,
}: UseAutoRefreshOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { on, off } = useWebSocket();

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    try {
      setLoading(true);
      const response = await fetchFn();
      setData(response.data);
      setError(null);
    } catch (err) {
      setError(err as Error);
      console.error('Auto-refresh fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Interval refresh
  useEffect(() => {
    if (!enabled || !interval) return;

    const intervalId = setInterval(fetchData, interval);
    return () => clearInterval(intervalId);
  }, [fetchData, interval, enabled]);

  // WebSocket event refresh
  useEffect(() => {
    if (!enabled || wsEvents.length === 0) return;

    wsEvents.forEach((event) => {
      on(event, () => {
        console.log(`WebSocket event '${event}' received, refreshing data`);
        fetchData();
      });
    });

    return () => {
      wsEvents.forEach((event) => off(event));
    };
  }, [wsEvents, fetchData, on, off, enabled]);

  return { data, loading, error, refresh: fetchData };
}
