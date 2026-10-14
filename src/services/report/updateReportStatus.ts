// Verifies a report: sets its status to valid, invalid or unverified.
//
// Backend contract (BE - civision):
//   PATCH {VITE_API_BASE_URL}/api/violations/:id/status
//   body { status: 'valid' | 'invalid' | 'unverified' }
//   200 -> { ok: true, message, violation }
//   400/404 -> { ok: false, errorCode, message }
// "invalid" is a soft delete on the backend: the row stays in Report Details but is
// hidden from the map and history. Setting it back to another status restores it.
import { ReportError, type ReportStatus } from './getReports'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

export async function updateReportStatus(id: string, status: ReportStatus): Promise<void> {
  if (!BASE_URL) {
    throw new ReportError('alamat backend belum diatur (VITE_API_BASE_URL di .env).')
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}/api/violations/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  } catch (err) {
    throw new ReportError('tidak bisa terhubung ke server. Cek koneksi atau alamat backend.', { cause: err })
  }

  let json: { ok?: boolean; message?: string } | null = null
  try {
    json = await res.json()
  } catch {
    // leave json as null
  }

  if (!res.ok || !json?.ok) {
    throw new ReportError(json?.message || `gagal memperbarui status (HTTP ${res.status}).`, {
      status: res.status,
    })
  }
}
