import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Map as LeafletMap } from 'leaflet'
import { AppLayout } from '../../components/AppLayout'
import { Icon } from '../../components/Icons'
import { filterByTimeRange, type MapViolation, type TimeRange } from '../../services/dashboard/mapData'
import type { ReportStatus } from '../../services/report/getReports'
import { updateReportStatus } from '../../services/report/updateReportStatus'
import { ViolationMap } from './ViolationMap'
import { LocationSearch, TimeRangeFilter, ZoomControls } from './MapControls'
import { MapReportPanel } from './MapReportPanel'
import { useMapData } from './useMapData'
import './MapPage.css'

const SEARCH_ZOOM = 17

// Full-screen violation map (/map), opened from the dashboard's map card.
export default function MapPage() {
  const navigate = useNavigate()
  const { violations, zones, loading, error, retry, updateStatus } = useMapData()
  const [range, setRange] = useState<TimeRange>('weekly')
  const [map, setMap] = useState<LeafletMap | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const searchOpen = useRef(false)
  const rangeOpen = useRef(false)

  // 'invalid' is hidden from the map (the backend also leaves it out of /api/dashboard/map)
  const visible = useMemo(
    () => filterByTimeRange(violations.filter((v) => v.status !== 'invalid'), range),
    [violations, range],
  )
  // Looked up in the full list, so the panel stays open after a change to Tidak Valid
  const selected = violations.find((v) => v.id === selectedId) ?? null
  const saving = selected !== null && savingId === selected.id

  // Back to the dashboard; it puts keyboard focus back on the map card.
  const goBack = useCallback(() => navigate('/dashboard', { state: { focusMap: true } }), [navigate])

  const openPanel = useCallback((v: MapViolation) => {
    setStatusError(null)
    setSelectedId(v.id)
  }, [])
  const closePanel = useCallback(() => {
    setStatusError(null)
    setSelectedId(null)
  }, [])

  // Escape: close the detail panel, otherwise return to the dashboard.
  // (The search list and the time dropdown stop Escape themselves while open.)
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || searchOpen.current || rangeOpen.current) return
      if (selectedId) {
        if (!saving) closePanel()
        return
      }
      goBack()
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [selectedId, saving, closePanel, goBack])

  // Fly to the picked search result, then open its panel
  const handleSelect = (v: MapViolation) => {
    if (!map) return
    map.once('moveend', () => openPanel(v))
    map.flyTo([v.lat, v.lng], Math.max(map.getZoom(), SEARCH_ZOOM), { duration: 1.2 })
  }

  // Same flow as the Report page (useReports.changeStatus): save, then update locally
  const changeStatus = async (id: string, status: ReportStatus) => {
    setSavingId(id)
    setStatusError(null)
    try {
      await updateReportStatus(id, status)
      updateStatus(id, status)
    } catch (err) {
      setStatusError((err as { message?: string })?.message || 'gagal memperbarui status.')
    } finally {
      setSavingId(null)
    }
  }

  const onSearchOpen = useCallback((open: boolean) => {
    searchOpen.current = open
  }, [])
  const onRangeOpen = useCallback((open: boolean) => {
    rangeOpen.current = open
  }, [])

  return (
    <AppLayout title="Peta Pelanggaran" showTopbar={false} fullBleed>
      <div className={`map-page${selected ? ' map-page--panel' : ''}`}>
        <ViolationMap violations={visible} zones={zones} onMapReady={setMap} onMarkerClick={openPanel} />

        {/* Controls on top of the map */}
        <div className="map-page__top">
          <button type="button" className="map-back" aria-label="Kembali ke dasbor" onClick={goBack}>
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

        {selected && (
          <MapReportPanel
            key={selected.id}
            violation={selected}
            saving={saving}
            error={statusError}
            onChangeStatus={(status) => changeStatus(selected.id, status)}
            onClose={closePanel}
          />
        )}
      </div>
    </AppLayout>
  )
}
