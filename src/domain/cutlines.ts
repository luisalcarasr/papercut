/** Cut-line (dashed border) configuration */

export interface CutLineConfig {
  enabled: boolean
  /** Color as CSS hex string */
  color: string
  /** Line width in mm */
  lineWidthMm: number
  /** Dash length in mm */
  dashMm: number
  /** Gap between dashes in mm */
  gapMm: number
  /** Offset outward from piece edge in mm (0 = on edge, >0 = bleed) */
  offsetMm: number
}

export const DEFAULT_CUT_LINE: CutLineConfig = {
  enabled: true,
  color: '#c8c8c8',
  lineWidthMm: 0.2,
  dashMm: 1.5,
  gapMm: 1.5,
  offsetMm: 0,
}

/** Convert CutLineConfig to RGB 0-1 for pdf-lib */
export function cutLineRgb(config: CutLineConfig): [number, number, number] {
  const hex = config.color.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16) / 255
  const g = parseInt(hex.slice(2, 4), 16) / 255
  const b = parseInt(hex.slice(4, 6), 16) / 255
  return [r, g, b]
}
