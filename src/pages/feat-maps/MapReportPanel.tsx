import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/Icons'
import { formatReportDateTime, type MapViolation } from '../../services/dashboard/mapData'
import type { ReportStatus } from '../../services/report/getReports'
import { ReportStatusDetails } from '../feat-report/ReportStatusDetails'

interface MapReportPanelProps {
  violation: MapViolation
  saving: boolean
  error: string | null
  onChangeStatus: (status: ReportStatus) => void
  onClose: () => void
}

// Right-hand detail panel for a clicked pin: evidence photo + the same details and
// status buttons as the Report page's dialog. Not modal: the map stays usable.
// Mount with key={violation.id} so focus returns to the pin that opened it.
export function MapReportPanel({ violation: v, saving, error, onChangeStatus, onClose }: MapReportPanelProps) {
  const panelRef = useRef<HTMLElement>(null)
  const opener = useRef<HTMLElement | null>(document.activeElement as HTMLElement | null)
  const [photoFailed, setPhotoFailed] = useState(false)

  useEffect(() => {
    panelRef.current?.focus()
    const previous = opener.current
    // The pin may be gone (status set to Tidak Valid); then focus stays where it is
    return () => {
      if (previous?.isConnected) previous.focus()
    }
  }, [])

  // Disabled buttons drop focus while saving; bring it back to the panel afterwards
  const wasSaving = useRef(false)
  useEffect(() => {
    if (wasSaving.current && !saving) panelRef.current?.focus()
    wasSaving.current = saving
  }, [saving])

  const { date, timestamp } = formatReportDateTime(v.createdAt)
  const location = v.address ?? '-'

  return (
    <aside ref={panelRef} className="map-panel" aria-labelledby="map-panel-title" tabIndex={-1}>
      <div className="map-panel__photo-wrap">
        {v.photoUrl && !photoFailed ? (
          <img
            className="map-panel__photo"
            src={v.photoUrl}
            alt={`Foto bukti pelanggaran di ${location}`}
            onError={() => setPhotoFailed(true)}
          />
        ) : (
          <span className="map-panel__no-photo">Foto tidak tersedia</span>
        )}
        <button
          type="button"
          className="map-panel__close"
          aria-label="Tutup detail laporan"
          disabled={saving}
          onClick={onClose}
        >
          <Icon.Close />
        </button>
      </div>

      <div className="map-panel__body">
        <h2 id="map-panel-title" className="map-panel__title">
          Detail Laporan
        </h2>
        <ReportStatusDetails
          idText={v.id}
          row={{
            location,
            coordinate: { lat: v.lat, lng: v.lng },
            date,
            timestamp,
            mediaUrl: v.photoUrl,
            mediaName: null, // not in the map data; the link shows the URL, like the Report page does
            status: v.status,
          }}
          saving={saving}
          error={error}
          onChangeStatus={onChangeStatus}
        />
      </div>
    </aside>
  )
}
