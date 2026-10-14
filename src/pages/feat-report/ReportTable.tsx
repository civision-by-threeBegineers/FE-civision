import { useState } from 'react'
import { Icon } from '../../components/Icons'
import { backendUrl, type ReportStatus } from '../../services/report/getReports'
import { EditReportDialog } from './EditReportDialog'
import { reportNumber } from './reportState'
import type { ReportsState } from './useReports'
import './ReportTable.css'

const STATUS_LABELS: Record<ReportStatus, string> = {
  valid: 'Valid',
  invalid: 'Invalid',
  unverified: 'Unverified',
}
const STATUS_ORDER: ReportStatus[] = ['valid', 'invalid', 'unverified']

// Number of table columns, used by the loading / error / empty rows.
const COLUMN_COUNT = 6

// Which page buttons to show: the first two, the last two, and the pages next to
// the current one. Missing numbers in between become "…".
// Example: page 1 of 7 -> 1 2 … 6 7
function getPageItems(current: number, total: number): (number | 'gap')[] {
  const candidates = [1, 2, current - 1, current, current + 1, total - 1, total]
  const pages = [...new Set(candidates)]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b)

  const items: (number | 'gap')[] = []
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) items.push('gap')
    items.push(p)
  })
  return items
}

// The reports table with its pagination and report verification: pick a status
// in the row, or press the pencil to open "Edit Report". Used by Report Details
// and by the Dashboard's Review Progress, so both look and behave the same.
export function ReportTable({ reports }: { reports: ReportsState }) {
  const { data, loading, error, page, setPage, pageSize, reload, savingId, statusError, clearStatusError, changeStatus } =
    reports
  const [editingId, setEditingId] = useState<string | null>(null)

  const rows = data?.reports ?? []
  const totalPages = data?.pagination.totalPages ?? 0
  const editingIndex = rows.findIndex((r) => r.id === editingId)
  const editing = editingIndex >= 0 ? rows[editingIndex] : null

  // Rows of the previous page stay visible (dimmed) while the next page loads.
  let stateMessage: string | null = null
  if (error) stateMessage = `Gagal memuat laporan: ${error}`
  else if (loading && !data) stateMessage = 'Memuat laporan...'
  else if (!loading && rows.length === 0) stateMessage = 'Belum ada laporan.'

  const numberOf = (index: number) => reportNumber(data?.pagination.page ?? page, pageSize, index)

  return (
    <div className="report-table-block">
      {statusError && !editing && (
        <p className="report-table__alert" role="alert">
          Gagal memperbarui status: {statusError}
          <button type="button" className="report-table__alert-close" aria-label="Tutup pesan" onClick={clearStatusError}>
            <Icon.Close />
          </button>
        </p>
      )}

      <div className="report-table-wrap">
        <table className={`report-table${loading && data ? ' report-table--loading' : ''}`} aria-busy={loading}>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Location</th>
              <th scope="col">Date</th>
              <th scope="col">Timestamp</th>
              <th scope="col">Media</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {stateMessage ? (
              <tr>
                <td colSpan={COLUMN_COUNT} className="report-table__state" role={error ? 'alert' : undefined}>
                  {stateMessage}
                  {error && (
                    <button type="button" className="report-table__retry" onClick={reload}>
                      Coba lagi
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                const number = numberOf(i)
                return (
                  <tr key={row.id}>
                    <td>{number}</td>
                    <td className="report-table__location" title={row.location}>
                      {row.location}
                    </td>
                    <td className="report-table__center">{row.date}</td>
                    <td className="report-table__center">{row.timestamp}</td>
                    <td className="report-table__center">
                      {row.mediaUrl ? (
                        <a
                          className="report-table__link"
                          href={row.mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={row.mediaName ?? undefined}
                        >
                          Link
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <div className="report-table__status-cell">
                        {/* Status picker: changing it verifies the report right away */}
                        <span className={`report-status-pick report-status-pick--${row.status}`}>
                          <span className="report-status__dot" aria-hidden="true" />
                          <select
                            className="report-status-pick__select"
                            aria-label={`Status laporan ${number}`}
                            value={row.status}
                            disabled={savingId === row.id}
                            onChange={(e) => changeStatus(row.id, e.target.value as ReportStatus)}
                          >
                            {STATUS_ORDER.map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                          <Icon.ChevronDown />
                        </span>
                        <button
                          type="button"
                          className="report-table__icon-btn"
                          aria-label={`Edit laporan ${number}`}
                          title="Edit laporan"
                          onClick={() => {
                            clearStatusError()
                            setEditingId(row.id)
                          }}
                        >
                          <Icon.Edit />
                        </button>
                        <a
                          className="report-table__icon-btn"
                          href={backendUrl(`${row.downloadUrl}?inline=1`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Lihat laporan ${number}`}
                          title="Lihat PDF (bisa diunduh dari sana)"
                        >
                          <Icon.Download />
                        </a>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination (hidden when everything fits on one page) */}
      {totalPages > 1 && (
        <nav className="report-pagination" aria-label="Report pages">
          <div className="report-pagination__pages">
            {getPageItems(page, totalPages).map((item, i) =>
              item === 'gap' ? (
                <span key={`gap-${i}`} className="report-pagination__gap" aria-hidden="true">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  className={`report-pagination__page${item === page ? ' report-pagination__page--active' : ''}`}
                  aria-current={item === page ? 'page' : undefined}
                  onClick={() => setPage(item)}
                >
                  {item}
                </button>
              ),
            )}
          </div>
          <button
            type="button"
            className="report-pagination__next"
            aria-label="Next page"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
          >
            <Icon.ArrowRight />
          </button>
        </nav>
      )}

      {editing && (
        <EditReportDialog
          row={editing}
          number={numberOf(editingIndex)}
          saving={savingId === editing.id}
          error={statusError}
          onClose={() => {
            clearStatusError()
            setEditingId(null)
          }}
          onChangeStatus={async (status) => {
            if (await changeStatus(editing.id, status)) setEditingId(null)
          }}
        />
      )}
    </div>
  )
}
