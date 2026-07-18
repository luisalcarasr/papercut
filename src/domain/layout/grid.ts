/**
 * Grid layout: NxM copies of a single piece with uniform margins/gaps.
 * The remaining space after placing cells is distributed equally as
 * margin (border) and gap (between cells) — margin == gap.
 */

export interface GridLayout {
  cols: number
  rows: number
  /** Cell width in cm */
  cellW: number
  /** Cell height in cm */
  cellH: number
  /** Margin (border) and gap in cm — equal value */
  margin: number
  gap: number
  /** Total pieces placed */
  count: number
  /** Coverage fraction 0-1 */
  coverage: number
  paperW: number
  paperH: number
}

export interface GridCell {
  /** Top-left X on sheet (cm) */
  x: number
  /** Top-left Y on sheet (cm) */
  y: number
  widthCm: number
  heightCm: number
  /** Index in source image list */
  sourceIndex: number
  rotation: 0 | 90
  half: 'left' | 'right' | null
}

/**
 * Compute uniform margin/gap so the grid fills the sheet.
 * Returns margin (= gap) in cm.
 */
export function computeUniformGap(
  paperDim: number,
  cells: number,
  cellDim: number,
): number {
  const remaining = paperDim - cells * cellDim
  if (remaining < 0) return 0
  // slots = cells + 1 (1 margin each side + (cells-1) gaps = cells+1)
  return remaining / (cells + 1)
}

/**
 * Build a grid layout for a single piece size on a given paper.
 */
export function buildGridLayout(opts: {
  paperW: number
  paperH: number
  cellW: number
  cellH: number
  cols: number
  rows: number
}): GridLayout {
  const { paperW, paperH, cellW, cellH, cols, rows } = opts
  const gapX = computeUniformGap(paperW, cols, cellW)
  const gapY = computeUniformGap(paperH, rows, cellH)
  const count = cols * rows
  const coverage = (count * cellW * cellH) / (paperW * paperH)
  return { cols, rows, cellW, cellH, margin: Math.min(gapX, gapY), gap: Math.min(gapX, gapY), count, coverage, paperW, paperH }
}

/**
 * Generate cell positions for a grid layout.
 */
export function gridCells(
  layout: GridLayout,
  sourceIndex = 0,
  rotation: 0 | 90 = 0,
  half: 'left' | 'right' | null = null,
): GridCell[] {
  const { cols, rows, cellW, cellH, paperW, paperH } = layout
  const gapX = computeUniformGap(paperW, cols, cellW)
  const gapY = computeUniformGap(paperH, rows, cellH)
  const cells: GridCell[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push({
        x: gapX + col * (cellW + gapX),
        y: gapY + row * (cellH + gapY),
        widthCm: cellW,
        heightCm: cellH,
        sourceIndex,
        rotation,
        half,
      })
    }
  }
  return cells
}

/**
 * Find the maximum number of cells of a given size that fit in a paper,
 * returning the best cols×rows combination.
 */
export function maxFitGrid(
  paperW: number,
  paperH: number,
  cellW: number,
  cellH: number,
  minGap = 0,
): { cols: number; rows: number; count: number } {
  const cols = Math.max(0, Math.floor((paperW + minGap) / (cellW + minGap)))
  const rows = Math.max(0, Math.floor((paperH + minGap) / (cellH + minGap)))
  return { cols, rows, count: cols * rows }
}
