/** Paper size catalogue — ISO A/B and ANSI A–E families */

export type PaperOrientation = 'portrait' | 'landscape'

export interface PaperSize {
  id: string
  label: string
  family: 'ISO-A' | 'ISO-B' | 'ANSI' | 'custom'
  /** Width in cm (portrait) */
  widthCm: number
  /** Height in cm (portrait) */
  heightCm: number
}

// ── ISO A series (mm → cm) ──────────────────────────────────────────────────
const ISO_A: PaperSize[] = [
  { id: 'A0', label: 'A0', family: 'ISO-A', widthCm: 84.1,  heightCm: 118.9 },
  { id: 'A1', label: 'A1', family: 'ISO-A', widthCm: 59.4,  heightCm: 84.1  },
  { id: 'A2', label: 'A2', family: 'ISO-A', widthCm: 42.0,  heightCm: 59.4  },
  { id: 'A3', label: 'A3', family: 'ISO-A', widthCm: 29.7,  heightCm: 42.0  },
  { id: 'A4', label: 'A4', family: 'ISO-A', widthCm: 21.0,  heightCm: 29.7  },
  { id: 'A5', label: 'A5', family: 'ISO-A', widthCm: 14.85, heightCm: 21.0  },
  { id: 'A6', label: 'A6', family: 'ISO-A', widthCm: 10.5,  heightCm: 14.85 },
]

// ── ISO B series ────────────────────────────────────────────────────────────
const ISO_B: PaperSize[] = [
  { id: 'B0', label: 'B0', family: 'ISO-B', widthCm: 100.0, heightCm: 141.4 },
  { id: 'B1', label: 'B1', family: 'ISO-B', widthCm: 70.7,  heightCm: 100.0 },
  { id: 'B2', label: 'B2', family: 'ISO-B', widthCm: 50.0,  heightCm: 70.7  },
  { id: 'B3', label: 'B3', family: 'ISO-B', widthCm: 35.3,  heightCm: 50.0  },
  { id: 'B4', label: 'B4', family: 'ISO-B', widthCm: 25.0,  heightCm: 35.3  },
  { id: 'B5', label: 'B5', family: 'ISO-B', widthCm: 17.6,  heightCm: 25.0  },
]

// ── ANSI series (inch → cm) ─────────────────────────────────────────────────
const ANSI: PaperSize[] = [
  { id: 'ANSI-A', label: 'Letter (ANSI A / Carta)', family: 'ANSI', widthCm: 21.59, heightCm: 27.94 },
  { id: 'ANSI-B', label: 'Tabloid (ANSI B)',        family: 'ANSI', widthCm: 27.94, heightCm: 43.18 },
  { id: 'ANSI-C', label: 'ANSI C (17×22")',         family: 'ANSI', widthCm: 43.18, heightCm: 55.88 },
  { id: 'ANSI-D', label: 'ANSI D (22×34")',         family: 'ANSI', widthCm: 55.88, heightCm: 86.36 },
  { id: 'ANSI-E', label: 'ANSI E (34×44")',         family: 'ANSI', widthCm: 86.36, heightCm: 111.76 },
]

export const ALL_PAPERS: PaperSize[] = [...ISO_A, ...ISO_B, ...ANSI]

export function getPaper(id: string): PaperSize | undefined {
  return ALL_PAPERS.find(p => p.id === id)
}

/** Effective width/height after applying orientation */
export function paperDimensions(
  paper: PaperSize,
  orientation: PaperOrientation,
): { widthCm: number; heightCm: number } {
  if (orientation === 'portrait') {
    return { widthCm: paper.widthCm, heightCm: paper.heightCm }
  }
  return { widthCm: paper.heightCm, heightCm: paper.widthCm }
}

/**
 * Given a required block size, pick the orientation that gives the
 * best coverage (largest block-to-paper ratio).
 */
export function bestOrientation(
  paper: PaperSize,
  blockWCm: number,
  blockHCm: number,
): PaperOrientation {
  const portrait  = paperDimensions(paper, 'portrait')
  const landscape = paperDimensions(paper, 'landscape')
  const fitPortrait  = blockWCm <= portrait.widthCm  && blockHCm <= portrait.heightCm
  const fitLandscape = blockWCm <= landscape.widthCm && blockHCm <= landscape.heightCm
  if (fitPortrait && !fitLandscape) return 'portrait'
  if (fitLandscape && !fitPortrait) return 'landscape'
  // Both fit: prefer best coverage
  const covP = (blockWCm * blockHCm) / (portrait.widthCm  * portrait.heightCm)
  const covL = (blockWCm * blockHCm) / (landscape.widthCm * landscape.heightCm)
  return covP >= covL ? 'portrait' : 'landscape'
}
