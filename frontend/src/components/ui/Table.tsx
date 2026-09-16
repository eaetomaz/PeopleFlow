import type { KeyboardEvent, ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T, index: number) => ReactNode
  footer?: ReactNode
  sortable?: boolean
  className?: string
  headerClassName?: string
  align?: 'left' | 'right' | 'center'
}

interface TableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string | number
  sort?: { key: string; direction: 'asc' | 'desc' } | null
  onSort?: (key: string) => void
  className?: string
  empty?: ReactNode
  dense?: boolean
  rowClassName?: (row: T, index: number) => string | undefined
  onRowClick?: (row: T, index: number) => void
  rowLabel?: (row: T) => string
  maxHeight?: number | string
  showFooter?: boolean
  minWidth?: number
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' }

export function Table<T>({ columns, rows, rowKey, sort, onSort, className, empty, dense, rowClassName, onRowClick, rowLabel, maxHeight, showFooter, minWidth }: TableProps<T>) {
  const onKey = (event: KeyboardEvent<HTMLTableRowElement>, row: T, index: number) => {
    if (!onRowClick) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onRowClick(row, index)
    }
  }

  return (
    <div className={cn('overflow-auto rounded-2xl border border-line bg-surface', className)} style={maxHeight ? { maxHeight } : undefined}>
      <table className="w-full border-collapse text-left text-sm" style={minWidth ? { minWidth } : undefined}>
        <thead className="sticky top-0 z-10 bg-surface-2/95 backdrop-blur">
          <tr>
            {columns.map((column) => {
              const active = sort?.key === column.key
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'border-b border-line font-semibold whitespace-nowrap text-fg-2',
                    dense ? 'px-3 py-2 text-[0.7rem] tracking-wide uppercase' : 'px-4 py-3 text-xs tracking-wide uppercase',
                    alignClass[column.align ?? 'left'],
                    column.headerClassName,
                  )}
                >
                  {column.sortable && onSort ? (
                    <button type="button" onClick={() => onSort(column.key)} className={cn('inline-flex items-center gap-1.5 uppercase transition-colors hover:text-fg', active && 'text-fg')}>
                      {column.header}
                      {active ? sort?.direction === 'asc' ? <ArrowUp className="size-3.5 text-brand-500" /> : <ArrowDown className="size-3.5 text-brand-500" /> : <ArrowUpDown className="size-3.5 opacity-40" />}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={rowKey(row, index)}
              tabIndex={onRowClick ? 0 : undefined}
              aria-label={onRowClick && rowLabel ? rowLabel(row) : undefined}
              onClick={onRowClick ? () => onRowClick(row, index) : undefined}
              onKeyDown={onRowClick ? (event) => onKey(event, row, index) : undefined}
              className={cn(
                'border-b border-line transition-colors last:border-b-0 hover:bg-surface-2/60',
                onRowClick && 'cursor-pointer focus-visible:bg-brand-500/6 focus-visible:outline-none',
                rowClassName?.(row, index),
              )}
            >
              {columns.map((column) => (
                <td key={column.key} className={cn(dense ? 'px-3 py-2' : 'px-4 py-3', 'text-fg', alignClass[column.align ?? 'left'], column.className)}>
                  {column.cell(row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {showFooter && rows.length > 0 && (
          <tfoot className="sticky bottom-0 bg-surface-2/95 backdrop-blur">
            <tr>
              {columns.map((column) => (
                <td key={column.key} className={cn('border-t border-line-2 font-bold text-fg', dense ? 'px-3 py-2.5' : 'px-4 py-3', alignClass[column.align ?? 'left'], column.className)}>
                  {column.footer}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
      {rows.length === 0 && empty}
    </div>
  )
}
