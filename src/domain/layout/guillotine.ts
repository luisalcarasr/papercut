/**
 * 2D Guillotine packer.
 * Finds the maximum number of pieces (potentially two sizes: V and H)
 * that fit in a region using recursive guillotine cuts.
 *
 * Validated cases from session:
 *   A3 portrait, V=10.20×15.29, H=17.17×11.45, M=0.4 → 5 pieces
 *   Tabloid landscape, same sizes, M=0.4            → 6 pieces
 */

export interface PieceType {
  id: string
  widthCm: number
  heightCm: number
}

export interface PlacedPiece {
  pieceId: string
  x: number
  y: number
  widthCm: number
  heightCm: number
}

/** Scale factor for integer arithmetic (avoids float precision issues) */
const SC = 10

/**
 * Maximum pieces from `types` that fit in region w×h with gap `gap`.
 * Uses integer-scaled memoized recursive guillotine cuts (matches Python impl).
 */
export function guillotineMax(
  w: number,
  h: number,
  types: PieceType[],
  gap: number,
): number {
  const cache = new Map<string, number>()
  const gi = Math.round(gap * SC)
  const iTypes = types.map(t => ({
    id: t.id,
    wi: Math.round(t.widthCm * SC),
    hi: Math.round(t.heightCm * SC),
  }))

  function bestFit(w: number, h: number): number {
    const k = `${w}|${h}`
    if (cache.has(k)) return cache.get(k)!
    let best = 0
    for (const t of iTypes) {
      if (t.wi <= w && t.hi <= h) {
        const rw = w - t.wi - gi
        const bh = h - t.hi - gi
        const optA = 1
          + (rw > 0 ? bestFit(rw, h) : 0)
          + (bh > 0 ? bestFit(t.wi, bh) : 0)
        best = Math.max(best, optA)
        const optB = 1
          + (rw > 0 ? bestFit(rw, t.hi) : 0)
          + (bh > 0 ? bestFit(w, bh) : 0)
        best = Math.max(best, optB)
      }
    }
    cache.set(k, best)
    return best
  }

  return bestFit(Math.round(w * SC), Math.round(h * SC))
}

/**
 * Build actual placements (greedy, same cut logic as guillotineMax).
 * Returns placements in cm coordinates.
 */
export function guillotinoPlace(
  w: number,
  h: number,
  ox: number,
  oy: number,
  types: PieceType[],
  gap: number,
): PlacedPiece[] {
  const cache = new Map<string, number>()
  const gi = Math.round(gap * SC)
  const iTypes = types.map(t => ({
    id: t.id,
    wi: Math.round(t.widthCm * SC),
    hi: Math.round(t.heightCm * SC),
    widthCm: t.widthCm,
    heightCm: t.heightCm,
  }))

  function bestFit(w: number, h: number): number {
    const k = `${w}|${h}`
    if (cache.has(k)) return cache.get(k)!
    let best = 0
    for (const t of iTypes) {
      if (t.wi <= w && t.hi <= h) {
        const rw = w - t.wi - gi
        const bh = h - t.hi - gi
        const a = 1 + (rw > 0 ? bestFit(rw, h) : 0) + (bh > 0 ? bestFit(t.wi, bh) : 0)
        const b = 1 + (rw > 0 ? bestFit(rw, t.hi) : 0) + (bh > 0 ? bestFit(w, bh) : 0)
        best = Math.max(best, a, b)
      }
    }
    cache.set(k, best)
    return best
  }

  const placed: PlacedPiece[] = []

  function place(w: number, h: number, ox: number, oy: number): void {
    let bestN = 0, bestType: typeof iTypes[0] | null = null, bestCutB = false
    for (const t of iTypes) {
      if (t.wi <= w && t.hi <= h) {
        const rw = w - t.wi - gi, bh = h - t.hi - gi
        const nA = 1 + (rw > 0 ? bestFit(rw, h) : 0) + (bh > 0 ? bestFit(t.wi, bh) : 0)
        if (nA > bestN) { bestN = nA; bestType = t; bestCutB = false }
        const nB = 1 + (rw > 0 ? bestFit(rw, t.hi) : 0) + (bh > 0 ? bestFit(w, bh) : 0)
        if (nB > bestN) { bestN = nB; bestType = t; bestCutB = true }
      }
    }
    if (!bestType) return
    const t = bestType
    placed.push({ pieceId: t.id, x: ox, y: oy, widthCm: t.widthCm, heightCm: t.heightCm })
    const rw = w - t.wi - gi, bh = h - t.hi - gi
    if (bestCutB) {
      if (rw > 0) place(rw, t.hi, ox + t.widthCm + gap, oy)
      if (bh > 0) place(w, bh, ox, oy + t.heightCm + gap)
    } else {
      if (rw > 0) place(rw, h, ox + t.widthCm + gap, oy)
      if (bh > 0) place(t.wi, bh, ox, oy + t.heightCm + gap)
    }
  }

  place(Math.round(w * SC), Math.round(h * SC), ox, oy)
  return placed
}
