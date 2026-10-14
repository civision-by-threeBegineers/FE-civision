import { useCallback, useEffect, useState } from 'react'
import { getReports, type ReportsPage, type ReportStatus } from '../../services/report/getReports'
import { updateReportStatus } from '../../services/report/updateReportStatus'
import { applyStatusChange } from './reportState'

// Loads one page of reports at a time from the backend, and verifies reports
// (changes their status). Shared by Report Details and the Dashboard's Review Progress.
export function useReports(pageSize: number) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ReportsPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0) // bumped by the "Coba lagi" button
  const [savingId, setSavingId] = useState<string | null>(null) // report whose status is being saved
  const [statusError, setStatusError] = useState<string | null>(null)

  // Fetch the current page. Changing pages aborts the previous request, so a slow
  // response can't overwrite a newer page.
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    getReports({ page, pageSize }, controller.signal)
      .then((result) => {
        setData(result)
        // The page no longer exists (e.g. reports were deleted): jump to the last one.
        const { totalPages } = result.pagination
        if (totalPages > 0 && page > totalPages) setPage(totalPages)
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setError(err?.message || 'terjadi kesalahan.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [page, pageSize, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])
  const clearStatusError = useCallback(() => setStatusError(null), [])

  // Saves the new status on the backend, then updates the row and the stat cards.
  // Resolves to true on success; on failure the row keeps its old status.
  const changeStatus = useCallback(async (id: string, status: ReportStatus) => {
    setSavingId(id)
    setStatusError(null)
    try {
      await updateReportStatus(id, status)
      setData((current) => (current ? applyStatusChange(current, id, status) : current))
      return true
    } catch (err) {
      setStatusError((err as { message?: string })?.message || 'gagal memperbarui status.')
      return false
    } finally {
      setSavingId(null)
    }
  }, [])

  return {
    pageSize,
    page,
    setPage,
    data,
    loading,
    error,
    reload,
    savingId,
    statusError,
    clearStatusError,
    changeStatus,
  }
}

export type ReportsState = ReturnType<typeof useReports>
