import { useEffect, useRef, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../components/Icons'
import type { ReportRow, ReportStatus } from '../../services/report/getReports'
import { ReportStatusDetails } from './ReportStatusDetails'

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
            Ubah Status Laporan
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

        <ReportStatusDetails
          idText={`${number} / ${row.id}`}
          row={row}
          saving={saving}
          error={error}
          onChangeStatus={onChangeStatus}
        />
      </div>
    </div>,
    document.body,
  )
}
