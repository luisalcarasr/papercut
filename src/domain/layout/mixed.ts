/**
 * Mixed layout: rows of vertical pieces + rows of horizontal pieces,
 * all at the same height. Supports minimum counts per image.
 *
 * Reproduces the shelf-packing logic from the session.
 */
import { maxFitGrid } from './grid'

export interface ImageSlot {
  sourceIndex: number
  ratio: number        // w/h
  minCount: number     // minimum copies required
  half: 'left' | 'right' | null
}

export interface MixedCell {
  x: number
  y: number
  widthCm: number
  heightCm: number
  sourceIndex: number
  rotation: 0 | 90
  half: 'left' | 'right' | null
}

export interface MixedLayout {
  cells: MixedCell[]
  heightCm: number
  coverage: number
  paperW: number
  paperH: number
  counts: number[]   // copies per slot
}

/**
 * Classic layout: 2 vertical pieces side-by-side on top +
 * 1 horizontal piece (same piece rotated 90°) at same scale below.
 * Both sized to maximise coverage while fitting the paper.
 */
export function twoVertOneHoriz(
  paperW: number,
  paperH: number,
  ratio: number,    // w/h of the source image
  gap: number,
  sourceIndex = 0,
  half: 'left' | 'right' | null = null,
): MixedLayout {
  const uw = paperW - 2 * gap
  const uh = paperH - 2 * gap - gap // one gap between rows

  // Constraints:
  // width: 2*wv + gap <= uw  →  wv <= (uw-gap)/2
  // height: hv + gap + wv <= uh  (hv=wv/ratio, HH=wv when rotated)
  //   → wv*(1/ratio + 1) <= uh-gap
  const wvByWidth  = (uw - gap) / 2
  const wvByHeight = (uh - gap) / (1 / ratio + 1)
  const wv = Math.min(wvByWidth, wvByHeight)
  const hv = wv / ratio
  // Horizontal piece: same scale, rotated → width=hv, height=wv
  const hw = hv
  const hh = wv

  const blockTopW = 2 * wv + gap
  const oxTop = (paperW - blockTopW) / 2
  const oxBot = (paperW - hw) / 2
  const yTop = gap
  const yBot = yTop + hv + gap

  const cells: MixedCell[] = [
    { x: oxTop,       y: yTop, widthCm: wv, heightCm: hv, sourceIndex, rotation: 0,  half },
    { x: oxTop+wv+gap, y: yTop, widthCm: wv, heightCm: hv, sourceIndex, rotation: 0,  half },
    { x: oxBot,        y: yBot, widthCm: hw, heightCm: hh, sourceIndex, rotation: 90, half },
  ]
  const coverage = (2 * wv * hv + hw * hh) / (paperW * paperH)
  return { cells, heightCm: hv, coverage, paperW, paperH, counts: [3] }
}

/**
 * Multi-image row layout:
 *  - Row 0: 1 copy of image A + fill with image B
 *  - Rows 1..n: fill with image B
 * All at same height H, maximised to fit paper.
 */
export function multiImageRows(opts: {
  paperW: number
  paperH: number
  slots: ImageSlot[]   // slot[0] = "main" (1 copy), slot[1] = "fill"
  gap: number
  targetH?: number     // cm; 0 = auto-maximise
}): MixedLayout {
  const { paperW, paperH, slots, gap } = opts
  if (slots.length < 2) throw new Error('Need at least 2 slots')

  const uw = paperW - 2 * gap
  const uh = paperH - 2 * gap

  const rA = slots[0].ratio
  const rB = slots[1].ratio
  const minB = slots[1].minCount

  // Find best H that achieves minB copies of slot B
  let bestH = 0
  let bestResult: { rows: number; cA: number; cB: number; wA: number; wB: number } | null = null

  const hMax = opts.targetH && opts.targetH > 0 ? opts.targetH * 1.05 : uh
  const hMin = opts.targetH && opts.targetH > 0 ? opts.targetH * 0.95 : 5

  for (let hi = Math.min(hMax, uh); hi >= hMin; hi -= 0.05) {
    const wA = hi * rA
    const wB = hi * rB
    if (wA > uw || wB > uw) continue
    const rows = Math.floor((uh + gap) / (hi + gap))
    if (rows < 1) continue
    // row 0: 1 A + fill with B
    const remRow0 = uw - wA - gap
    const cBrow0 = remRow0 > 0 ? Math.floor((remRow0 + gap) / (wB + gap)) : 0
    // remaining rows: fill with B
    const cBperRow = Math.floor((uw + gap) / (wB + gap))
    const cBrest = (rows - 1) * cBperRow
    const totalB = cBrow0 + cBrest
    if (totalB >= minB) {
      if (hi > bestH) {
        bestH = hi
        bestResult = { rows, cA: 1, cB: totalB, wA, wB }
      }
    }
  }

  if (!bestResult) {
    // Fallback: just fit as many as possible
    for (let hi = uh; hi >= 3; hi -= 0.1) {
      const wA = hi * rA; const wB = hi * rB
      if (wA > uw || wB > uw) continue
      const rows = Math.floor((uh + gap) / (hi + gap))
      if (rows < 1) continue
      const rem0 = uw - wA - gap
      const cB0 = rem0 > 0 ? Math.floor((rem0 + gap) / (wB + gap)) : 0
      const cBr = Math.floor((uw + gap) / (wB + gap))
      bestH = hi
      bestResult = { rows, cA: 1, cB: cB0 + (rows - 1) * cBr, wA, wB }
      break
    }
  }

  if (!bestResult) return { cells: [], heightCm: 0, coverage: 0, paperW, paperH, counts: [0, 0] }

  const { rows, wA, wB, cB } = bestResult
  const cBperRow = Math.floor((uw + gap) / (wB + gap))
  const rem0 = uw - wA - gap
  const cBrow0 = rem0 > 0 ? Math.floor((rem0 + gap) / (wB + gap)) : 0

  const cells: MixedCell[] = []

  for (let r = 0; r < rows; r++) {
    const y = gap + r * (bestH + gap)
    if (r === 0) {
      // 1 A + cBrow0 B
      const rowItems: { w: number; si: number; rot: 0|90; h: 'left'|'right'|null }[] = [
        { w: wA, si: slots[0].sourceIndex, rot: 0, h: slots[0].half },
        ...Array(cBrow0).fill({ w: wB, si: slots[1].sourceIndex, rot: 0, h: slots[1].half }),
      ]
      const rowW = rowItems.reduce((s, i) => s + i.w, 0) + (rowItems.length - 1) * gap
      let x = (paperW - rowW) / 2
      for (const item of rowItems) {
        cells.push({ x, y, widthCm: item.w, heightCm: bestH, sourceIndex: item.si, rotation: item.rot, half: item.h })
        x += item.w + gap
      }
    } else {
      const rowW = cBperRow * wB + (cBperRow - 1) * gap
      let x = (paperW - rowW) / 2
      for (let c = 0; c < cBperRow; c++) {
        cells.push({ x, y, widthCm: wB, heightCm: bestH, sourceIndex: slots[1].sourceIndex, rotation: 0, half: slots[1].half })
        x += wB + gap
      }
    }
  }

  const usedArea = cells.reduce((s, c) => s + c.widthCm * c.heightCm, 0)
  const coverage = usedArea / (paperW * paperH)
  return { cells, heightCm: bestH, coverage, paperW, paperH, counts: [1, cB] }
}

/**
 * Grid of a single image (uniform NxM) maximising copies ≥ minCount.
 * Returns cells with auto-computed gap.
 */
export function singleImageGrid(opts: {
  paperW: number
  paperH: number
  ratio: number
  targetH: number
  gap: number
  sourceIndex?: number
  half?: 'left' | 'right' | null
}): MixedLayout {
  const { paperW, paperH, ratio, targetH, gap, sourceIndex = 0, half = null } = opts
  const uw = paperW - 2 * gap
  const uh = paperH - 2 * gap
  const w = targetH * ratio
  const { cols, rows } = maxFitGrid(uw, uh, w, targetH, gap)
  // distribute space evenly
  const gapX = (paperW - cols * w)   / (cols + 1)
  const gapY = (paperH - rows * targetH) / (rows + 1)
  const cells: MixedCell[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        x: gapX + c * (w + gapX),
        y: gapY + r * (targetH + gapY),
        widthCm: w,
        heightCm: targetH,
        sourceIndex,
        rotation: 0,
        half,
      })
    }
  }
  const coverage = (cols * rows * w * targetH) / (paperW * paperH)
  return { cells, heightCm: targetH, coverage, paperW, paperH, counts: [cols * rows] }
}
