import { describe, it, expect } from 'vitest'
import { packMultiImage } from '../domain/layout/multiImage'

const PW = 27.94  // Tabloid portrait
const PH = 43.18
const GAP = 0.4

// Vertical 2:3 image
const V = { sourceIndex: 0, ratio: 2/3, half: null as null, heightCm: 14, countMode: 'fill' as const }
// Horizontal 3:2 image
const H = { sourceIndex: 1, ratio: 3/2, half: null as null, heightCm: 10, countMode: 'fill' as const }

describe('packMultiImage', () => {
  it('single image fill — places multiple copies', () => {
    const result = packMultiImage({ paperW: PW, paperH: PH, gap: GAP, slots: [V] })
    expect(result.cells.length).toBeGreaterThan(0)
    expect(result.coverage).toBeGreaterThan(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('all cells fit within paper bounds', () => {
    const result = packMultiImage({ paperW: PW, paperH: PH, gap: GAP, slots: [V, H] })
    for (const c of result.cells) {
      expect(c.x).toBeGreaterThanOrEqual(0)
      expect(c.y).toBeGreaterThanOrEqual(0)
      expect(c.x + c.widthCm).toBeLessThanOrEqual(PW + 0.01)
      expect(c.y + c.heightCm).toBeLessThanOrEqual(PH + 0.01)
    }
  })

  it('exact count — places exactly N copies', () => {
    const slot = { ...V, countMode: 'exact' as const, count: 3 }
    const result = packMultiImage({ paperW: PW, paperH: PH, gap: GAP, slots: [slot] })
    expect(result.counts[0]).toBe(3)
    expect(result.cells.filter(c => c.sourceIndex === 0)).toHaveLength(3)
  })

  it('exact count exceeding capacity — warns and truncates', () => {
    const slot = { ...V, countMode: 'exact' as const, count: 9999 }
    const result = packMultiImage({ paperW: PW, paperH: PH, gap: GAP, slots: [slot] })
    expect(result.warnings.length).toBeGreaterThan(0)
    // Should still produce cells without crashing
    expect(result.cells.length).toBeGreaterThan(0)
  })

  it('percent mode — places roughly proportional counts', () => {
    const s1 = { ...V, sourceIndex: 0, countMode: 'percent' as const, percent: 70 }
    const s2 = { ...H, sourceIndex: 1, countMode: 'percent' as const, percent: 30 }
    const result = packMultiImage({ paperW: PW, paperH: PH, gap: GAP, slots: [s1, s2] })
    // Image 0 (70%) should have more copies than image 1 (30%)
    expect(result.counts[0]).toBeGreaterThanOrEqual(result.counts[1])
  })

  it('mixed exact + fill — exact slot respected', () => {
    const exact = { ...V, sourceIndex: 0, countMode: 'exact' as const, count: 2 }
    const fill  = { ...H, sourceIndex: 1, countMode: 'fill' as const }
    const result = packMultiImage({ paperW: PW, paperH: PH, gap: GAP, slots: [exact, fill] })
    expect(result.counts[0]).toBe(2)
    expect(result.counts[1]).toBeGreaterThan(0)
  })

  it('empty slots — returns empty result', () => {
    const result = packMultiImage({ paperW: PW, paperH: PH, gap: GAP, slots: [] })
    expect(result.cells).toHaveLength(0)
    expect(result.coverage).toBe(0)
  })

  it('image wider than usable width — zero copies, no crash', () => {
    const wide = { sourceIndex: 0, ratio: 10, half: null as null, heightCm: 14, countMode: 'fill' as const }
    const result = packMultiImage({ paperW: PW, paperH: PH, gap: GAP, slots: [wide] })
    expect(result.cells).toHaveLength(0)
  })

  it('per-image custom height respected', () => {
    const tall = { ...V, heightCm: 20 }
    const result = packMultiImage({ paperW: PW, paperH: PH, gap: GAP, slots: [tall] })
    for (const c of result.cells) {
      expect(c.heightCm).toBeCloseTo(20, 1)
    }
  })

  it('coverage is between 0 and 1', () => {
    const result = packMultiImage({ paperW: PW, paperH: PH, gap: GAP, slots: [V, H] })
    expect(result.coverage).toBeGreaterThanOrEqual(0)
    expect(result.coverage).toBeLessThanOrEqual(1)
  })
})
