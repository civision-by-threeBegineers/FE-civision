import type { ReportsPage, ReportStatus } from '../../services/report/getReports'

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
