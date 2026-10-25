// Fetches one page of the Report Details table from the backend.
//
// Backend contract (BE - civision):
//   GET {VITE_API_BASE_URL}/api/reports?page=1&pageSize=10&sortBy=createdAt&sortDir=desc
//   (sortBy: createdAt | location | media | status; sortDir: asc | desc; both optional)
//   200 -> { ok: true, stats, reports: [...one page...], pagination, isEmpty }
//   400 -> { ok: false, message }

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
const REPORTS_ENDPOINT = `${BASE_URL}/api/reports`

export type ReportStatus = 'valid' | 'invalid' | 'unverified'
export type ReportSortBy = 'createdAt' | 'location' | 'media' | 'status'
export type SortDir = 'asc' | 'desc'

export interface ReportStats {
  total: number
  valid: number
  invalid: number
  unverified: number
}

export interface ReportRow {
  id: string
  location: string
  date: string // DD/MM/YYYY
  timestamp: string // HH:MM:SS
  mediaUrl: string | null
  mediaName: string | null
  status: ReportStatus
  downloadUrl: string // relative to the backend, e.g. /api/reports/<id>/pdf
  coordinate: { lat: number; lng: number }
}

export interface Pagination {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface ReportsPage {
  stats: ReportStats
  reports: ReportRow[]
  pagination: Pagination
  isEmpty: boolean
}

export class ReportError extends Error {
  declare status: number | undefined

  constructor(message: string, { status, cause }: { status?: number; cause?: unknown } = {}) {
    super(message)
    this.name = 'ReportError'
    this.status = status
    if (cause) this.cause = cause
  }
}

// Turns a backend-relative path (like downloadUrl) into a full URL.
export function backendUrl(path: string) {
  return /^https?:\/\//i.test(path) ? path : `${BASE_URL}${path}`
}

export async function getReports(
  { page, pageSize, sortBy, sortDir }: { page: number; pageSize: number; sortBy?: ReportSortBy; sortDir?: SortDir },
  signal?: AbortSignal,
): Promise<ReportsPage> {
  if (!BASE_URL) {
    throw new ReportError('alamat backend belum diatur (VITE_API_BASE_URL di .env).')
  }

  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (sortBy) params.set('sortBy', sortBy)
  if (sortDir) params.set('sortDir', sortDir)

  let res: Response
  try {
    res = await fetch(`${REPORTS_ENDPOINT}?${params}`, { signal })
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') throw err // page changed, not a real error
    throw new ReportError('tidak bisa terhubung ke server. Cek koneksi atau alamat backend.', { cause: err })
  }

  let json: (Partial<ReportsPage> & { ok?: boolean; message?: string }) | null = null
  try {
    json = await res.json()
  } catch {
    // leave json as null
  }

  if (!res.ok || !json?.ok) {
    throw new ReportError(json?.message || `gagal memuat laporan (HTTP ${res.status}).`, { status: res.status })
  }

  if (!json.pagination || !Array.isArray(json.reports)) {
    // Backend hasn't shipped pagination yet (old response shape).
    throw new ReportError('format respons server tidak sesuai (pagination tidak ada).', { status: res.status })
  }

  return {
    stats: json.stats ?? { total: 0, valid: 0, invalid: 0, unverified: 0 },
    reports: json.reports,
    pagination: json.pagination,
    isEmpty: json.isEmpty ?? json.pagination.totalItems === 0,
  }
}
