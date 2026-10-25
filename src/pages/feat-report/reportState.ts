import type { ReportSortBy, ReportsPage, ReportStatus, SortDir } from '../../services/report/getReports'

export type SortColumn = 'lokasi' | 'tanggal' | 'waktu' | 'media' | 'status'
export interface TableSort {
  column: SortColumn
  dir: SortDir
}

// Default: newest date & time first.
export const DEFAULT_SORT: TableSort = { column: 'tanggal', dir: 'desc' }

// Tanggal and Waktu are one timestamp, so both sort by createdAt.
export const SORT_FIELD: Record<SortColumn, ReportSortBy> = {
  lokasi: 'location',
  tanggal: 'createdAt',
  waktu: 'createdAt',
  media: 'media',
  status: 'status',
}

// Clicking the active column flips it; another column starts at "v" (desc).
export function nextSort(current: TableSort, column: SortColumn): TableSort {
  if (current.column === column) return { column, dir: current.dir === 'desc' ? 'asc' : 'desc' }
  return { column, dir: 'desc' }
}

// The page data after one report changed status: its row gets the new status and
// the stat cards move one count from the old status to the new one (total stays).
// Returns the same object when nothing changes.
export function applyStatusChange(data: ReportsPage, id: string, status: ReportStatus): ReportsPage {
  const row = data.reports.find((r) => r.id === id)
  if (!row || row.status === status) return data

  return {
    ...data,
    reports: data.reports.map((r) => (r.id === id ? { ...r, status } : r)),
    stats: {
      ...data.stats,
      [row.status]: Math.max(0, data.stats[row.status] - 1),
      [status]: data.stats[status] + 1,
    },
  }
}

// Running number across pages: page 2 with 10 rows per page starts at 00011.
export function reportNumber(page: number, pageSize: number, index: number) {
  return String((page - 1) * pageSize + index + 1).padStart(5, '0')
}
