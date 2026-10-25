// Violation markers for the dashboard map (small preview + full-screen map).
//
// Backend contract (BE - civision):
//   GET {VITE_API_BASE_URL}/api/dashboard/map
//   200 -> { ok: true, markers: [{ id, lat, lng, status, popup: { time, address, evidenceUrl, ... } }],
//            zones, isEmpty }
//
// The mapper is tolerant on purpose: it also accepts flat fields (address, createdAt,
// photoUrl) and analysis.media.storagePath, so the backend can add the photo URL later
// without a frontend change.

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
const MAP_ENDPOINT = `${BASE_URL}/api/dashboard/map`
const TIMEOUT_MS = 15_000

export type ViolationStatus = 'unverified' | 'valid' | 'invalid'
export type TimeRange = 'daily' | 'weekly' | 'monthly'

export interface MapViolation {
  id: string
  lat: number
  lng: number
  address: string | null
  status: ViolationStatus
  createdAt: string | null // ISO string from the backend
  photoUrl: string | null
}

export class MapDataError extends Error {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message)
    this.name = 'MapDataError'
    if (options.cause) this.cause = options.cause
  }
}

/* ---------- Pure helpers (unit tested in mapData.test.ts) ---------- */

const RANGE_HOURS: Record<TimeRange, number> = { daily: 24, weekly: 24 * 7, monthly: 24 * 30 }

const nonEmptyString = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v : null

const isLat = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= -90 && v <= 90
const isLng = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= -180 && v <= 180

// Turns the raw backend JSON into markers. Items with unusable coordinates are dropped.
export function toMapViolations(json: unknown): MapViolation[] {
  const body = (json ?? {}) as Record<string, unknown>
  const list = Array.isArray(body.markers) ? body.markers : Array.isArray(body.violations) ? body.violations : null
  if (!list) throw new MapDataError('format respons server tidak sesuai.')

  const result: MapViolation[] = []
  for (const raw of list) {
    const item = (raw ?? {}) as Record<string, any>
    const popup = (item.popup ?? {}) as Record<string, any>
    if (!isLat(item.lat) || !isLng(item.lng)) continue

    result.push({
      id: String(item.id),
      lat: item.lat,
      lng: item.lng,
      address: nonEmptyString(item.address) ?? nonEmptyString(popup.address),
      status: (item.status ?? 'unverified') as ViolationStatus,
      createdAt: nonEmptyString(item.createdAt) ?? nonEmptyString(popup.time),
      photoUrl:
        nonEmptyString(item.photoUrl) ??
        nonEmptyString(popup.photoUrl) ??
        nonEmptyString(popup.evidenceUrl) ??
        nonEmptyString(item.analysis?.media?.storagePath),
    })
  }
  return result
}

// Violations created within the time range, counted back from `now`.
// Items without a parseable createdAt are left out of every range.
export function filterByTimeRange(items: MapViolation[], range: TimeRange, now: number = Date.now()) {
  const from = now - RANGE_HOURS[range] * 60 * 60 * 1000
  return items.filter((v) => {
    if (!v.createdAt) return false
    const t = Date.parse(v.createdAt)
    return Number.isFinite(t) && t >= from
  })
}

// Case-insensitive "address contains query", newest first. No limit applied here.
export function searchByAddress(items: MapViolation[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return items
    .filter((v) => v.address !== null && v.address.trim() !== '' && v.address.toLowerCase().includes(q))
    .sort((a, b) => (Date.parse(b.createdAt ?? '') || 0) - (Date.parse(a.createdAt ?? '') || 0))
}

// e.g. "17 Agustus 2026, 14.30"
export function formatDateTime(iso: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  const date = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  return `${date}, ${time}`
}

// Same format as the Report page (backend formatJakarta): "17/08/2026" and "14:30:05", Asia/Jakarta.
const JAKARTA_PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})
export function formatReportDateTime(iso: string | null): { date: string; timestamp: string } {
  const d = iso ? new Date(iso) : null
  if (!d || Number.isNaN(d.getTime())) return { date: '-', timestamp: '-' }
  const p = Object.fromEntries(JAKARTA_PARTS.formatToParts(d).map((x) => [x.type, x.value]))
  return { date: `${p.day}/${p.month}/${p.year}`, timestamp: `${p.hour}:${p.minute}:${p.second}` }
}

// After a status change: the marker keeps its place in the list with the new status.
// (The map page hides 'invalid' ones; keeping them lets the officer undo from the panel.)
export function applyMarkerStatus(items: MapViolation[], id: string, status: ViolationStatus) {
  return items.map((v) => (v.id === id ? { ...v, status } : v))
}

/* ---------- Zones (forbidden areas) ---------- */

// GET /api/zones -> { ok: true, zones: [{ id, name, points: [[lng, lat], ...] }] }
export interface MapZone {
  id: string
  name: string
  positions: [number, number][] // [lat, lng] for Leaflet
}

// Backend points are [lng, lat] pairs; Leaflet wants [lat, lng].
// Bad points are skipped, and zones left with fewer than 3 points are dropped.
export function toMapZones(json: unknown): MapZone[] {
  const body = (json ?? {}) as Record<string, unknown>
  if (!Array.isArray(body.zones)) throw new MapDataError('format respons zona tidak sesuai.')

  const result: MapZone[] = []
  for (const raw of body.zones) {
    const zone = (raw ?? {}) as Record<string, unknown>
    if (!Array.isArray(zone.points)) continue
    const positions: [number, number][] = []
    for (const p of zone.points) {
      if (Array.isArray(p) && isLng(p[0]) && isLat(p[1])) positions.push([p[1], p[0]])
    }
    if (positions.length < 3) continue
    result.push({ id: String(zone.id), name: nonEmptyString(zone.name) ?? 'Zona terlarang', positions })
  }
  return result
}

export async function getZones(signal?: AbortSignal): Promise<MapZone[]> {
  if (!BASE_URL) throw new MapDataError('alamat backend belum diatur (VITE_API_BASE_URL di .env).')
  const res = await fetch(`${BASE_URL}/api/zones`, { signal })
  let json: Record<string, unknown> | null = null
  try {
    json = await res.json()
  } catch {
    // leave json as null
  }
  if (!res.ok || !json?.ok) throw new MapDataError((json?.message as string) || `HTTP ${res.status}`)
  return toMapZones(json)
}

/* ---------- Fetch ---------- */

export async function getMapData(signal?: AbortSignal): Promise<MapViolation[]> {
  if (!BASE_URL) throw new MapDataError('alamat backend belum diatur (VITE_API_BASE_URL di .env).')

  // Abort after 15 s, or when the caller aborts (component unmounted / retried).
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort)

  try {
    let res: Response
    try {
      res = await fetch(MAP_ENDPOINT, { signal: controller.signal })
    } catch (err) {
      if (signal?.aborted) throw err // caller cancelled, not a real error
      throw new MapDataError('tidak bisa terhubung ke server.', { cause: err })
    }

    let json: Record<string, unknown> | null = null
    try {
      json = await res.json()
    } catch {
      // leave json as null
    }
    if (!res.ok || !json?.ok) {
      throw new MapDataError((json?.message as string) || `HTTP ${res.status}`)
    }
    return toMapViolations(json)
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}
