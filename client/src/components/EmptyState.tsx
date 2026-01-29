import { Database, Inbox } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 animate-fade-in">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-secondary/50 flex items-center justify-center">
          <Inbox className="w-10 h-10 text-muted-foreground/60" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Database className="w-4 h-4 text-primary" />
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-foreground mb-2">
        No Data Found
      </h3>
      
      <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed">
        The database is empty or no table has been created yet. 
        Add some data to your Google Sheet to see it sync here automatically.
      </p>
      
      <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-1.5 h-1.5 rounded-full bg-status-connected animate-pulse" />
        <span>Auto-polling every 2 seconds</span>
      </div>
    </div>
  );
}
