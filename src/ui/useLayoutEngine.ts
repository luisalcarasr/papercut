/**
 * Hook that drives layout computation.
 * Subscribes ONLY to input fields so that setCells() does not trigger
 * a recompute loop (which would cause infinite re-renders / flicker).
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

/** Selector: only the fields that feed into layout calculation */
function inputSelector(s: ReturnType<typeof useStore.getState>) {
  return {
    sourcesLen:      s.sources.length,
    sourceIds:       s.sources.map(x => x.id).join(','),
    paperId:         s.paperId,
    orientation:     s.orientation,
    targetHeightCm:  s.targetHeightCm,
    tolerancePct:    s.tolerancePct,
    layoutMode:      s.layoutMode,
    gridCols:        s.gridCols,
    gridRows:        s.gridRows,
    gap:             s.gap,
    slotsKey:        JSON.stringify(s.slots),
  }
}

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>) {
  for (const k in a) if (a[k] !== b[k]) return false
  for (const k in b) if (!(k in a)) return false
  return true
}

export function useLayoutEngine() {
  const computeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastInputs = useRef<Record<string, unknown> | null>(null)

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
        const src  = sources[0]
        const half = slots[0]?.half ?? null
        const ratio = effectiveRatio(src, half)
        const layout = twoVertOneHoriz(widthCm, heightCm, ratio, gap, 0, half)
        cells    = layout.cells
        coverage = layout.coverage * 100

      } else if (layoutMode === 'multiRow' && sources.length >= 2) {
        const slotDefs = slots.slice(0, 2).map((s, i) => ({
          sourceIndex: i,
          ratio:       effectiveRatio(sources[i], s.half),
          minCount:    s.minCount,
          half:        s.half,
        }))
        const layout = multiImageRows({
          paperW: widthCm, paperH: heightCm,
          slots: slotDefs, gap,
          targetH: targetHeightCm,
        })
        cells    = layout.cells
        coverage = layout.coverage * 100

      } else if (layoutMode === 'grid') {
        const src  = sources[0]
        const half = slots[0]?.half ?? null
        const ratio = effectiveRatio(src, half)
        const cellW = targetHeightCm * ratio
        const layout = buildGridLayout({
          paperW: widthCm, paperH: heightCm,
          cellW, cellH: targetHeightCm,
          cols: gridCols, rows: gridRows,
        })
        cells    = gridCells(layout, 0, 0, half)
        coverage = layout.coverage * 100

      } else {
        // auto / guillotine
        const pieces = sources.map((src, i) => {
          const half  = slots[i]?.half ?? null
          const ratio = effectiveRatio(src, half)
          return { id: `src-${i}`, ratio, minCount: slots[i]?.minCount ?? 1 }
        })
        const result = optimizeLayout({
          paperW: widthCm, paperH: heightCm,
          targetH: targetHeightCm,
          tolerance: tolerancePct / 100,
          gap, pieces,
          mode: layoutMode === 'guillotine' ? 'guillotine' : 'auto',
        })
        cells = result.placements.map(p => {
          const idx  = parseInt(p.pieceId.replace('src-', ''))
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

  useEffect(() => {
    // Initial compute
    compute()

    // Subscribe only to input-relevant fields to avoid feedback loop
    const unsub = useStore.subscribe(() => {
      const next = inputSelector(useStore.getState()) as Record<string, unknown>
      if (lastInputs.current && shallowEqual(lastInputs.current, next)) return
      lastInputs.current = next

      if (computeTimeout.current) clearTimeout(computeTimeout.current)
      computeTimeout.current = setTimeout(compute, 80)
    })

    return () => {
      unsub()
      if (computeTimeout.current) clearTimeout(computeTimeout.current)
    }
  }, [compute])
}
