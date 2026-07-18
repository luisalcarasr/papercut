import { useEffect, useRef } from 'react'
import { useStore } from '../state/store'
import { getPaper, paperDimensions } from '../domain/paper'
import type { MixedCell } from '../domain/layout/mixed'
import type { GridCell } from '../domain/layout/grid'

type AnyCell = GridCell | MixedCell

const RULER_SIZE = 20 // px

export function SheetPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const {
    paperId, orientation, cells, sources, cutLine, unit, coveragePct,
  } = useStore()

  const paper = getPaper(paperId)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !paper) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const orient = orientation === 'auto' ? 'portrait' : orientation
    const { widthCm, heightCm } = paperDimensions(paper, orient)

    const containerW = canvas.parentElement?.clientWidth ?? 400
    const maxW = containerW - RULER_SIZE - 8
    const maxH = window.innerHeight * 0.55

    const scaleX = maxW / widthCm
    const scaleY = maxH / heightCm
    const scale = Math.min(scaleX, scaleY)

    const pxW = widthCm * scale
    const pxH = heightCm * scale

    canvas.width  = pxW + RULER_SIZE
    canvas.height = pxH + RULER_SIZE

    // Background
    ctx.fillStyle = '#18181b'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Paper
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(RULER_SIZE, RULER_SIZE, pxW, pxH)

    // Ruler ticks
    ctx.fillStyle = '#52525b'
    ctx.font = '9px monospace'
    ctx.textAlign = 'center'
    const tickInterval = unit === 'cm' ? 1 : 2.54 / 2 // every 0.5 in or 1 cm
    const totalTicks = unit === 'cm' ? widthCm : widthCm / 2.54 * 2
    for (let i = 0; i <= totalTicks; i++) {
      const x = RULER_SIZE + i * tickInterval * scale
      ctx.fillRect(x, RULER_SIZE - 4, 1, 4)
      if (i % 2 === 0) ctx.fillText(`${i * (unit === 'cm' ? 1 : 0.5)}`, x, RULER_SIZE - 6)
    }
    const totalTicksY = unit === 'cm' ? heightCm : heightCm / 2.54 * 2
    for (let i = 0; i <= totalTicksY; i++) {
      const y = RULER_SIZE + i * tickInterval * scale
      ctx.fillRect(RULER_SIZE - 4, y, 4, 1)
    }

    // Cells
    const imageCache: Record<string, HTMLImageElement> = {}

    const drawCells = () => {
      for (const cell of cells as AnyCell[]) {
        const src = sources[cell.sourceIndex]
        if (!src) continue
        const x = RULER_SIZE + cell.x * scale
        const y = RULER_SIZE + cell.y * scale
        const w = cell.widthCm * scale
        const h = cell.heightCm * scale

        // Draw image (or placeholder)
        const half = (cell as MixedCell).half ?? null

        const drawImageInRect = (img: HTMLImageElement) => {
          ctx.save()
          ctx.beginPath()
          ctx.rect(x, y, w, h)
          ctx.clip()

          let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight
          if (half === 'left')  { sw = img.naturalWidth / 2 }
          if (half === 'right') { sx = img.naturalWidth / 2; sw = img.naturalWidth / 2 }

          if (cell.rotation === 90) {
            ctx.translate(x + w, y)
            ctx.rotate(Math.PI / 2)
            ctx.drawImage(img, sx, sy, sw, sh, 0, 0, h, w)
          } else {
            ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
          }
          ctx.restore()
        }

        if (imageCache[src.id]) {
          drawImageInRect(imageCache[src.id])
        } else {
          const img = new Image()
          img.onload = () => {
            imageCache[src.id] = img
            drawImageInRect(img)
            // Redraw cut lines on top after image loads
            drawCutLine(cell, x, y, w, h)
          }
          img.src = src.dataUrl
        }

        // Placeholder while loading
        ctx.fillStyle = '#3f3f46'
        ctx.fillRect(x+1, y+1, w-2, h-2)

        drawCutLine(cell, x, y, w, h)
      }
    }

    const drawCutLine = (_cell: AnyCell, x: number, y: number, w: number, h: number) => {
      if (!cutLine.enabled) return
      const offPx = (cutLine.offsetMm / 10) * scale * 10 / 10
      const dashPx = (cutLine.dashMm / 10) * scale * 10 / 10 * 10
      const gapPx  = (cutLine.gapMm  / 10) * scale * 10 / 10 * 10

      ctx.strokeStyle = cutLine.color
      ctx.lineWidth   = Math.max(0.5, (cutLine.lineWidthMm / 10) * scale * 10)
      ctx.setLineDash([dashPx, gapPx])

      const x0 = x - offPx, y0 = y - offPx
      const x1 = x + w + offPx, y1 = y + h + offPx
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0)
      ctx.setLineDash([])
    }

    drawCells()

    // Border shadow
    ctx.strokeStyle = '#71717a'
    ctx.lineWidth = 1
    ctx.strokeRect(RULER_SIZE, RULER_SIZE, pxW, pxH)

  }, [paper, orientation, cells, sources, cutLine, unit])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>
          {paper
            ? `${paper.label} — ${orientation}`
            : 'No paper selected'}
        </span>
        <span className={`font-semibold ${coveragePct > 80 ? 'text-green-400' : coveragePct > 60 ? 'text-yellow-400' : 'text-zinc-400'}`}>
          {coveragePct.toFixed(1)}% coverage · {cells.length} pieces
        </span>
      </div>
      <div className="overflow-auto bg-zinc-900 rounded-xl p-2">
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  )
}
