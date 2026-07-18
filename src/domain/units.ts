/** Unit conversion utilities. All PDF output uses 300 DPI internally. */

export const DEFAULT_DPI = 300

/** Points per inch (PDF standard) */
export const PT_PER_IN = 72

export function cmToPx(cm: number, dpi = DEFAULT_DPI): number {
  return (cm / 2.54) * dpi
}

export function inToPx(inch: number, dpi = DEFAULT_DPI): number {
  return inch * dpi
}

export function pxToCm(px: number, dpi = DEFAULT_DPI): number {
  return (px / dpi) * 2.54
}

export function pxToIn(px: number, dpi = DEFAULT_DPI): number {
  return px / dpi
}

export function cmToIn(cm: number): number {
  return cm / 2.54
}

export function inToCm(inch: number): number {
  return inch * 2.54
}

export function cmToPt(cm: number): number {
  return (cm / 2.54) * PT_PER_IN
}

export function inToPt(inch: number): number {
  return inch * PT_PER_IN
}

export function mmToCm(mm: number): number {
  return mm / 10
}

/** Round cm value to `digits` decimal places */
export function roundCm(cm: number, digits = 2): number {
  return Math.round(cm * 10 ** digits) / 10 ** digits
}

export type Unit = 'cm' | 'in'

export function displayValue(cm: number, unit: Unit, digits = 2): string {
  const v = unit === 'cm' ? cm : cmToIn(cm)
  return v.toFixed(digits)
}
