/** Layout report — coverage, counts, dimensions */

import type { GridCell } from './layout/grid'
import type { MixedCell } from './layout/mixed'

type AnyCell = GridCell | MixedCell

export interface LayoutReport {
  totalPieces: number
  countsPerSource: Record<number, number>
  coveragePct: number
  /** cm² of paper used by images */
  usedAreaCm2: number
  paperAreaCm2: number
  /** Unique piece sizes on the sheet */
  pieceSizes: Array<{ widthCm: number; heightCm: number; count: number }>
}

export function buildReport(cells: AnyCell[], paperW: number, paperH: number): LayoutReport {
  const paperAreaCm2 = paperW * paperH
  const usedAreaCm2 = cells.reduce((s, c) => s + c.widthCm * c.heightCm, 0)
  const coveragePct = (usedAreaCm2 / paperAreaCm2) * 100

  const countsPerSource: Record<number, number> = {}
  for (const c of cells) {
    countsPerSource[c.sourceIndex] = (countsPerSource[c.sourceIndex] || 0) + 1
  }

  // Group by unique dimensions (rounded to 1 decimal)
  const sizeMap = new Map<string, { widthCm: number; heightCm: number; count: number }>()
  for (const c of cells) {
    const k = `${c.widthCm.toFixed(1)}x${c.heightCm.toFixed(1)}`
    if (sizeMap.has(k)) sizeMap.get(k)!.count++
    else sizeMap.set(k, { widthCm: c.widthCm, heightCm: c.heightCm, count: 1 })
  }

  return {
    totalPieces: cells.length,
    countsPerSource,
    coveragePct,
    usedAreaCm2,
    paperAreaCm2,
    pieceSizes: Array.from(sizeMap.values()),
  }
}
