/** Image piece — dimensions, ratio, rotation, halving */

export interface ImageSource {
  id: string
  name: string
  dataUrl: string
  naturalWidth: number
  naturalHeight: number
}

export interface Piece {
  sourceId: string
  /** Width in cm as placed on the sheet */
  widthCm: number
  /** Height in cm as placed on the sheet */
  heightCm: number
  /** 0 or 90 degrees clockwise */
  rotation: 0 | 90
  /** Which half of the source image to use (null = full image) */
  half: 'left' | 'right' | null
}

export function naturalRatio(src: ImageSource): number {
  return src.naturalWidth / src.naturalHeight
}

/** Effective ratio after half-split */
export function effectiveRatio(src: ImageSource, half: Piece['half']): number {
  const base = naturalRatio(src)
  if (half === null) return base
  // Split vertically in half → each half is (w/2) × h → ratio halved
  return base / 2
}

/** Scale a piece to a target height preserving ratio */
export function scaleToHeight(
  ratio: number,
  targetH: number,
): { widthCm: number; heightCm: number } {
  return { widthCm: targetH * ratio, heightCm: targetH }
}

/** Scale a piece to a target width preserving ratio */
export function scaleToWidth(
  ratio: number,
  targetW: number,
): { widthCm: number; heightCm: number } {
  return { widthCm: targetW, heightCm: targetW / ratio }
}

/** Rotate a piece 90° (swap dimensions) */
export function rotatePiece(p: { widthCm: number; heightCm: number }) {
  return { widthCm: p.heightCm, heightCm: p.widthCm }
}

/** Standard smartphone size reference (cm) — ~6.1" diagonal, 9:19.5 */
export const SMARTPHONE_PRESET = { widthCm: 7.1, heightCm: 15.4 }
