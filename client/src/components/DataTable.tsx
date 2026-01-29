import { useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { EditableCell, isProtectedColumn } from './EditableCell';
import { SyncRecord } from '@/hooks/useSyncData';

interface DataTableProps {
  data: SyncRecord[];
  columns: string[];
  onCellUpdate: (superjoin_id: string, column: string, value: unknown) => Promise<boolean>;
  isPending: (superjoin_id: string, column: string) => boolean;
  onCellFocusChange: (isFocused: boolean) => void;
}

// Format column name: capitalize and handle snake_case
function formatColumnName(column: string): string {
  return column
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function DataTable({
  data,
  columns: columnNames,
  onCellUpdate,
  isPending,
  onCellFocusChange,
}: DataTableProps) {
  const columns = useMemo<ColumnDef<SyncRecord>[]>(() => {
    // Reorder columns: superjoin_id first, then regular columns, then timestamps
    const priority = ['superjoin_id'];
    const timestamps = ['createdAt', 'updatedAt'];
    
    const sortedColumns = [...columnNames].sort((a, b) => {
      const aPriority = priority.includes(a) ? 0 : timestamps.includes(a) ? 2 : 1;
      const bPriority = priority.includes(b) ? 0 : timestamps.includes(b) ? 2 : 1;
      return aPriority - bPriority;
    });

    return sortedColumns.map((column): ColumnDef<SyncRecord> => ({
      id: column,
      accessorKey: column,
      header: () => (
        <div className="flex items-center gap-1.5 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
          {formatColumnName(column)}
        </div>
      ),
      cell: ({ row }) => (
        <EditableCell
          value={row.original[column]}
          superjoin_id={row.original.superjoin_id}
          column={column}
          isProtected={isProtectedColumn(column)}
          isPending={isPending(row.original.superjoin_id, column)}
          onUpdate={(value) => onCellUpdate(row.original.superjoin_id, column, value)}
          onFocusChange={onCellFocusChange}
        />
      ),
    }));
  }, [columnNames, onCellUpdate, isPending, onCellFocusChange]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-table-border">
      <table className="w-full border-collapse min-w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="bg-table-header border-b border-table-border">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left whitespace-nowrap"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, index) => (
            <tr
              key={row.id}
              className={`
                border-b border-table-border last:border-b-0
                transition-colors duration-150
                ${index % 2 === 0 ? 'bg-table-row-even' : 'bg-table-row-odd'}
                hover:bg-table-row-hover
              `}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-1 whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
