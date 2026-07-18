/**
 * Optimiser: find the best height (and layout) that maximises piece count
 * while meeting minimum copy requirements and staying near a target height.
 */

import { guillotinoPlace } from './guillotine'
import type { PlacedPiece, PieceType } from './guillotine'
import { maxFitGrid } from './grid'
import type { GridCell } from './grid'

export interface OptimizeInput {
  paperW: number
  paperH: number
  /** Target height in cm (0 = auto) */
  targetH: number
  /** Tolerance around targetH (±%). 0 = exact, 0.1 = ±10% */
  tolerance: number
  gap: number
  /** Pieces to pack: ratio (w/h) and min copies each */
  pieces: Array<{
    id: string
    ratio: number
    minCount: number
  }>
  mode: 'grid' | 'guillotine' | 'auto'
}

export interface OptimizeResult {
  heightCm: number
  placements: Array<{
    pieceId: string
    x: number
    y: number
    widthCm: number
    heightCm: number
  }>
  counts: Record<string, number>
  coverage: number
  totalCount: number
}

/**
 * Find the optimal height and placement.
 * Scans heights from targetH*(1+tol) down to targetH*(1-tol).
 */
export function optimizeLayout(input: OptimizeInput): OptimizeResult {
  const { paperW, paperH, gap, pieces, mode } = input
  const uw = paperW - 2 * gap
  const uh = paperH - 2 * gap

  const hTarget = input.targetH > 0 ? input.targetH : uh / 3
  const hMax = input.targetH > 0 ? hTarget * (1 + input.tolerance + 0.05) : uh
  const hMin = input.targetH > 0 ? hTarget * Math.max(0.5, 1 - input.tolerance - 0.05) : 3

  let best: OptimizeResult | null = null

  for (let h = Math.min(hMax, uh); h >= hMin; h -= 0.05) {
    const types: PieceType[] = pieces.map(p => ({
      id: p.id,
      widthCm: h * p.ratio,
      heightCm: h,
    })).filter(t => t.widthCm <= uw + 1e-9)

    if (types.length === 0) continue

    let placements: PlacedPiece[] = []
    let totalCount = 0

    if (mode === 'grid' || (mode === 'auto' && pieces.length === 1)) {
      // Simple grid for single piece type
      const t = types[0]
      const { cols, rows } = maxFitGrid(uw, uh, t.widthCm, t.heightCm, gap)
      totalCount = cols * rows
      if (totalCount === 0) continue
      const gapX = (paperW - cols * t.widthCm) / (cols + 1)
      const gapY = (paperH - rows * t.heightCm) / (rows + 1)
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          placements.push({ pieceId: t.id, x: gapX + c*(t.widthCm+gapX), y: gapY + r*(t.heightCm+gapY), widthCm: t.widthCm, heightCm: t.heightCm })
    } else {
      // Guillotine packer
      placements = guillotinoPlace(uw, uh, gap, gap, types, gap)
      totalCount = placements.length
    }

    // Check minimums
    const counts: Record<string, number> = {}
    for (const p of pieces) counts[p.id] = 0
    for (const pl of placements) counts[pl.pieceId] = (counts[pl.pieceId] || 0) + 1
    const meetsMin = pieces.every(p => counts[p.id] >= p.minCount)
    if (!meetsMin) continue

    const usedArea = placements.reduce((s, p) => s + p.widthCm * p.heightCm, 0)
    const coverage = usedArea / (paperW * paperH)

    // Prefer more pieces; if equal prefer closer to target height
    const isBetter = !best
      || totalCount > best.totalCount
      || (totalCount === best.totalCount && Math.abs(h - hTarget) < Math.abs(best.heightCm - hTarget))

    if (isBetter) {
      best = { heightCm: h, placements, counts, coverage, totalCount }
    }
  }

  return best ?? { heightCm: hTarget, placements: [], counts: {}, coverage: 0, totalCount: 0 }
}

/** Convert optimiser placements to GridCell format */
export function placementsToGridCells(
  placements: OptimizeResult['placements'],
  sourceIndexMap: Record<string, number>,
  halfMap: Record<string, 'left'|'right'|null>,
): GridCell[] {
  return placements.map(p => ({
    x: p.x,
    y: p.y,
    widthCm: p.widthCm,
    heightCm: p.heightCm,
    sourceIndex: sourceIndexMap[p.pieceId] ?? 0,
    rotation: 0 as const,
    half: halfMap[p.pieceId] ?? null,
  }))
}
