import { describe, it, expect } from 'vitest'
import { twoVertOneHoriz, multiImageRows } from '../domain/layout/mixed'

describe('twoVertOneHoriz', () => {
  it('carta 21.59×27.94, ratio 2:3 — 3 cells', () => {
    const layout = twoVertOneHoriz(21.59, 27.94, 2/3, 0.4)
    expect(layout.cells).toHaveLength(3)
    expect(layout.cells[0].rotation).toBe(0)
    expect(layout.cells[2].rotation).toBe(90)
  })

  it('vertical cells have correct ratio', () => {
    const layout = twoVertOneHoriz(21.59, 27.94, 2/3, 0.4)
    const v = layout.cells[0]
    expect(v.widthCm / v.heightCm).toBeCloseTo(2/3, 2)
  })

  it('horizontal cell same scale as vertical', () => {
    const layout = twoVertOneHoriz(21.59, 27.94, 2/3, 0.4)
    const v = layout.cells[0]
    const h = layout.cells[2]
    // H width = V height, H height = V width
    expect(h.widthCm).toBeCloseTo(v.heightCm, 2)
    expect(h.heightCm).toBeCloseTo(v.widthCm, 2)
  })

  it('all cells fit within paper', () => {
    const PW = 21.59, PH = 27.94
    const layout = twoVertOneHoriz(PW, PH, 2/3, 0.4)
    for (const c of layout.cells) {
      expect(c.x + c.widthCm).toBeLessThanOrEqual(PW + 0.01)
      expect(c.y + c.heightCm).toBeLessThanOrEqual(PH + 0.01)
    }
  })
})

describe('multiImageRows', () => {
  it('achieves minCount for slot B', () => {
    const layout = multiImageRows({
      paperW: 27.94, paperH: 43.18,
      slots: [
        { sourceIndex: 0, ratio: 941/1672, minCount: 1, half: null },
        { sourceIndex: 1, ratio: 965/1630, minCount: 7, half: null },
      ],
      gap: 0.4,
    })
    expect(layout.counts[1]).toBeGreaterThanOrEqual(7)
  })
})
