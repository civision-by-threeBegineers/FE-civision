import { describe, expect, it } from 'vitest'
import { formatAccuracy, formatCoordinate } from './deviceLocation'

describe('deviceLocation formatting', () => {
  it('prints coordinates with 5 decimals, like the backend response', () => {
    expect(formatCoordinate(-6.2018, 106.7829)).toBe('-6.20180, 106.78290')
  })

  it('shows meters below 1 km and kilometers above', () => {
    expect(formatAccuracy(12.4)).toBe('±12 m')
    expect(formatAccuracy(999)).toBe('±999 m')
    expect(formatAccuracy(1500)).toBe('±1.5 km')
  })
})
