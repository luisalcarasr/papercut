/**
 * PDF export using pdf-lib.
 * Embeds images at correct physical size with exact MediaBox dimensions.
 * Draws dashed cut lines on each piece.
 */

import { PDFDocument, rgb, degrees } from 'pdf-lib'
import type { PDFPage, PDFImage } from 'pdf-lib'
import { cmToPt } from '../domain/units'
import type { CutLineConfig } from '../domain/cutlines'
import type { GridCell } from '../domain/layout/grid'
import type { MixedCell } from '../domain/layout/mixed'
import type { ImageSource } from '../domain/piece'

type AnyCell = GridCell | MixedCell

export interface SheetSpec {
  paperW: number
  paperH: number
  cells: AnyCell[]
}

export interface ExportOptions {
  dpi: number
  cutLine: CutLineConfig
  sources: ImageSource[]
}

/** Fetch an image DataURL and return ArrayBuffer */
async function dataUrlToBytes(dataUrl: string): Promise<Uint8Array> {
  const res = await fetch(dataUrl)
  const buf = await res.arrayBuffer()
  return new Uint8Array(buf)
}

/** Embed all unique source images into the PDF doc */
async function embedImages(
  doc: PDFDocument,
  sources: ImageSource[],
): Promise<PDFImage[]> {
  return Promise.all(
    sources.map(async src => {
      const bytes = await dataUrlToBytes(src.dataUrl)
      const isPng = src.dataUrl.startsWith('data:image/png')
      return isPng ? doc.embedPng(bytes) : doc.embedJpg(bytes)
    }),
  )
}

/** Draw a dashed rectangle on a PDF page */
function drawDashedRect(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  cfg: CutLineConfig,
) {
  if (!cfg.enabled) return
  const [r, g, b] = parseHexColor(cfg.color)
  const color = rgb(r, g, b)
  const lw = (cfg.lineWidthMm / 10) * cmToPt(1) / 10 * 10 // mm → pt
  const dashPt = (cfg.dashMm / 10) * cmToPt(1) / 10 * 10
  const gapPt  = (cfg.gapMm  / 10) * cmToPt(1) / 10 * 10
  const offPt  = (cfg.offsetMm / 10) * cmToPt(1) / 10 * 10

  const x0 = x - offPt, y0 = y - offPt
  const x1 = x + w + offPt, y1 = y + h + offPt

  function dashedLine(ax: number, ay: number, bx: number, by: number) {
    const len = Math.sqrt((bx-ax)**2 + (by-ay)**2)
    const dx = (bx-ax)/len, dy = (by-ay)/len
    let pos = 0
    while (pos < len) {
      const end = Math.min(pos + dashPt, len)
      page.drawLine({
        start: { x: ax + dx*pos,  y: ay + dy*pos  },
        end:   { x: ax + dx*end,  y: ay + dy*end  },
        color,
        thickness: lw,
      })
      pos += dashPt + gapPt
    }
  }

  dashedLine(x0, y0, x1, y0)  // bottom
  dashedLine(x0, y1, x1, y1)  // top
  dashedLine(x0, y0, x0, y1)  // left
  dashedLine(x1, y0, x1, y1)  // right
}

function parseHexColor(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0,2), 16)/255,
    parseInt(h.slice(2,4), 16)/255,
    parseInt(h.slice(4,6), 16)/255,
  ]
}

/**
 * Given a source image and half spec, return the crop box
 * as fractions [x, y, w, h] of the image dimensions (0-1).
 */
function cropBox(half: 'left'|'right'|null): [number,number,number,number] {
  if (half === 'left')  return [0,   0, 0.5, 1]
  if (half === 'right') return [0.5, 0, 0.5, 1]
  return [0, 0, 1, 1]
}

export async function exportPdf(
  sheets: SheetSpec[],
  options: ExportOptions,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const embeds = await embedImages(doc, options.sources)

  for (const sheet of sheets) {
    const wPt = cmToPt(sheet.paperW)
    const hPt = cmToPt(sheet.paperH)
    const page = doc.addPage([wPt, hPt])

    for (const cell of sheet.cells) {
      const embed = embeds[cell.sourceIndex]
      if (!embed) continue

      const xPt = cmToPt(cell.x)
      const yPt = hPt - cmToPt(cell.y) - cmToPt(cell.heightCm)  // pdf-lib Y is bottom-up
      const wCellPt = cmToPt(cell.widthCm)
      const hCellPt = cmToPt(cell.heightCm)

      const half = (cell as MixedCell).half ?? null
      void cropBox(half) // used for future clipping; pdf-lib embeds full image

      if (cell.rotation === 90) {
        page.drawImage(embed, {
          x: xPt + wCellPt,
          y: yPt,
          width: hCellPt,
          height: wCellPt,
          rotate: degrees(90),
        })
      } else {
        page.drawImage(embed, {
          x: xPt,
          y: yPt,
          width: wCellPt,
          height: hCellPt,
        })
      }

      // Cut line
      drawDashedRect(page, xPt, yPt, wCellPt, hCellPt, options.cutLine)
    }
  }

  return doc.save()
}

/** Trigger browser download of the PDF bytes */
export function downloadPdf(bytes: Uint8Array, filename = 'papercut-output.pdf') {
  const blob = new Blob([bytes as unknown as ArrayBuffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
