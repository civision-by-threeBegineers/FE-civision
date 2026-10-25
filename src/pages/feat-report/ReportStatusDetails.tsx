import { useId } from 'react'
import type { ReportRow, ReportStatus } from '../../services/report/getReports'
import './ReportTable.css'

const STATUS_BUTTONS: { status: ReportStatus; label: string }[] = [
  { status: 'valid', label: 'Valid' },
  { status: 'invalid', label: 'Tidak Valid' },
  { status: 'unverified', label: 'Belum Diverifikasi' },
]

export type ReportDetailsData = Pick<
  ReportRow,
  'location' | 'coordinate' | 'date' | 'timestamp' | 'mediaUrl' | 'mediaName' | 'status'
>

interface ReportStatusDetailsProps {
  idText: string
  row: ReportDetailsData
  saving: boolean
  error: string | null
  onChangeStatus: (status: ReportStatus) => void
}

// A report's detail rows and the three verification buttons.
// Shared by the "Ubah Status Laporan" dialog and the map's detail panel.
export function ReportStatusDetails({ idText, row, saving, error, onChangeStatus }: ReportStatusDetailsProps) {
  const changeTitleId = useId()
  const statusLabel = STATUS_BUTTONS.find((b) => b.status === row.status)?.label ?? row.status
  return (
    <>
      <dl className="edit-report__fields">
        <div className="edit-report__field">
          <dt>ID Laporan</dt>
          <dd>{idText}</dd>
        </div>
        <div className="edit-report__field">
          <dt>Lokasi</dt>
          <dd>{row.location}</dd>
        </div>
        <div className="edit-report__field">
          <dt>Koordinat</dt>
          <dd>
            {row.coordinate.lat.toFixed(5)}, {row.coordinate.lng.toFixed(5)}
          </dd>
        </div>
        <div className="edit-report__field">
          <dt>Tanggal</dt>
          <dd>{row.date}</dd>
        </div>
        <div className="edit-report__field">
          <dt>Waktu</dt>
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
        <div className="edit-report__field edit-report__field--status">
          <dt>Status</dt>
          <dd>
            <span className={`edit-report__status edit-report__status--${row.status}`}>
              <span className="edit-report__status-dot" aria-hidden="true" />
              {statusLabel}
            </span>
          </dd>
        </div>
      </dl>

      {error && (
        <p className="edit-report__error" role="alert">
          Gagal memperbarui status: {error}
        </p>
      )}

      <p id={changeTitleId} className="edit-report__change-title">
        Ubah status:
      </p>
      <div
        className="edit-report__actions"
        role="group"
        aria-labelledby={changeTitleId}
      >
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
      {/* The status row above already shows the current status; this only announces saving. */}
      <p className="edit-report__hint" aria-live="polite">
        {saving ? 'Menyimpan...' : ''}
      </p>
    </>
  )
}
