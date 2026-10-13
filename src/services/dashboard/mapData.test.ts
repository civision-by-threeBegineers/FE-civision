import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  filterByTimeRange,
  searchByAddress,
  toMapViolations,
  toMapZones,
  type MapViolation,
} from './mapData'

const NOW = Date.parse('2026-10-11T12:00:00Z')
const HOUR = 60 * 60 * 1000

// Random violations created between 60 days ago and now
const violationArb: fc.Arbitrary<MapViolation> = fc.record({
  id: fc.uuid(),
  lat: fc.double({ min: -90, max: 90, noNaN: true }),
  lng: fc.double({ min: -180, max: 180, noNaN: true }),
  address: fc.option(fc.constantFrom('Jl. Raya Kb. Jeruk', 'Jl. Anggrek Cakra', 'jl. kh. mas mansyur', 'Pasar Tradisional'), { nil: null }),
  status: fc.constantFrom('unverified', 'valid', 'invalid'),
  createdAt: fc.integer({ min: 0, max: 60 * 24 }).map((h) => new Date(NOW - h * HOUR).toISOString()),
  photoUrl: fc.constant(null),
})
const listArb = fc.uniqueArray(violationArb, { selector: (v) => v.id, maxLength: 40 })

describe('filterByTimeRange', () => {
  it('Daily ⊆ Weekly ⊆ Monthly', () => {
    fc.assert(
      fc.property(listArb, (items) => {
        const ids = (r: 'daily' | 'weekly' | 'monthly') => new Set(filterByTimeRange(items, r, NOW).map((v) => v.id))
        const [d, w, m] = [ids('daily'), ids('weekly'), ids('monthly')]
        return [...d].every((id) => w.has(id)) && [...w].every((id) => m.has(id))
      }),
    )
  })

  it('uses 24 h / 7 d / 30 d windows and drops missing dates', () => {
    const at = (h: number, id: string): MapViolation => ({
      id, lat: 0, lng: 0, address: null, status: 'valid', createdAt: new Date(NOW - h * HOUR).toISOString(), photoUrl: null,
    })
    const items = [at(23, 'a'), at(25, 'b'), at(24 * 8, 'c'), at(24 * 31, 'd'), { ...at(1, 'e'), createdAt: null }]
    expect(filterByTimeRange(items, 'daily', NOW).map((v) => v.id)).toEqual(['a'])
    expect(filterByTimeRange(items, 'weekly', NOW).map((v) => v.id)).toEqual(['a', 'b'])
    expect(filterByTimeRange(items, 'monthly', NOW).map((v) => v.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('searchByAddress', () => {
  it('only returns members whose address contains the query (case-insensitive)', () => {
    fc.assert(
      fc.property(listArb, fc.string({ minLength: 1, maxLength: 6 }), (items, q) => {
        const results = searchByAddress(items, q)
        const needle = q.trim().toLowerCase()
        return results.every((r) => items.includes(r) && r.address !== null && r.address.toLowerCase().includes(needle))
      }),
    )
  })

  it('adding characters only narrows the results', () => {
    fc.assert(
      fc.property(listArb, fc.constantFrom('j', 'jl', 'a', 'ra', 'kb'), fc.string({ maxLength: 3 }), (items, q, extra) => {
        const before = new Set(searchByAddress(items, q).map((v) => v.id))
        return searchByAddress(items, q + extra).every((v) => before.has(v.id))
      }),
    )
  })

  it('ignores null addresses and empty queries', () => {
    const items: MapViolation[] = [
      { id: '1', lat: 0, lng: 0, address: null, status: 'valid', createdAt: null, photoUrl: null },
      { id: '2', lat: 0, lng: 0, address: 'Jl. Anggrek', status: 'valid', createdAt: null, photoUrl: null },
    ]
    expect(searchByAddress(items, '  ')).toEqual([])
    expect(searchByAddress(items, 'ANGG').map((v) => v.id)).toEqual(['2'])
  })
})

describe('toMapZones', () => {
  it('flips [lng, lat] to [lat, lng] and drops unusable zones', () => {
    const json = {
      ok: true,
      zones: [
        { id: 'z1', name: 'Zona A', points: [[106.76, -6.19], [106.775, -6.19], [106.775, -6.2], [106.76, -6.2]] },
        { id: 'z2', name: 'Kurang titik', points: [[106.76, -6.19], [106.775, -6.19]] },
        { id: 'z3', name: '', points: [[106.76, -6.19], ['x', 1], [106.775, -6.19], [106.775, -6.2]] },
      ],
    }
    expect(toMapZones(json)).toEqual([
      { id: 'z1', name: 'Zona A', positions: [[-6.19, 106.76], [-6.19, 106.775], [-6.2, 106.775], [-6.2, 106.76]] },
      { id: 'z3', name: 'Zona terlarang', positions: [[-6.19, 106.76], [-6.19, 106.775], [-6.2, 106.775]] },
    ])
  })
})

describe('toMapViolations', () => {
  it('maps the dashboard markers and drops invalid coordinates', () => {
    const json = {
      ok: true,
      markers: [
        { id: 'a', lat: -6.2, lng: 106.78, status: 'valid', popup: { time: '2026-10-10T01:00:00Z', address: 'Jl. A', evidenceUrl: null } },
        { id: 'b', lat: 'x', lng: 106.78, status: 'valid', popup: {} },
        { id: 'c', lat: 91, lng: 0, status: 'valid', popup: {} },
        { id: 'd', lat: 1, lng: 2, status: 'unverified', analysis: { media: { storagePath: 'https://cdn/x.jpg' } } },
      ],
    }
    expect(toMapViolations(json)).toEqual([
      { id: 'a', lat: -6.2, lng: 106.78, address: 'Jl. A', status: 'valid', createdAt: '2026-10-10T01:00:00Z', photoUrl: null },
      { id: 'd', lat: 1, lng: 2, address: null, status: 'unverified', createdAt: null, photoUrl: 'https://cdn/x.jpg' },
    ])
  })

  it('rejects a response without a marker list', () => {
    expect(() => toMapViolations({ ok: true })).toThrow()
  })
})
