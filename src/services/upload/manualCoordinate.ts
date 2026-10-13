// Parsing + validation for coordinates typed in by hand on the Detection Result card.

export interface LatLon {
  lat: number
  lon: number
}

// Same default region the backend accepts (Indonesia, see BE analysis.service.ts).
export const REGION_BOUNDS = { latMin: -11.5, latMax: 6.5, lonMin: 94.5, lonMax: 141.5 }

// Accepts "lat, lon" (also "lat lon" or "lat; lon"), e.g. "-6.2018, 106.7829",
// which is also the format Google Maps copies. Returns null if it can't be read
// or the numbers are not valid latitude/longitude values.
export function parseLatLon(text: string): LatLon | null {
  const match = text.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/)
  if (!match) return null
  const lat = Number(match[1])
  const lon = Number(match[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  return { lat, lon }
}

export function isWithinRegion({ lat, lon }: LatLon, b = REGION_BOUNDS) {
  return lat >= b.latMin && lat <= b.latMax && lon >= b.lonMin && lon <= b.lonMax
}
