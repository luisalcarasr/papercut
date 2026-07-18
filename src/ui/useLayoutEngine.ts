/**
 * Hook that drives layout computation via Web Worker.
 * Listens to store changes and dispatches compute jobs.
 */

import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '../state/store'
import { getPaper, paperDimensions } from '../domain/paper'
import { effectiveRatio } from '../domain/piece'
import { twoVertOneHoriz, multiImageRows } from '../domain/layout/mixed'
import { buildGridLayout, gridCells } from '../domain/layout/grid'
import { optimizeLayout } from '../domain/layout/optimize'
import type { MixedCell } from '../domain/layout/mixed'
import type { GridCell } from '../domain/layout/grid'

export function useLayoutEngine() {
  const computeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const compute = useCallback(() => {
    const {
      sources, paperId, orientation, targetHeightCm, tolerancePct,
      layoutMode, gridCols, gridRows, gap, slots,
      setCells,
    } = useStore.getState()

    if (sources.length === 0) {
      setCells([], 0)
      return
    }

    const paper = getPaper(paperId)
    if (!paper) return

    const orient = orientation === 'auto' ? 'portrait' : orientation
    const { widthCm, heightCm } = paperDimensions(paper, orient)

    try {
      let cells: (GridCell | MixedCell)[] = []
      let coverage = 0

      if (layoutMode === 'twoVertOneH' && sources.length >= 1) {
        const src = sources[0]
        const half = slots[0]?.half ?? null
        const ratio = effectiveRatio(src, half)
        const layout = twoVertOneHoriz(widthCm, heightCm, ratio, gap, 0, half)
        cells = layout.cells
        coverage = layout.coverage * 100

      } else if (layoutMode === 'multiRow' && sources.length >= 2) {
        const slotDefs = slots.slice(0, 2).map((s, i) => ({
          sourceIndex: i,
          ratio: effectiveRatio(sources[i], s.half),
          minCount: s.minCount,
          half: s.half,
        }))
        const layout = multiImageRows({
          paperW: widthCm, paperH: heightCm,
          slots: slotDefs,
          gap,
          targetH: targetHeightCm,
        })
        cells = layout.cells
        coverage = layout.coverage * 100

      } else if (layoutMode === 'grid') {
        const src = sources[0]
        const half = slots[0]?.half ?? null
        const ratio = effectiveRatio(src, half)
        const cellW = targetHeightCm * ratio
        const cellH = targetHeightCm
        const layout = buildGridLayout({ paperW: widthCm, paperH: heightCm, cellW, cellH, cols: gridCols, rows: gridRows })
        cells = gridCells(layout, 0, 0, half)
        coverage = layout.coverage * 100

      } else {
        // auto / guillotine: optimise for each source or mixed
        const pieces = sources.map((src, i) => {
          const half = slots[i]?.half ?? null
          const ratio = effectiveRatio(src, half)
          return { id: `src-${i}`, ratio, minCount: slots[i]?.minCount ?? 1 }
        })

        const result = optimizeLayout({
          paperW: widthCm, paperH: heightCm,
          targetH: targetHeightCm,
          tolerance: tolerancePct / 100,
          gap,
          pieces,
          mode: layoutMode === 'guillotine' ? 'guillotine' : 'auto',
        })

        cells = result.placements.map(p => {
          const idx = parseInt(p.pieceId.replace('src-', ''))
          const half = slots[idx]?.half ?? null
          return {
            x: p.x, y: p.y, widthCm: p.widthCm, heightCm: p.heightCm,
            sourceIndex: idx, rotation: 0 as const, half,
          }
        })
        coverage = result.coverage * 100
      }

      setCells(cells, coverage)
    } catch (e) {
      console.error('Layout engine error:', e)
    }
  }, [])

  // Debounce recompute on any relevant state change
  useEffect(() => {
    const unsub = useStore.subscribe(() => {
      if (computeTimeout.current) clearTimeout(computeTimeout.current)
      computeTimeout.current = setTimeout(compute, 120)
    })
    compute()
    return unsub
  }, [compute])
}
