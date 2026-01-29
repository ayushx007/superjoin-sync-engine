import { Wifi, WifiOff } from 'lucide-react';

interface StatusBadgeProps {
  isConnected: boolean;
  lastFetchTime: Date | null;
}

export function StatusBadge({ isConnected, lastFetchTime }: StatusBadgeProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="flex items-center gap-3">
      <div
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
          transition-all duration-300
          ${isConnected 
            ? 'bg-status-connected/10 text-status-connected border border-status-connected/20' 
            : 'bg-status-error/10 text-status-error border border-status-error/20'
          }
        `}
      >
        <div className="relative">
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4" />
              <div className="absolute inset-0 animate-pulse-glow rounded-full" />
            </>
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
        </div>
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
      
      {lastFetchTime && (
        <span className="text-xs text-muted-foreground font-mono">
          Last sync: {formatTime(lastFetchTime)}
        </span>
      )}
    </div>
  );
}
