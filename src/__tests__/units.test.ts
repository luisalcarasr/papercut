import { describe, it, expect } from 'vitest'
import { cmToPx, pxToCm, cmToIn, inToCm, cmToPt } from '../domain/units'

describe('units', () => {
  it('cmToPx at 300 DPI', () => {
    expect(cmToPx(2.54)).toBeCloseTo(300, 0)
  })
  it('pxToCm round-trip', () => {
    expect(pxToCm(cmToPx(14))).toBeCloseTo(14, 3)
  })
  it('cmToIn', () => {
    expect(cmToIn(2.54)).toBeCloseTo(1, 5)
  })
  it('inToCm', () => {
    expect(inToCm(1)).toBeCloseTo(2.54, 5)
  })
  it('cmToPt (1 cm = 28.346 pt)', () => {
    expect(cmToPt(1)).toBeCloseTo(28.346, 1)
  })
})
