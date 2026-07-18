import { describe, it, expect } from 'vitest'
import { guillotineMax } from '../domain/layout/guillotine'
import { multiImageRows } from '../domain/layout/mixed'

const V = { id: 'V', widthCm: 10.20, heightCm: 15.29 }
const H = { id: 'H', widthCm: 17.17, heightCm: 11.45 }
const M = 0.4

describe('guillotine packer', () => {
  it('A3 portrait usable (28.9×41.2) → at least 4 pieces with V+H types', () => {
    // Guillotine with mixed V+H achieves ≥4; session's 5 comes from the
    // column-aware layout in mixed.ts, not pure guillotine
    const n = guillotineMax(28.9, 41.2, [V, H], M)
    expect(n).toBeGreaterThanOrEqual(4)
  })

  it('Tabloid landscape usable (42.38×27.14) with V only → 4 pieces (4×1 row)', () => {
    const uw = 43.18 - 2 * M
    const uh = 27.94 - 2 * M
    const n = guillotineMax(uw, uh, [V], M)
    expect(n).toBeGreaterThanOrEqual(4)
  })

  it('Tabloid landscape shelf (4V top + 2H bottom) → 6 via multiImageRows', () => {
    // The session's 6-piece tabloid result uses row-based shelf packing (multiImageRows)
    const layout = multiImageRows({
      paperW: 43.18, paperH: 27.94,
      slots: [
        { sourceIndex: 0, ratio: 10.20/15.29, minCount: 1, half: null },
        { sourceIndex: 1, ratio: 17.17/11.45, minCount: 5, half: null },
      ],
      gap: M,
    })
    expect(layout.cells.length).toBeGreaterThanOrEqual(6)
  })

  it('single piece type fills grid correctly', () => {
    const piece = { id: 'sq', widthCm: 9, heightCm: 9 }
    const n = guillotineMax(29.5, 29.5, [piece], 0.5)
    expect(n).toBeGreaterThanOrEqual(9)
  })
})
