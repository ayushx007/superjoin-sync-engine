import { useState, useEffect, useCallback, useRef } from 'react';

export interface SyncRecord {
  superjoin_id: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

interface UseSyncDataReturn {
  data: SyncRecord[];
  columns: string[];
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
  lastFetchTime: Date | null;
  refetch: () => Promise<void>;
  isPollingPaused: boolean;
  pausePolling: () => void;
  resumePolling: () => void;
}

const API_URL = 'https://superjoin-sync-engine.onrender.com/api/sync/data';
const POLLING_INTERVAL = 2000;

export function useSyncData(): UseSyncDataReturn {
  const [data, setData] = useState<SyncRecord[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [isPollingPaused, setIsPollingPaused] = useState(false);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const isPausedRef = useRef(isPollingPaused);

  // Keep ref in sync with state
  useEffect(() => {
    isPausedRef.current = isPollingPaused;
  }, [isPollingPaused]);

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    
    try {
      const response = await fetch(API_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Handle both array and object responses
      const records: SyncRecord[] = Array.isArray(result) ? result : result.data || [];
      
      // Derive columns from first record
      if (records.length > 0) {
        const firstRecord = records[0];
        const cols = Object.keys(firstRecord);
        setColumns(cols);
      }
      
      setData(records);
      setIsConnected(true);
      setError(null);
      setLastFetchTime(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(message);
      setIsConnected(false);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  const pausePolling = useCallback(() => {
    setIsPollingPaused(true);
  }, []);

  const resumePolling = useCallback(() => {
    setIsPollingPaused(false);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Polling with focus lock
  useEffect(() => {
    pollingRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        fetchData(false);
      }
    }, POLLING_INTERVAL);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchData]);

  return {
    data,
    columns,
    isLoading,
    error,
    isConnected,
    lastFetchTime,
    refetch,
    isPollingPaused,
    pausePolling,
    resumePolling,
  };
}
