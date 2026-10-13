import { useCallback, useEffect, useState } from 'react'
import { getMapData, getZones, type MapViolation, type MapZone } from '../../services/dashboard/mapData'

// Loads the violation markers and the forbidden zones once per mount. retry() fetches again.
// Zones are drawn on top of the map only; if they fail to load, the markers still show.
export function useMapData() {
  const [violations, setViolations] = useState<MapViolation[]>([])
  const [zones, setZones] = useState<MapZone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    getZones(controller.signal)
      .then(setZones)
      .catch((err) => {
        if (!controller.signal.aborted) console.warn('Zona gagal dimuat:', err)
      })

    getMapData(controller.signal)
      .then(setViolations)
      .catch((err) => {
        if (controller.signal.aborted) return
        setError(err?.message || 'terjadi kesalahan.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [attempt])

  const retry = useCallback(() => setAttempt((a) => a + 1), [])
  return { violations, zones, loading, error, retry }
}
