import { describe, it, expect } from 'vitest'
import { getPaper, paperDimensions, bestOrientation } from '../domain/paper'

describe('paper catalogue', () => {
  it('finds A3 by id', () => {
    const p = getPaper('A3')
    expect(p).toBeDefined()
    expect(p!.widthCm).toBeCloseTo(29.7, 1)
    expect(p!.heightCm).toBeCloseTo(42.0, 1)
  })

  it('Tabloid dimensions', () => {
    const p = getPaper('ANSI-B')
    expect(p!.widthCm).toBeCloseTo(27.94, 2)
    expect(p!.heightCm).toBeCloseTo(43.18, 2)
  })

  it('landscape swaps dimensions', () => {
    const p = getPaper('A3')!
    const d = paperDimensions(p, 'landscape')
    expect(d.widthCm).toBeCloseTo(42.0, 1)
    expect(d.heightCm).toBeCloseTo(29.7, 1)
  })

  it('bestOrientation prefers portrait for tall block', () => {
    const p = getPaper('A3')!
    const o = bestOrientation(p, 10, 30)
    expect(o).toBe('portrait')
  })
})
