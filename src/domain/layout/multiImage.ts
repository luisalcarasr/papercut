/**
 * packMultiImage — general N-image shelf packer.
 *
 * Supports per-image:
 *   - height:    'inherit' (global) | own heightCm
 *   - count:     'fill' | 'exact' N | 'percent' %
 *
 * Algorithm:
 *   1. Resolve each image's height.
 *   2. Resolve counts:
 *      a. exact  → fixed copies
 *      b. percent → share of usable area proportional to %
 *      c. fill   → split remaining capacity equally
 *   3. Shelf-pack: group images into rows by height, fill rows
 *      left-to-right centring each row, move to next row when full.
 *   4. Return placed cells + per-source counts + coverage.
 */

import type { MixedCell } from './mixed'

export interface MultiImageSlot {
  sourceIndex: number
  ratio:       number        // w/h (effective, after half-split)
  half:        'left' | 'right' | null
  heightCm:    number        // resolved height (already applied inherit/own)
  countMode:   'fill' | 'exact' | 'percent'
  count?:      number        // for 'exact'
  percent?:    number        // for 'percent' (0-100)
}

export interface MultiImageResult {
  cells:       MixedCell[]
  counts:      number[]      // index = sourceIndex
  coverage:    number        // 0-1
  warnings:    string[]      // e.g. "Image 2 exact count truncated from 5 to 3"
}

export function packMultiImage(opts: {
  paperW:  number
  paperH:  number
  gap:     number
  slots:   MultiImageSlot[]
}): MultiImageResult {
  const { paperW, paperH, gap, slots } = opts
  if (slots.length === 0) {
    return { cells: [], counts: [], coverage: 0, warnings: [] }
  }

  const uw = paperW - 2 * gap   // usable width
  const uh = paperH - 2 * gap   // usable height
  const warnings: string[] = []

  // ── Step 1: compute capacity per height group ──────────────────────────
  // Build "capacity": how many of each slot fit given the sheet dimensions.
  // Capacity per slot = max pieces ignoring other slots (upper bound).
  function slotCapacity(s: MultiImageSlot): number {
    const w = s.heightCm * s.ratio
    if (w > uw + 1e-9) return 0
    const cols = Math.max(1, Math.floor((uw + gap) / (w + gap)))
    const rows = Math.max(1, Math.floor((uh + gap) / (s.heightCm + gap)))
    return cols * rows
  }

  // ── Step 2: resolve target counts ────────────────────────────────────────
  // Separate slots by mode.
  const exactSlots   = slots.filter(s => s.countMode === 'exact')
  const percentSlots = slots.filter(s => s.countMode === 'percent')
  const fillSlots    = slots.filter(s => s.countMode === 'fill')

  // Total area budget (in cell-units, using a simple area model)
  const paperArea = uw * uh

  // Resolved counts map (sourceIndex → target count)
  const resolved = new Map<number, number>()

  // Exact slots: place them as-is, but cap at capacity.
  for (const s of exactSlots) {
    const cap = slotCapacity(s)
    const want = s.count ?? 1
    if (want > cap && cap > 0) {
      warnings.push(`Image #${s.sourceIndex + 1}: exact count ${want} exceeds capacity (${cap}); using ${cap}`)
    }
    resolved.set(s.sourceIndex, Math.min(want, cap))
  }

  // Area consumed by exact slots
  const exactArea = exactSlots.reduce((sum, s) => {
    const n = resolved.get(s.sourceIndex) ?? 0
    return sum + n * s.heightCm * s.heightCm * s.ratio
  }, 0)
  const remainingArea = Math.max(0, paperArea - exactArea)

  // Percent slots: share of remainingArea
  const totalPct = percentSlots.reduce((sum, s) => sum + (s.percent ?? 0), 0)
  for (const s of percentSlots) {
    const pct = (s.percent ?? 0) / Math.max(totalPct, 100)
    const budget = remainingArea * pct
    const pieceArea = s.heightCm * s.heightCm * s.ratio
    const n = pieceArea > 0 ? Math.max(1, Math.round(budget / pieceArea)) : 1
    const cap = slotCapacity(s)
    resolved.set(s.sourceIndex, Math.min(n, cap))
  }

  // Fill slots: equal share of what's left
  if (fillSlots.length > 0) {
    const usedByPct = percentSlots.reduce((sum, s) => {
      const n = resolved.get(s.sourceIndex) ?? 0
      return sum + n * s.heightCm * s.heightCm * s.ratio
    }, 0)
    const fillBudget = Math.max(0, remainingArea - usedByPct) / fillSlots.length
    for (const s of fillSlots) {
      const pieceArea = s.heightCm * s.heightCm * s.ratio
      const n = pieceArea > 0 ? Math.max(1, Math.round(fillBudget / pieceArea)) : 1
      const cap = slotCapacity(s)
      resolved.set(s.sourceIndex, Math.min(n, cap))
    }
  }

  // ── Step 3: build placement queue (one entry per copy) ──────────────────
  // Expand resolved counts into a flat list: [{slot, copy}...]
  type QueueItem = { slot: MultiImageSlot; widthCm: number }
  const queue: QueueItem[] = []

  for (const s of slots) {
    const n = resolved.get(s.sourceIndex) ?? 0
    const w = s.heightCm * s.ratio
    if (w <= 0 || w > uw + 1e-9) continue
    for (let i = 0; i < n; i++) {
      queue.push({ slot: s, widthCm: w })
    }
  }

  // ── Step 4: shelf-pack ───────────────────────────────────────────────────
  const cells: MixedCell[] = []
  const countResult: number[] = new Array(slots.length > 0
    ? Math.max(...slots.map(s => s.sourceIndex)) + 1
    : 0).fill(0)

  let qi = 0     // queue index
  let y  = gap   // current Y

  while (qi < queue.length && y + queue[qi].slot.heightCm <= paperH - gap + 1e-9) {
    // Determine row height = height of the first item in this row
    const rowH = queue[qi].slot.heightCm

    // Collect items that fit in this row
    const rowItems: QueueItem[] = []
    let rowW = 0
    let qj = qi

    while (qj < queue.length) {
      const item = queue[qj]
      // Allow mixing heights in same row only if they match (same height shelf)
      // Different heights go to different rows
      if (Math.abs(item.slot.heightCm - rowH) > 1e-9) break
      const needed = rowW + item.widthCm + (rowItems.length > 0 ? gap : 0)
      if (needed > uw + 1e-9) break
      rowItems.push(item)
      rowW += item.widthCm + (rowItems.length > 1 ? gap : 0)
      qj++
    }

    if (rowItems.length === 0) {
      // Nothing fits; skip this item to avoid infinite loop
      qi++
      continue
    }

    // Centre the row horizontally
    const actualRowW = rowItems.reduce((s, i) => s + i.widthCm, 0) + (rowItems.length - 1) * gap
    let x = gap + (uw - actualRowW) / 2

    for (const item of rowItems) {
      cells.push({
        x,
        y,
        widthCm:    item.widthCm,
        heightCm:   item.slot.heightCm,
        sourceIndex: item.slot.sourceIndex,
        rotation:   0,
        half:       item.slot.half,
      })
      countResult[item.slot.sourceIndex] = (countResult[item.slot.sourceIndex] ?? 0) + 1
      x += item.widthCm + gap
    }

    y  += rowH + gap
    qi += rowItems.length
  }

  if (qi < queue.length) {
    warnings.push(`${queue.length - qi} piece(s) did not fit on the sheet`)
  }

  const usedArea = cells.reduce((s, c) => s + c.widthCm * c.heightCm, 0)
  const coverage = usedArea / (paperW * paperH)

  return { cells, counts: countResult, coverage, warnings }
}
