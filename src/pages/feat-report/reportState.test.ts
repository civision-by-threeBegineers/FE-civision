import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import type { ReportRow, ReportsPage, ReportStatus } from '../../services/report/getReports'
import { applyStatusChange, DEFAULT_SORT, nextSort, reportNumber, SORT_FIELD } from './reportState'

const row = (id: string, status: ReportStatus): ReportRow => ({
  id,
  location: 'Jl. A',
  date: '26/09/2026',
  timestamp: '13:19:27',
  mediaUrl: null,
  mediaName: null,
  status,
  downloadUrl: `/api/reports/${id}/pdf`,
  coordinate: { lat: -6.2, lng: 106.8 },
})

const page = (statuses: ReportStatus[]): ReportsPage => {
  const stats = { total: statuses.length, valid: 0, invalid: 0, unverified: 0 }
  statuses.forEach((s) => (stats[s] += 1))
  return {
    stats,
    reports: statuses.map((s, i) => row(`r${i}`, s)),
    pagination: { page: 1, pageSize: 10, totalItems: statuses.length, totalPages: 1 },
    isEmpty: statuses.length === 0,
  }
}

describe('applyStatusChange', () => {
  it('updates the row and moves one count between stat cards', () => {
    const next = applyStatusChange(page(['unverified', 'valid']), 'r0', 'invalid')
    expect(next.reports[0].status).toBe('invalid')
    expect(next.stats).toEqual({ total: 2, valid: 1, invalid: 1, unverified: 0 })
  })

  it('keeps stats equal to the row counts and the total unchanged', () => {
    const statusArb = fc.constantFrom<ReportStatus>('valid', 'invalid', 'unverified')
    fc.assert(
      fc.property(fc.array(statusArb, { minLength: 1, maxLength: 10 }), fc.nat(9), statusArb, (statuses, i, to) => {
        const data = page(statuses)
        const next = applyStatusChange(data, `r${i % statuses.length}`, to)
        const count = (s: ReportStatus) => next.reports.filter((r) => r.status === s).length
        return (
          next.stats.total === data.stats.total &&
          next.stats.valid === count('valid') &&
          next.stats.invalid === count('invalid') &&
          next.stats.unverified === count('unverified')
        )
      }),
    )
  })

  it('does nothing for the same status or an unknown id', () => {
    const data = page(['valid'])
    expect(applyStatusChange(data, 'r0', 'valid')).toBe(data)
    expect(applyStatusChange(data, 'nope', 'invalid')).toBe(data)
  })
})

describe('reportNumber', () => {
  it('continues counting across pages', () => {
    expect(reportNumber(1, 10, 0)).toBe('00001')
    expect(reportNumber(2, 10, 0)).toBe('00011')
    expect(reportNumber(3, 10, 2)).toBe('00023')
  })
})

describe('nextSort', () => {
  it('defaults to newest date first', () => {
    expect(DEFAULT_SORT).toEqual({ column: 'tanggal', dir: 'desc' })
  })

  it('flips the direction of the active column', () => {
    const asc = nextSort(DEFAULT_SORT, 'tanggal')
    expect(asc).toEqual({ column: 'tanggal', dir: 'asc' })
    expect(nextSort(asc, 'tanggal')).toEqual({ column: 'tanggal', dir: 'desc' })
  })

  it('makes a new column the only active one, starting at desc', () => {
    expect(nextSort({ column: 'tanggal', dir: 'asc' }, 'lokasi')).toEqual({ column: 'lokasi', dir: 'desc' })
    expect(nextSort({ column: 'waktu', dir: 'asc' }, 'tanggal')).toEqual({ column: 'tanggal', dir: 'desc' })
  })

  it('sorts Tanggal and Waktu by the same timestamp', () => {
    expect(SORT_FIELD.tanggal).toBe('createdAt')
    expect(SORT_FIELD.waktu).toBe('createdAt')
  })
})
