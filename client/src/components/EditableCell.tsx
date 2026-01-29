import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Lock } from 'lucide-react';

interface EditableCellProps {
  value: unknown;
  superjoin_id: string;
  column: string;
  isProtected: boolean;
  isPending: boolean;
  onUpdate: (value: unknown) => Promise<boolean>;
  onFocusChange: (isFocused: boolean) => void;
}

const PROTECTED_COLUMNS = ['superjoin_id', 'createdAt', 'updatedAt'];

export function isProtectedColumn(column: string): boolean {
  return PROTECTED_COLUMNS.includes(column);
}

export function EditableCell({
  value,
  superjoin_id,
  column,
  isProtected,
  isPending,
  onUpdate,
  onFocusChange,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ''));
  const [originalValue] = useState(String(value ?? ''));
  const inputRef = useRef<HTMLInputElement>(null);

  // Update edit value when external value changes (from polling)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(String(value ?? ''));
    }
  }, [value, isEditing]);

  const handleDoubleClick = useCallback(() => {
    if (isProtected || isPending) return;
    setIsEditing(true);
    onFocusChange(true);
  }, [isProtected, isPending, onFocusChange]);

  const handleBlur = useCallback(async () => {
    setIsEditing(false);
    onFocusChange(false);
    
    if (editValue !== originalValue) {
      const success = await onUpdate(editValue);
      if (!success) {
        setEditValue(originalValue);
      }
    }
  }, [editValue, originalValue, onUpdate, onFocusChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setEditValue(originalValue);
      setIsEditing(false);
      onFocusChange(false);
    }
  }, [originalValue, onFocusChange]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Format display value
  const displayValue = (() => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return String(value);
  })();

  // Check if value looks like a timestamp
  const isTimestamp = column.toLowerCase().includes('at') || 
                      column.toLowerCase().includes('date') ||
                      column.toLowerCase().includes('time');
  
  const isId = column.toLowerCase().includes('id');

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full bg-cell-editing border border-primary/50 rounded px-2 py-1 text-sm
                   text-foreground outline-none focus:ring-1 focus:ring-primary
                   animate-fade-in"
      />
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={`
        relative flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer
        min-w-0 text-sm truncate transition-colors duration-150
        ${isProtected 
          ? 'bg-cell-protected/50 text-muted-foreground cursor-not-allowed' 
          : 'hover:bg-accent/50'
        }
        ${isId || isTimestamp ? 'font-mono text-xs' : ''}
        ${isPending ? 'opacity-60' : ''}
      `}
      title={isProtected ? 'This column is read-only' : 'Double-click to edit'}
    >
      {isPending && (
        <Loader2 className="w-3 h-3 animate-spin-slow flex-shrink-0 text-primary" />
      )}
      
      {isProtected && !isPending && (
        <Lock className="w-3 h-3 flex-shrink-0 text-muted-foreground/60" />
      )}
      
      <span className="truncate">{displayValue}</span>
    </div>
  );
}
