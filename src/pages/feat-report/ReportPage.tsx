import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/AppLayout'
import { Icon } from '../../components/Icons'
// Placeholder officer. Save the officer from the Report Details design as
// src/assets/officer-report.png, then change this line to import that file instead.
import officerImg from '../../assets/officer-report.png'
import {
  backendUrl,
  getReports,
  type ReportStats,
  type ReportsPage,
  type ReportStatus,
} from '../../services/report/getReports'
import './ReportPage.css'

const ROWS_PER_PAGE = 10

const STAT_CARDS: { key: keyof ReportStats; label: string }[] = [
  { key: 'total', label: 'Total Reports' },
  { key: 'valid', label: 'Valid Reports' },
  { key: 'invalid', label: 'Invalid Reports' },
  { key: 'unverified', label: 'Unverified Reports' },
]

const STATUS_LABELS: Record<ReportStatus, string> = {
  valid: 'Valid',
  invalid: 'Invalid',
  unverified: 'Unverified',
}

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

export default function ReportPage() {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ReportsPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0) // bumped by the "Coba lagi" button

  // Fetch the current page from the backend. Changing pages aborts the previous
  // request, so a slow response can't overwrite a newer page.
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    getReports({ page, pageSize: ROWS_PER_PAGE }, controller.signal)
      .then((result) => {
        setData(result)
        // The page no longer exists (e.g. reports were deleted): jump to the last one.
        const { totalPages } = result.pagination
        if (totalPages > 0 && page > totalPages) setPage(totalPages)
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setError(err?.message || 'terjadi kesalahan.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [page, reloadKey])

  const rows = data?.reports ?? []
  const totalPages = data?.pagination.totalPages ?? 0

  // Rows of the previous page stay visible (dimmed) while the next page loads.
  let stateMessage: string | null = null
  if (error) stateMessage = `Gagal memuat laporan: ${error}`
  else if (loading && !data) stateMessage = 'Memuat laporan...'
  else if (!loading && rows.length === 0) stateMessage = 'Belum ada laporan.'

  return (
    <AppLayout title="Report Details">
      {/* Stats card + officer */}
      <section className="report-hero">
        <div className="report-stats">
          {STAT_CARDS.map((stat) => (
            <div key={stat.key} className={`report-stat report-stat--${stat.key}`}>
              <span className="report-stat__value">{data ? data.stats[stat.key] : '–'}</span>
              <span className="report-stat__label">{stat.label}</span>
            </div>
          ))}
        </div>
        <img className="report-hero__officer" src={officerImg} alt="" />
      </section>

      {/* Reports table */}
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
                    <button
                      type="button"
                      className="report-table__retry"
                      onClick={() => setReloadKey((k) => k + 1)}
                    >
                      Coba lagi
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
                // Running number across pages: page 2 starts at 00011.
                const number = String((data!.pagination.page - 1) * ROWS_PER_PAGE + i + 1).padStart(5, '0')
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
                        <span className={`report-status report-status--${row.status}`}>
                          <span className="report-status__dot" />
                          {STATUS_LABELS[row.status] ?? row.status}
                        </span>
                        <a
                          className="report-table__download"
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
    </AppLayout>
  )
}
