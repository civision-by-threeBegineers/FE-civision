import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../components/Icons'
import {
  LOW_ACCURACY_METERS,
  formatAccuracy,
  formatCoordinate,
  toDeviceLocation,
  type DeviceLocation,
} from '../../services/upload/deviceLocation'

// Take a photo with the device camera, using the browser's WebRTC media API
// (navigator.mediaDevices.getUserMedia). The camera stream is shown live in a
// <video>; "Ambil Foto" copies the current frame to a canvas and turns it into
// a JPEG File, which the upload page treats like any picked file.
//
// The dialog also asks for location permission and follows the device position
// live (Geolocation API watchPosition) while it is open. The position at the
// moment the shutter is pressed goes along with the photo, because camera photos
// have no GPS data of their own.
//
// getUserMedia and geolocation only work on HTTPS or http://localhost.

const JPEG_QUALITY = 0.92

type Facing = 'environment' | 'user' // back / front camera

type GeoState =
  | { status: 'searching' }
  | { status: 'ready'; position: DeviceLocation }
  | { status: 'denied' }
  | { status: 'unavailable' }

interface CameraCaptureProps {
  onCapture: (file: File, location: DeviceLocation | null) => void
  onClose: () => void
}

// Turns a getUserMedia error into a short message for the user.
function cameraErrorMessage(err: unknown): string {
  const name = (err as { name?: string })?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Akses kamera ditolak. Izinkan kamera di pengaturan browser, lalu coba lagi.'
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Kamera tidak ditemukan di perangkat ini.'
  if (name === 'NotReadableError') return 'Kamera sedang dipakai aplikasi lain.'
  return 'Kamera tidak bisa dibuka.'
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [facing, setFacing] = useState<Facing>('environment')
  const [canSwitch, setCanSwitch] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [geo, setGeo] = useState<GeoState>({ status: 'searching' })
  const [geoAttempt, setGeoAttempt] = useState(0)
  // The frame that was just taken, waiting for "Gunakan Foto" or "Ulangi"
  const [shot, setShot] = useState<{ file: File; url: string; location: DeviceLocation | null } | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop()) // turns the camera light off
    streamRef.current = null
  }, [])

  // Open the camera (again when the user switches front/back or retries)
  useEffect(() => {
    let cancelled = false
    setReady(false)
    setError(null)

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('Kamera hanya bisa dipakai lewat HTTPS atau localhost.')
      return
    }

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        stopStream()
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play().catch(() => {})
        }
        // Device labels/count are only reliable after permission was granted
        const devices = await navigator.mediaDevices.enumerateDevices()
        if (!cancelled) setCanSwitch(devices.filter((d) => d.kind === 'videoinput').length > 1)
      })
      .catch((err) => {
        if (!cancelled) setError(cameraErrorMessage(err))
      })

    return () => {
      cancelled = true
    }
  }, [facing, attempt, stopStream])

  // Camera off when the dialog closes
  useEffect(() => stopStream, [stopStream])

  // Ask for location permission and follow the position live while the dialog is open.
  // The browser shows its own permission prompt the first time watchPosition runs.
  useEffect(() => {
    if (!window.isSecureContext || !navigator.geolocation) {
      setGeo({ status: 'unavailable' })
      return
    }

    setGeo({ status: 'searching' })
    const watchId = navigator.geolocation.watchPosition(
      (position) => setGeo({ status: 'ready', position: toDeviceLocation(position) }),
      (err) =>
        setGeo((previous) => {
          if (err.code === err.PERMISSION_DENIED) return { status: 'denied' }
          // A weak signal for a moment shouldn't throw away a position we already have
          return previous.status === 'ready' ? previous : { status: 'unavailable' }
        }),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 },
    )
    return () => navigator.geolocation.clearWatch(watchId) // stops tracking when the dialog closes
  }, [geoAttempt])

  // Free the preview URL of a discarded/used shot
  useEffect(() => {
    if (!shot) return
    return () => URL.revokeObjectURL(shot.url)
  }, [shot])

  // Escape closes; focus starts inside the dialog
  useEffect(() => {
    dialogRef.current?.focus()
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [onClose])

  const takePhoto = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return

    // The position right now: this is the photo's location
    const location = geo.status === 'ready' ? geo.position : null

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')!
    // The front camera preview is mirrored on screen; the saved photo is not.
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        const file = new File([blob], `camera-${stamp}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
        setShot({ file, url: URL.createObjectURL(blob), location })
      },
      'image/jpeg',
      JPEG_QUALITY,
    )
  }

  const usePhoto = () => {
    if (!shot) return
    onCapture(shot.file, shot.location)
    onClose()
  }

  return createPortal(
    <div className="camera-overlay" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        className="camera"
        role="dialog"
        aria-modal="true"
        aria-label="Ambil foto dengan kamera"
        tabIndex={-1}
      >
        <div className="camera__head">
          <h2 className="camera__title">Ambil Foto</h2>
          <button type="button" className="camera__close" aria-label="Tutup kamera" onClick={onClose}>
            <Icon.Close />
          </button>
        </div>

        <div className="camera__view">
          {/* Live camera. Stays mounted under the preview so retaking is instant. */}
          <video
            ref={videoRef}
            className={`camera__video${facing === 'user' ? ' camera__video--mirrored' : ''}`}
            playsInline
            muted
            onLoadedData={() => setReady(true)}
          />
          {shot && <img className="camera__shot" src={shot.url} alt="Foto yang baru diambil" />}

          {!ready && !error && <p className="camera__message">Membuka kamera...</p>}
          {error && (
            <div className="camera__message" role="alert">
              <p>{error}</p>
              <button type="button" className="camera__btn camera__btn--light" onClick={() => setAttempt((a) => a + 1)}>
                Coba lagi
              </button>
            </div>
          )}

          <LocationStatus geo={geo} shot={shot} onRetry={() => setGeoAttempt((a) => a + 1)} />
        </div>

        <div className="camera__actions">
          {shot ? (
            <>
              <button type="button" className="camera__btn camera__btn--light" onClick={() => setShot(null)}>
                Ulangi
              </button>
              <button type="button" className="camera__btn" onClick={usePhoto}>
                Gunakan Foto
              </button>
            </>
          ) : (
            <>
              {canSwitch && (
                <button
                  type="button"
                  className="camera__btn camera__btn--light"
                  onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
                >
                  Ganti Kamera
                </button>
              )}
              <button
                type="button"
                className="camera__shutter"
                aria-label="Ambil foto"
                disabled={!ready || Boolean(error)}
                onClick={takePhoto}
              />
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

// Small badge on the camera view: the live position while taking a photo, or the
// position that was saved with the photo that was just taken.
function LocationStatus({
  geo,
  shot,
  onRetry,
}: {
  geo: GeoState
  shot: { location: DeviceLocation | null } | null
  onRetry: () => void
}) {
  // Looking at a photo that was just taken: show what was saved with it
  if (shot) {
    return shot.location ? (
      <p className="camera__geo camera__geo--ok">
        <Icon.Pin />
        Lokasi foto: {formatCoordinate(shot.location.lat, shot.location.lon)} ({formatAccuracy(shot.location.accuracy)})
      </p>
    ) : (
      <p className="camera__geo camera__geo--warn" role="status">
        <Icon.Pin />
        Foto ini tanpa lokasi. Koordinat bisa diisi manual setelah upload, atau ulangi saat lokasi sudah terdeteksi.
      </p>
    )
  }

  if (geo.status === 'ready') {
    const rough = geo.position.accuracy > LOW_ACCURACY_METERS
    return (
      <p className={`camera__geo ${rough ? 'camera__geo--warn' : 'camera__geo--ok'}`} role="status">
        <span className="camera__geo-dot" aria-hidden="true" />
        {formatCoordinate(geo.position.lat, geo.position.lon)} · {formatAccuracy(geo.position.accuracy)}
        {rough && ' (akurasi rendah)'}
      </p>
    )
  }

  if (geo.status === 'searching') {
    return (
      <p className="camera__geo" role="status">
        <span className="camera__geo-dot camera__geo-dot--wait" aria-hidden="true" />
        Mencari lokasi... izinkan akses lokasi jika diminta browser.
      </p>
    )
  }

  return (
    <p className="camera__geo camera__geo--warn" role="status">
      <Icon.Pin />
      {geo.status === 'denied'
        ? 'Izin lokasi ditolak. Aktifkan di pengaturan browser untuk menyimpan lokasi foto.'
        : 'Lokasi tidak tersedia. Foto tetap bisa diambil.'}
      <button type="button" className="camera__geo-retry" onClick={onRetry}>
        Coba lagi
      </button>
    </p>
  )
}
