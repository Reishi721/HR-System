import { useState, useEffect } from 'react'

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type FilterFn,
} from '@tanstack/react-table'
import {
  ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight,
  Settings2, Download, FilterX, Maximize2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuCheckboxItem,
  DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Table as CustomTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// Advanced fuzzy filter could be added, but standard includes string works well
const fuzzyFilter: FilterFn<any> = (row, columnId, value, _addMeta) => {
  const itemValue = row.getValue(columnId)
  if (itemValue == null) return false
  return String(itemValue).toLowerCase().includes(String(value).toLowerCase())
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  onExport?: () => void
  loading?: boolean
  emptyMessage?: string
  pageSize?: number
  toolbar?: React.ReactNode
}

export function DataTable<TData, TValue>({
  columns, data, searchKey: _searchKey, searchPlaceholder = 'Search all columns...', onExport,
  loading, emptyMessage = 'No data found.', pageSize = 10, toolbar,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Improved ESC handler + body scroll lock
  useEffect(() => {
    if (!isFullscreen) {
      document.body.style.overflow = ''
      return
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false)
      }
    }

    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'   // lock scroll

    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''        // selalu restore
    }
  }, [isFullscreen])

  // No longer returning the portal directly, rendering via Dialog below.
  const renderHeaderFullscreen = (
    <div className="flex items-center justify-between mb-4 pb-4 border-b px-4 mt-2">
      <DialogTitle className="text-lg font-semibold text-slate-800">Tabel Fullscreen</DialogTitle>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsFullscreen(false)}
        className="gap-2"
      >
        Keluar Fullscreen <span className="text-xs">(ESC)</span>
      </Button>
    </div>
  )
  const table = useReactTable({
    data,
    columns,
    filterFns: {
      fuzzy: fuzzyFilter,
    },
    globalFilterFn: fuzzyFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, columnFilters, columnVisibility, globalFilter },
    initialState: { pagination: { pageSize } },
  })

  // Advanced Column Filter Input Component
  function Filter({ column, table }: { column: any, table: any }) {
    const firstValue = table.getPreFilteredRowModel().flatRows[0]?.getValue(column.id)
    const columnFilterValue = column.getFilterValue()

    // Check if the column is a boolean or requires distinct select
    const uniqueValues = column.getFacetedUniqueValues()
    const isDistinctSelect = uniqueValues.size <= 5 && typeof firstValue === 'string'

    if (isDistinctSelect) {
      const options = Array.from(uniqueValues.keys()).sort()
      return (
        <Select
          value={
            columnFilterValue === undefined ? 'all' :
            columnFilterValue === '' ? '_empty_' :
            String(columnFilterValue)
          }
          onValueChange={val => {
            if (val === 'all') column.setFilterValue(undefined)
            else if (val === '_empty_') column.setFilterValue('')
            else column.setFilterValue(val)
          }}
        >
          <SelectTrigger className="h-8 w-full border border-slate-200 rounded-md bg-slate-50 text-xs px-2 text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {options.map((val: any) => {
              const strVal = val === '' ? '_empty_' : String(val)
              const displayVal = val === '' ? '(Kosong)' : String(val)
              return <SelectItem value={strVal} key={strVal}>{displayVal}</SelectItem>
            })}
          </SelectContent>
        </Select>
      )
    }

    return (
      <Input
        type="text"
        value={(columnFilterValue ?? '') as string}
        onChange={e => column.setFilterValue(e.target.value)}
        placeholder={`Filter...`}
        className="h-8 w-full border-slate-200 bg-slate-50 text-xs focus:bg-white placeholder:text-slate-300 px-2"
      />
    )
  }

  // ESC key handler for fullscreen
  useEffect(() => {
    if (!isFullscreen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    // Prevent body scroll when fullscreen
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isFullscreen])

  const tableContent = (
    <div className={cn(
      "flex flex-col gap-4 transition-all duration-300 w-full max-w-full",
      isFullscreen ? "h-full" : ""
    )}>
      {/* Advanced Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200 h-10 text-sm focus:bg-white transition-all shadow-sm group-focus-within:shadow-md"
            />
          </div>
          {columnFilters.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => table.resetColumnFilters()}
              className="h-10 text-rose-500 hover:text-rose-600 hover:bg-rose-50 gap-2 px-3"
            >
              <FilterX className="h-4 w-4" /> <span className="hidden sm:inline">Clear Filters</span>
            </Button>
          )}
          {toolbar}
        </div>

        <div className="flex items-center gap-2">
          {onExport && (
            <Button variant="outline" onClick={onExport} className="h-10 gap-2 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 gap-2 text-slate-600 hover:bg-slate-50">
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Kolom</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-2">
              <DropdownMenuLabel className="text-xs text-slate-500 font-semibold mb-1">Tampilkan Kolom</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {table
                  .getAllColumns()
                  .filter((col) => col.getCanHide())
                  .map((col) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={col.id}
                        className="capitalize text-sm py-2 cursor-pointer focus:bg-indigo-50 focus:text-indigo-700 rounded-md"
                        checked={col.getIsVisible()}
                        onCheckedChange={(val) => col.toggleVisibility(!!val)}
                      >
                        {col.id.replace(/_/g, ' ')}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant={isFullscreen ? "default" : "outline"}
            className={cn(
              "h-10 w-10 p-0 transition-colors",
              isFullscreen
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "text-slate-600 hover:bg-slate-50"
            )}
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Keluar Fullscreen (Esc)" : "Fullscreen"}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table with Scrolling & Sticky Header */}
      <div className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col relative",
        isFullscreen ? "flex-1 min-h-0" : "max-h-[600px] xl:max-h-[750px]"
      )}>
        <div className="overflow-auto custom-scrollbar flex-1 relative">
          <CustomTable className="w-full min-w-[640px]">
            <TableHeader className="sticky top-0 z-20 bg-slate-100/90 backdrop-blur-md shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-b border-slate-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b-0 hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="p-3 align-top font-semibold text-slate-700 text-sm h-auto"
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex flex-col gap-2">
                          <div
                            className={cn(
                              'flex items-center justify-between group',
                              header.column.getCanSort() && 'cursor-pointer select-none hover:text-indigo-600 transition-colors'
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <span className="truncate pr-2">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </span>
                            {header.column.getCanSort() && (
                              <span className="shrink-0 text-slate-300 group-hover:text-indigo-400">
                                {header.column.getIsSorted() === 'asc' ? (
                                  <ChevronUp className="h-4 w-4 text-indigo-600" />
                                ) : header.column.getIsSorted() === 'desc' ? (
                                  <ChevronDown className="h-4 w-4 text-indigo-600" />
                                ) : (
                                  <ChevronsUpDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </span>
                            )}
                          </div>

                          {/* Advanced Column Filtering */}
                          {header.column.getCanFilter() ? (
                            <div className="mt-1" onDoubleClick={(e) => e.stopPropagation()}>
                              <Filter column={header.column} table={table} />
                            </div>
                          ) : null}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody className="bg-white">
              {loading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <TableRow key={i} className="hover:bg-slate-50/50 transition-colors">
                    {columns.map((_, j) => (
                      <TableCell key={j} className="p-4">
                        <Skeleton className="h-4 w-[60%]" style={{ width: `${60 + Math.random() * 30}%` }} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className="hover:bg-slate-50/70 transition-colors group border-slate-100"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="p-4 text-sm text-slate-600 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-48 text-center text-slate-400 text-sm">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center shadow-inner">
                        <Search className="h-6 w-6 text-slate-300" />
                      </div>
                      <p className="font-medium text-slate-500">{emptyMessage}</p>
                      {globalFilter || columnFilters.length > 0 ? (
                        <Button variant="link" size="sm" onClick={() => { setGlobalFilter(''); table.resetColumnFilters() }} className="text-indigo-600">
                          Clear all search &amp; filters
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </CustomTable>
        </div>
      </div>

      {/* Pagination & Rows Per Page */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-1 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <p className="text-sm text-slate-500 font-medium">Show</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px] bg-white text-xs font-semibold">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50, 100, 250].map(size => (
                <SelectItem key={size} value={`${size}`}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-slate-500 font-medium">rows</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-sm text-slate-500 font-medium bg-slate-100/50 px-3 py-1.5 rounded-lg border border-slate-100">
            Showing <span className="text-slate-800 font-bold">{table.getRowModel().rows.length > 0 ? table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1 : 0}</span> to <span className="text-slate-800 font-bold">{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)}</span> of <span className="text-indigo-600 font-bold">{table.getFilteredRowModel().rows.length}</span> total entries
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-100/50 rounded-lg border border-slate-100">
            <Button
              variant="ghost"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="h-8 px-2 text-xs font-semibold text-slate-600 hover:text-indigo-700 hover:bg-white data-[disabled]:opacity-50"
            >
              First
            </Button>
            <Button
              variant="outline"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8 p-0 bg-white border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center px-2">
              <span className="text-sm font-semibold text-slate-700 min-w-[3rem] text-center">
                {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
              </span>
            </div>

            <Button
              variant="outline"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8 p-0 bg-white border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 shadow-sm"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="h-8 px-2 text-xs font-semibold text-slate-600 hover:text-indigo-700 hover:bg-white data-[disabled]:opacity-50"
            >
              Last
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 flex flex-col overflow-hidden bg-slate-50/50 gap-0">
          <DialogHeader className="hidden">
             <DialogTitle>Tabel Fullscreen</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden bg-white">
            {renderHeaderFullscreen}
            <div className="flex-1 overflow-hidden flex flex-col">
              {tableContent}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {!isFullscreen && tableContent}
    </>
  )
}
