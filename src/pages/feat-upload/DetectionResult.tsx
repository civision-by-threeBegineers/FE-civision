import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
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

// One analysed photo: the original photo with the AI's detections drawn on it (a box
// and a "Gerobak 88%" label on each detection), the file name, the detection count,
// and what the backend did with it. If the backend saved the photo but couldn't find
// a coordinate (no GPS, OCR failed), a field lets the user type the coordinate in.
export function DetectionResult({ item, onBackendUpdate }: DetectionResultProps) {
  const { detections } = item.result
  const needsCoordinate = Boolean(item.backend && !item.backend.coordinate)
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Bumped when the photo finishes loading, so the boxes are drawn at the right size
  const [loadedTick, setLoadedTick] = useState(0)

  // Draw the detections on top of the photo. bbox values are in ORIGINAL-image pixels,
  // so they are scaled to the size the photo is shown at. Redrawn when that size changes.
  useEffect(() => {
    const img = imgRef.current
    const canvas = canvasRef.current
    if (!img || !canvas) return

    const draw = () => {
      const { width, height } = img.getBoundingClientRect()
      if (!width || !height) return

      // Crisp lines and text on high-density screens
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      const ctx = canvas.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)

      const sx = width / item.imageSize.width
      const sy = height / item.imageSize.height

      for (const d of detections) {
        const x = d.bbox.x1 * sx
        const y = d.bbox.y1 * sy
        const w = (d.bbox.x2 - d.bbox.x1) * sx
        const h = (d.bbox.y2 - d.bbox.y1) * sy

        // Red for a flagged violation, purple for a plain detection
        const color = d.isViolation ? '#e0485a' : '#5a50c3'
        ctx.lineWidth = 2
        ctx.strokeStyle = color
        ctx.strokeRect(x, y, w, h)

        // Label on the box itself: "Gerobak 88%"
        const label = `${capitalize(d.className)} ${Math.round(d.confidence * 100)}%`
        ctx.font = '600 12px Poppins, system-ui, sans-serif'
        const labelW = ctx.measureText(label).width + 12
        const labelH = 18
        const labelX = Math.min(Math.max(x - 1, 0), Math.max(width - labelW, 0)) // keep inside the photo
        const labelY = y - labelH >= 0 ? y - labelH : y // above the box, or inside it at the very top
        ctx.fillStyle = color
        ctx.fillRect(labelX, labelY, labelW, labelH)
        ctx.fillStyle = '#fff'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, labelX + 6, labelY + labelH / 2 + 0.5)
      }
    }

    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(img)
    return () => observer.disconnect()
  }, [detections, item.imageSize, loadedTick])

  return (
    <article className="detect-result">
      <div className="detect-result__media">
        <img
          ref={imgRef}
          className="detect-result__img"
          src={item.url}
          alt={item.fileName}
          onLoad={() => setLoadedTick((t) => t + 1)}
        />
        {/* The AI's boxes, drawn over the photo */}
        <canvas ref={canvasRef} className="detect-result__canvas" aria-hidden="true" />
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
