import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Map as LeafletMap, Marker } from 'leaflet'
import { AppLayout } from '../../components/AppLayout'
import { Icon } from '../../components/Icons'
import { filterByTimeRange, type MapViolation, type TimeRange } from '../../services/dashboard/mapData'
import { ViolationMap } from './ViolationMap'
import { LocationSearch, TimeRangeFilter, ZoomControls } from './MapControls'
import { useMapData } from './useMapData'
import './MapPage.css'

const SEARCH_ZOOM = 17

// Full-screen violation map (/dashboard/map), opened from the dashboard's map card.
export default function MapPage() {
  const navigate = useNavigate()
  const { violations, zones, loading, error, retry } = useMapData()
  const [range, setRange] = useState<TimeRange>('weekly')
  const [map, setMap] = useState<LeafletMap | null>(null)
  const markers = useRef(new Map<string, Marker>())
  const popupOpen = useRef(false)
  const searchOpen = useRef(false)
  const rangeOpen = useRef(false)

  const visible = useMemo(() => filterByTimeRange(violations, range), [violations, range])

  // Back to the dashboard; it puts keyboard focus back on the map card.
  const goBack = useCallback(() => navigate('/dashboard', { state: { focusMap: true } }), [navigate])

  // Track open popups so Escape closes the popup first instead of leaving the page
  useEffect(() => {
    if (!map) return
    const onOpen = () => (popupOpen.current = true)
    const onClose = () => (popupOpen.current = false)
    map.on('popupopen', onOpen)
    map.on('popupclose', onClose)
    return () => {
      map.off('popupopen', onOpen)
      map.off('popupclose', onClose)
    }
  }, [map])

  // Escape: close an open popup, otherwise return to the dashboard.
  // (The search list and the time dropdown stop Escape themselves while open.)
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || searchOpen.current || rangeOpen.current) return
      if (popupOpen.current) {
        map?.closePopup()
        return
      }
      goBack()
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [map, goBack])

  const setMarkerRef = useCallback((id: string, marker: Marker | null) => {
    if (marker) markers.current.set(id, marker)
    else markers.current.delete(id)
  }, [])

  // Fly to the picked search result, then open its popup
  const handleSelect = (v: MapViolation) => {
    if (!map) return
    map.closePopup()
    map.once('moveend', () => markers.current.get(v.id)?.openPopup())
    map.flyTo([v.lat, v.lng], Math.max(map.getZoom(), SEARCH_ZOOM), { duration: 1.2 })
  }

  const onSearchOpen = useCallback((open: boolean) => {
    searchOpen.current = open
  }, [])
  const onRangeOpen = useCallback((open: boolean) => {
    rangeOpen.current = open
  }, [])

  return (
    <AppLayout title="Peta Pelanggaran" showTopbar={false} fullBleed>
      <div className="map-page">
        <ViolationMap violations={visible} zones={zones} onMapReady={setMap} markerRef={setMarkerRef} />

        {/* Controls on top of the map */}
        <div className="map-page__top">
          <button type="button" className="map-back" aria-label="Kembali ke dashboard" onClick={goBack}>
            <Icon.ChevronLeft />
          </button>
          <LocationSearch violations={visible} onSelect={handleSelect} onOpenChange={onSearchOpen} />
          <TimeRangeFilter value={range} onChange={setRange} onOpenChange={onRangeOpen} />
        </div>

        {(loading || error || visible.length === 0) && (
          <div className="map-page__notice" role={error ? 'alert' : 'status'}>
            {loading ? (
              <>
                <span className="map-page__spinner" aria-hidden="true" />
                Memuat data peta
              </>
            ) : error ? (
              <>
                Gagal memuat data peta
                <button type="button" className="map-page__retry" onClick={retry}>
                  Coba lagi
                </button>
              </>
            ) : (
              'Tidak ada pelanggaran pada rentang waktu ini'
            )}
          </div>
        )}

        <ZoomControls map={map} />
      </div>
    </AppLayout>
  )
}
