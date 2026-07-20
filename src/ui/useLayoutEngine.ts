/**
 * Hook that drives layout computation.
 * Subscribes ONLY to input fields so that setCells() does not trigger
 * a recompute loop (which would cause infinite re-renders / flicker).
 */

import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '../state/store'
import { getPaper, paperDimensions } from '../domain/paper'
import { effectiveRatio } from '../domain/piece'
import { twoVertOneHoriz } from '../domain/layout/mixed'
import { buildGridLayout, gridCells } from '../domain/layout/grid'
import { optimizeLayout } from '../domain/layout/optimize'
import { packMultiImage } from '../domain/layout/multiImage'
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
  const lastInputs     = useRef<Record<string, unknown> | null>(null)

  const compute = useCallback(() => {
    const {
      sources, paperId, orientation, targetHeightCm, tolerancePct,
      layoutMode, gridCols, gridRows, gap, slots,
      ensureSlots, setCells,
    } = useStore.getState()

    // Keep slots in sync with sources (no-op if already correct)
    ensureSlots()

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

      // ── 2V + 1H ──────────────────────────────────────────────────────────
      if (layoutMode === 'twoVertOneH' && sources.length >= 1) {
        const src   = sources[0]
        const slot  = slots[0]
        const half  = slot?.half ?? null
        const ratio = effectiveRatio(src, half)
        const layout = twoVertOneHoriz(widthCm, heightCm, ratio, gap, 0, half)
        cells    = layout.cells
        coverage = layout.coverage * 100

      // ── Grid NxM ─────────────────────────────────────────────────────────
      } else if (layoutMode === 'grid') {
        const src   = sources[0]
        const slot  = slots[0]
        const half  = slot?.half ?? null
        const h     = slot?.sizeMode === 'height' && slot.heightCm ? slot.heightCm : targetHeightCm
        const ratio = effectiveRatio(src, half)
        const layout = buildGridLayout({
          paperW: widthCm, paperH: heightCm,
          cellW: h * ratio, cellH: h,
          cols: gridCols, rows: gridRows,
        })
        cells    = gridCells(layout, 0, 0, half)
        coverage = layout.coverage * 100

      // ── Multi-image (N images, per-image size/count) ──────────────────────
      } else if (layoutMode === 'multiImage') {
        const multiSlots = sources.map((src, i) => {
          const slot  = slots[i] ?? {}
          const half  = slot.half ?? null
          const ratio = effectiveRatio(src, half)
          const h     = slot.sizeMode === 'height' && slot.heightCm
            ? slot.heightCm
            : targetHeightCm
          return {
            sourceIndex: i,
            ratio,
            half,
            heightCm:  h,
            countMode: slot.countMode ?? 'fill' as const,
            count:     slot.count,
            percent:   slot.percent,
          }
        })
        const result = packMultiImage({ paperW: widthCm, paperH: heightCm, gap, slots: multiSlots })
        cells    = result.cells
        coverage = result.coverage * 100

      // ── Auto / Guillotine ─────────────────────────────────────────────────
      } else {
        const pieces = sources.map((src, i) => {
          const slot  = slots[i] ?? {}
          const half  = slot.half ?? null
          const ratio = effectiveRatio(src, half)
          const h     = slot.sizeMode === 'height' && slot.heightCm
            ? slot.heightCm
            : targetHeightCm
          // Convert per-image height into a fixed ratio for the optimizer
          // by using the ratio directly; the optimizer uses targetH as height
          return {
            id:       `src-${i}`,
            ratio,
            minCount: slot.countMode === 'exact' ? (slot.count ?? 1) : 1,
            heightCm: h,
          }
        })

        if (pieces.length === 1) {
          // Single image: fast grid path
          const p    = pieces[0]
          const h    = p.heightCm
          const result = optimizeLayout({
            paperW: widthCm, paperH: heightCm,
            targetH: h, tolerance: tolerancePct / 100,
            gap, pieces: [{ id: p.id, ratio: p.ratio, minCount: 1 }],
            mode: layoutMode === 'guillotine' ? 'guillotine' : 'auto',
          })
          cells = result.placements.map(pl => {
            const idx  = parseInt(pl.pieceId.replace('src-', ''))
            const half = slots[idx]?.half ?? null
            return { x: pl.x, y: pl.y, widthCm: pl.widthCm, heightCm: pl.heightCm, sourceIndex: idx, rotation: 0 as const, half }
          })
          coverage = result.coverage * 100
        } else {
          // Multi-image auto: delegate to packMultiImage with fill counts
          const multiSlots = pieces.map((p, i) => ({
            sourceIndex: i,
            ratio:       p.ratio,
            half:        slots[i]?.half ?? null,
            heightCm:    p.heightCm,
            countMode:   (slots[i]?.countMode ?? 'fill') as 'fill' | 'exact' | 'percent',
            count:       slots[i]?.count,
            percent:     slots[i]?.percent,
          }))
          const result = packMultiImage({ paperW: widthCm, paperH: heightCm, gap, slots: multiSlots })
          cells    = result.cells
          coverage = result.coverage * 100
        }
      }

      setCells(cells, coverage)
    } catch (e) {
      console.error('Layout engine error:', e)
    }
  }, [])

  useEffect(() => {
    compute()

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
