import { useEffect, useRef, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../components/Icons'
import type { ReportRow, ReportStatus } from '../../services/report/getReports'

const STATUS_BUTTONS: { status: ReportStatus; label: string }[] = [
  { status: 'valid', label: 'Valid' },
  { status: 'invalid', label: 'Invalid' },
  { status: 'unverified', label: 'Unverified' },
]

interface EditReportDialogProps {
  row: ReportRow
  number: string
  saving: boolean
  error: string | null
  onChangeStatus: (status: ReportStatus) => void
  onClose: () => void
}

// "Edit Report" popup: the report's details and the three verification buttons.
// Rendered into <body>, so colors are written out (CSS variables from the page
// layout are not available here).
export function EditReportDialog({ row, number, saving, error, onChangeStatus, onClose }: EditReportDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  // Whatever had focus when the dialog opened (the edit button) gets it back on close
  const opener = useRef<HTMLElement | null>(document.activeElement as HTMLElement | null)

  useEffect(() => {
    dialogRef.current?.focus()
    const previous = opener.current
    return () => previous?.focus?.()
  }, [])

  // A disabled button loses focus while saving. When saving ends (e.g. it failed),
  // bring focus back into the dialog so the keyboard keeps working.
  const wasSaving = useRef(false)
  useEffect(() => {
    if (wasSaving.current && !saving) dialogRef.current?.focus()
    wasSaving.current = saving
  }, [saving])

  // Escape closes, wherever the focus is (not while a save is in progress)
  useEffect(() => {
    const handle = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [saving, onClose])

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return

    // Keep Tab inside the dialog
    const focusable = Array.from(
      dialogRef.current!.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]'),
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div className="edit-report-overlay" onPointerDown={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div
        ref={dialogRef}
        className="edit-report"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-report-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="edit-report__head">
          <h2 id="edit-report-title" className="edit-report__title">
            Edit Report
          </h2>
          <button
            type="button"
            className="edit-report__close"
            aria-label="Tutup"
            disabled={saving}
            onClick={onClose}
          >
            <Icon.Close />
          </button>
        </div>

        <dl className="edit-report__fields">
          <div className="edit-report__field">
            <dt>ID Report</dt>
            <dd>
              {number} / {row.id}
            </dd>
          </div>
          <div className="edit-report__field">
            <dt>Location</dt>
            <dd>{row.location}</dd>
          </div>
          <div className="edit-report__field">
            <dt>Coordinate</dt>
            <dd>
              {row.coordinate.lat.toFixed(5)}, {row.coordinate.lng.toFixed(5)}
            </dd>
          </div>
          <div className="edit-report__field">
            <dt>Date</dt>
            <dd>{row.date}</dd>
          </div>
          <div className="edit-report__field">
            <dt>Timestamp</dt>
            <dd>{row.timestamp}</dd>
          </div>
          <div className="edit-report__field">
            <dt>Media</dt>
            <dd>
              {row.mediaUrl ? (
                <a href={row.mediaUrl} target="_blank" rel="noopener noreferrer">
                  {row.mediaName || row.mediaUrl}
                </a>
              ) : (
                '-'
              )}
            </dd>
          </div>
        </dl>

        {error && (
          <p className="edit-report__error" role="alert">
            Gagal memperbarui status: {error}
          </p>
        )}

        <div className="edit-report__actions" role="group" aria-label="Ubah status laporan">
          {STATUS_BUTTONS.map(({ status, label }) => (
            <button
              key={status}
              type="button"
              className={`edit-report__btn edit-report__btn--${status}`}
              aria-pressed={row.status === status}
              disabled={saving}
              onClick={() => row.status !== status && onChangeStatus(status)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="edit-report__hint" aria-live="polite">
          {saving ? 'Menyimpan...' : `Status saat ini: ${row.status}`}
        </p>
      </div>
    </div>,
    document.body,
  )
}
