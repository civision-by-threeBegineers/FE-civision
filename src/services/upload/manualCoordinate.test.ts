import { describe, expect, it } from 'vitest'
import { isWithinRegion, parseLatLon } from './manualCoordinate'

describe('parseLatLon', () => {
  it('reads common formats', () => {
    expect(parseLatLon('-6.2018, 106.7829')).toEqual({ lat: -6.2018, lon: 106.7829 })
    expect(parseLatLon('  -6.2018 106.7829 ')).toEqual({ lat: -6.2018, lon: 106.7829 })
    expect(parseLatLon('-6.2018;106.7829')).toEqual({ lat: -6.2018, lon: 106.7829 })
  })

  it('rejects text it cannot read and out-of-range numbers', () => {
    expect(parseLatLon('')).toBeNull()
    expect(parseLatLon('Jl. Anggrek')).toBeNull()
    expect(parseLatLon('-6.2018')).toBeNull()
    expect(parseLatLon('91, 10')).toBeNull()
    expect(parseLatLon('10, 181')).toBeNull()
  })
})

describe('isWithinRegion', () => {
  it('accepts Jakarta and rejects places outside Indonesia', () => {
    expect(isWithinRegion({ lat: -6.2018, lon: 106.7829 })).toBe(true)
    expect(isWithinRegion({ lat: 51.5, lon: -0.12 })).toBe(false)
  })
})
