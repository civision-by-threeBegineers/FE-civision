import { useId, useState, type FormEvent } from 'react'
import { sendManualCoordinate, type AnalysisResult } from '../../services/upload/uploadPhotos'
import { isWithinRegion, parseLatLon } from '../../services/upload/manualCoordinate'

// One detection. bbox is in ORIGINAL-image pixels.
export interface Detection {
  classId: number
  className: string
  confidence: number
  bbox: { x1: number; y1: number; x2: number; y2: number }
  isViolation?: boolean
}

// What sendPhotoToBackend() resolves to (see services/upload/uploadPhotos.ts).
export type BackendAnalysis = AnalysisResult

export interface DetectionItem {
  fileName: string
  url: string
  imageSize: { width: number; height: number }
  result: { detections: Detection[]; violationCount: number }
  backend?: BackendAnalysis | null
  backendError?: string | null
  // The photo was taken with the in-app camera and sent with the device's position
  deviceLocation?: boolean
}

// How the backend found the coordinates (coordinateSource).
const SOURCE_LABELS: Record<string, string> = {
  gps_exif: 'GPS foto',
  ocr: 'OCR',
  manual: 'manual',
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

interface DetectionResultProps {
  item: DetectionItem
  // Called after a hand-typed coordinate was saved, with the backend's new response
  onBackendUpdate?: (backend: BackendAnalysis) => void
}

// One analysed photo: the image with its best detection as a badge, the file name,
// the detection count, and what the backend did with it. If the backend saved the
// photo but couldn't find a coordinate (no GPS, OCR failed), a field lets the user
// type the coordinate in.
export function DetectionResult({ item, onBackendUpdate }: DetectionResultProps) {
  const { detections } = item.result
  const best = detections.reduce<Detection | null>((a, d) => (!a || d.confidence > a.confidence ? d : a), null)
  const needsCoordinate = Boolean(item.backend && !item.backend.coordinate)

  return (
    <article className="detect-result">
      <div className="detect-result__media">
        <img className="detect-result__img" src={item.url} alt={item.fileName} />
        {best && (
          <span className="detect-result__badge">
            {capitalize(best.className)} {Math.round(best.confidence * 100)}%
          </span>
        )}
      </div>

      <div className="detect-result__body">
        <div className="detect-result__summary">
          <span className="detect-result__name" title={item.fileName}>
            {item.fileName}
          </span>
          <span className={`detect-result__count${detections.length === 0 ? ' detect-result__count--empty' : ''}`}>
            {detections.length === 0
              ? 'No Detection'
              : `${detections.length} Detection${detections.length === 1 ? '' : 's'}`}
          </span>
        </div>

        {/* What the backend did with this photo */}
        {item.backendError ? (
          <p className="detect-result__status detect-result__status--error">Gagal disimpan: {item.backendError}</p>
        ) : item.backend?.coordinate ? (
          <p className="detect-result__status">
            Tersimpan · {item.backend.coordinate.lat.toFixed(5)}, {item.backend.coordinate.lon.toFixed(5)}{' '}
            <span className="detect-result__source">
              (
              {item.deviceLocation && item.backend.coordinateSource === 'manual'
                ? 'lokasi perangkat'
                : (SOURCE_LABELS[item.backend.coordinateSource ?? ''] ?? item.backend.coordinateSource)}
              )
            </span>
          </p>
        ) : item.backend ? (
          <p className="detect-result__status">Tersimpan, koordinat tidak ditemukan.</p>
        ) : null}

        {needsCoordinate && <ManualCoordinateField backend={item.backend!} onSaved={onBackendUpdate} />}
      </div>
    </article>
  )
}

// "Tambahkan koordinat..." field. Enter (or Simpan) sends the coordinate to the backend.
function ManualCoordinateField({
  backend,
  onSaved,
}: {
  backend: BackendAnalysis
  onSaved?: (backend: BackendAnalysis) => void
}) {
  const hintId = useId()
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (saving) return

    const coordinate = parseLatLon(text)
    if (!coordinate) {
      setError('Format koordinat: lat, lon (contoh -6.2018, 106.7829).')
      return
    }
    if (!isWithinRegion(coordinate)) {
      setError('Koordinat di luar wilayah Indonesia.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      onSaved?.(await sendManualCoordinate(backend, coordinate))
    } catch (err) {
      setError((err as { message?: string })?.message || 'Gagal menyimpan koordinat.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="detect-coord" onSubmit={handleSubmit} noValidate>
      <div className={`detect-coord__box${error ? ' detect-coord__box--error' : ''}`}>
        <input
          className="detect-coord__input"
          type="text"
          inputMode="decimal"
          placeholder="Tambahkan koordinat..."
          aria-label="Koordinat lokasi (lat, lon)"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? hintId : undefined}
          maxLength={60}
          value={text}
          disabled={saving}
          onChange={(e) => {
            setText(e.target.value)
            setError(null)
          }}
        />
        {text.trim() !== '' && (
          <button type="submit" className="detect-coord__save" disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        )}
      </div>
      {error && (
        <p id={hintId} className="detect-coord__error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
