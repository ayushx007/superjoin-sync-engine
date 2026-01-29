import { useMemo } from 'react';
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
  // 🆕 CHANGE 1: Add the delete callback prop
  onRowDelete: (superjoin_id: string) => void; 
}

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
  onRowDelete, // 🆕 CHANGE 2: Destructure the prop
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

    // Generate standard columns
    const tableColumns = sortedColumns.map((column): ColumnDef<SyncRecord> => ({
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

    // 🆕 CHANGE 3: Append the "Actions" column at the end
    tableColumns.push({
      id: 'actions',
      header: () => null, // Empty header for actions
      cell: ({ row }) => (
        <div className="flex justify-end px-2">
          <button
            onClick={() => {
              // Simple browser confirmation before deleting
              if (window.confirm("Are you sure you want to delete this row?")) {
                onRowDelete(row.original.superjoin_id);
              }
            }}
            className="
              text-red-500 hover:text-red-700 hover:bg-red-50 
              px-3 py-1.5 rounded text-xs font-semibold 
              transition-colors duration-200 border border-transparent hover:border-red-200
            "
          >
            Delete
          </button>
        </div>
      ),
    });

    return tableColumns;

  }, [columnNames, onCellUpdate, isPending, onCellFocusChange, onRowDelete]); // Add dependency

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
                <th key={header.id} className="px-4 py-3 text-left whitespace-nowrap">
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