import { MapContainer, Marker, Polygon, Popup, TileLayer, Tooltip } from 'react-leaflet'
import L, { type Map as LeafletMap, type PathOptions } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  formatDateTime,
  type MapViolation,
  type MapZone,
  type ViolationStatus,
} from '../../services/dashboard/mapData'
import './ViolationMap.css'

export const MAP_CENTER: [number, number] = [-6.2018, 106.7829]
export const MAP_ZOOM = 15
export const MIN_ZOOM = 3
export const MAX_ZOOM = 19

const STATUS_LABELS: Record<ViolationStatus, string> = {
  unverified: 'Belum Diverifikasi',
  valid: 'Valid',
  invalid: 'Tidak Valid',
}

// Forbidden zones: yellow fill at 25% opacity, with a solid yellow edge so the
// boundary stays easy to see on the grey tiles.
const ZONE_STYLE: PathOptions = {
  color: '#eab308',
  weight: 2,
  fillColor: '#facc15',
  fillOpacity: 0.25,
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

// Purple pin with a square photo thumbnail above it. If the photo is missing or
// fails to load, the grey placeholder behind it stays visible.
function markerIcon(v: MapViolation) {
  const photo = v.photoUrl
    ? `<img src="${escapeHtml(v.photoUrl)}" alt="" loading="lazy" onerror="this.remove()" />`
    : ''
  return L.divIcon({
    className: 'vmarker',
    html: `<span class="vmarker__thumb">${photo}</span><span class="vmarker__pin"></span>`,
    iconSize: [44, 68],
    iconAnchor: [22, 66], // bottom of the pin sits on the coordinate
    popupAnchor: [0, -64],
  })
}

interface ViolationMapProps {
  violations: MapViolation[]
  zones?: MapZone[]
  // false = static preview: no dragging/zooming/popups, markers not focusable
  interactive?: boolean
  onMapReady?: (map: LeafletMap) => void
  // Lets the page open a marker's popup (e.g. after picking a search result)
  markerRef?: (id: string, marker: L.Marker | null) => void
}

export function ViolationMap({
  violations,
  zones = [],
  interactive = true,
  onMapReady,
  markerRef,
}: ViolationMapProps) {
  return (
    <MapContainer
      className="violation-map"
      center={MAP_CENTER}
      zoom={MAP_ZOOM}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      zoomControl={false} // custom +/- buttons on the full-screen map
      dragging={interactive}
      scrollWheelZoom={interactive}
      doubleClickZoom={interactive}
      touchZoom={interactive}
      boxZoom={interactive}
      keyboard={interactive}
      ref={(map) => {
        if (map) onMapReady?.(map)
      }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={MAX_ZOOM}
      />

      {/* Zones go in the overlay pane, below the markers */}
      {zones.map((z) => (
        <Polygon key={z.id} positions={z.positions} pathOptions={ZONE_STYLE} interactive={interactive}>
          {interactive && <Tooltip sticky>{z.name}</Tooltip>}
        </Polygon>
      ))}

      {violations.map((v) => (
        <Marker
          key={v.id}
          position={[v.lat, v.lng]}
          icon={markerIcon(v)}
          title={v.address ?? 'Lokasi tanpa alamat'}
          alt={v.address ?? 'Lokasi tanpa alamat'}
          interactive={interactive}
          keyboard={interactive}
          ref={(m) => markerRef?.(v.id, m)}
        >
          {interactive && (
            <Popup>
              <div className="vpopup">
                {v.photoUrl && (
                  <img
                    className="vpopup__photo"
                    src={v.photoUrl}
                    alt={v.address ?? 'Bukti pelanggaran'}
                    loading="lazy"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
                <p className="vpopup__address">{v.address ?? 'Lokasi tanpa alamat'}</p>
                <p className={`vpopup__status vpopup__status--${v.status}`}>
                  {STATUS_LABELS[v.status] ?? v.status}
                </p>
                <p className="vpopup__time">{formatDateTime(v.createdAt)}</p>
              </div>
            </Popup>
          )}
        </Marker>
      ))}
    </MapContainer>
  )
}
