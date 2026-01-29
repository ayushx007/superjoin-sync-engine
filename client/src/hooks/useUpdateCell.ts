import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface UpdateCellParams {
  superjoin_id: string;
  column: string;
  value: unknown;
}

interface UseUpdateCellReturn {
  updateCell: (params: UpdateCellParams) => Promise<boolean>;
  pendingUpdates: Set<string>;
  isPending: (superjoin_id: string, column: string) => boolean;
}

const API_URL = 'https://superjoin-sync-engine.onrender.com/api/sync/update';

export function useUpdateCell(): UseUpdateCellReturn {
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());

  const getCellKey = (superjoin_id: string, column: string) => 
    `${superjoin_id}:${column}`;

  const isPending = useCallback((superjoin_id: string, column: string) => {
    return pendingUpdates.has(getCellKey(superjoin_id, column));
  }, [pendingUpdates]);

  const updateCell = useCallback(async ({ superjoin_id, column, value }: UpdateCellParams): Promise<boolean> => {
    const cellKey = getCellKey(superjoin_id, column);
    
    // Mark as pending
    setPendingUpdates(prev => new Set(prev).add(cellKey));
    
    try {
      const response = await fetch(API_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          superjoin_id,
          column,
          value,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      toast.success('Cell updated successfully', {
        description: `${column} → ${String(value).substring(0, 30)}${String(value).length > 30 ? '...' : ''}`,
        duration: 2000,
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update cell';
      
      toast.error('Update failed', {
        description: message,
        duration: 4000,
      });

      return false;
    } finally {
      // Remove from pending
      setPendingUpdates(prev => {
        const next = new Set(prev);
        next.delete(cellKey);
        return next;
      });
    }
  }, []);

  return {
    updateCell,
    pendingUpdates,
    isPending,
  };
}
