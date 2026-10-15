import type { ReportStatus } from '../../services/report/getReports'
import type { ReportsState } from '../feat-report/useReports'

const STATUS_LABELS: Record<ReportStatus, string> = {
  valid: 'Valid',
  invalid: 'Invalid',
  unverified: 'Unverified',
}

const COLUMN_COUNT = 3

// Compact "Review Progress" table for the Dashboard: Location, Timestamp, Status.
// It shows the first page of the same reports Report Details lists (same backend
// request, see useReports), without paging or editing.
export function ReviewTable({ reports }: { reports: ReportsState }) {
  const { data, loading, error, reload } = reports
  const rows = data?.reports ?? []

  let message: string | null = null
  if (error) message = `Gagal memuat laporan: ${error}`
  else if (loading && !data) message = 'Memuat laporan...'
  else if (rows.length === 0) message = 'Belum ada laporan.'

  return (
    <div className="table-card">
      <table className="table" aria-busy={loading}>
        <thead>
          <tr>
            <th scope="col">Location</th>
            <th scope="col">Timestamp</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {message ? (
            <tr>
              <td colSpan={COLUMN_COUNT} className="table__state" role={error ? 'alert' : undefined}>
                {message}
                {error && (
                  <button type="button" className="table__retry" onClick={reload}>
                    Coba lagi
                  </button>
                )}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                <td className="table__location" title={row.location}>
                  {row.location}
                </td>
                <td title={`${row.date} ${row.timestamp}`}>{row.timestamp}</td>
                <td>
                  <span className={`status status--${row.status}`}>
                    <span className="status__dot" />
                    {STATUS_LABELS[row.status] ?? row.status}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
