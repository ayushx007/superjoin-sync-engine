import { useCallback, useRef, useState, useEffect } from 'react';
import { Database, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { DataTable } from './DataTable';
import { EmptyState } from './EmptyState';
import { useSyncData } from '@/hooks/useSyncData';
import { useUpdateCell } from '@/hooks/useUpdateCell';

export function SyncDashboard() {
  const {
    data,
    columns,
    isLoading,
    error,
    isConnected,
    lastFetchTime,
    refetch,
    pausePolling,
    resumePolling,
  } = useSyncData();

  const { updateCell, isPending } = useUpdateCell();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const focusCountRef = useRef(0);

  const handleCellUpdate = useCallback(async (superjoin_id: string, column: string, value: unknown) => {
    return updateCell({ superjoin_id, column, value });
  }, [updateCell]);

  const handleCellFocusChange = useCallback((isFocused: boolean) => {
    if (isFocused) {
      focusCountRef.current += 1;
      pausePolling();
    } else {
      focusCountRef.current = Math.max(0, focusCountRef.current - 1);
      if (focusCountRef.current === 0) {
        resumePolling();
      }
    }
  }, [pausePolling, resumePolling]);

  const API_URL = "https://superjoin-sync-engine.onrender.com";

  const handleDeleteRow = useCallback(async (superjoin_id: string) => {
  try {
    // 1. Call the Backend API
    // Ensure your API_URL points to your Render/Local backend
    const response = await fetch(`${API_URL}/api/sync/rows/${superjoin_id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete row');
    }

    // 2. Refresh the UI
    // If you are using a simple fetch/useEffect, you can use window.location.reload()
    // If you are using a state-based hook, call the refresh function:
    // refreshData(); 
    
    console.log(`✅ Row ${superjoin_id} deleted from DB.`);
    
    // Optional: Provide immediate feedback
    // toast.success("Row deleted. Syncing with Google Sheets...");

  } catch (error) {
    console.error("❌ Delete Error:", error);
    alert("Failed to delete row. Please try again.");
  }
}, []);

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container max-w-full px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Database className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  Superjoin Sync Monitor
                </h1>
                <p className="text-xs text-muted-foreground">
                  Live Data Synchronization Dashboard
                </p>
              </div>
            </div>

            {/* Status & Actions */}
            <div className="flex items-center gap-4">
              <StatusBadge isConnected={isConnected} lastFetchTime={lastFetchTime} />
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh Now
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-full px-6 py-6">
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 rounded-lg border border-status-error/30 bg-status-error/5 flex items-start gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-status-error flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-status-error">Connection Error</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 animate-fade-in">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-secondary animate-spin border-t-primary" />
            </div>
            <p className="mt-6 text-sm text-muted-foreground">Connecting to sync engine...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && data.length === 0 && !error && (
          <EmptyState />
        )}

        {/* Data Table */}
        {data.length > 0 && (
          <div className="animate-fade-in">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-mono text-foreground">{data.length}</span> records 
                <span className="mx-1.5">·</span>
                <span className="font-mono text-foreground">{columns.length}</span> columns
              </p>
              <p className="text-xs text-muted-foreground">
                Double-click any cell to edit
              </p>
            </div>
            
            <DataTable
              data={data}
              columns={columns}
              onCellUpdate={handleCellUpdate}
              isPending={isPending}
              onCellFocusChange={handleCellFocusChange}
              onRowDelete={handleDeleteRow}
            />
          </div>
        )}
      </main>
    </div>
  );
}
