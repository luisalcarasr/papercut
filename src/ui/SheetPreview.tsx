import { useEffect, useRef, useCallback } from 'react'
import { useStore } from '../state/store'
import { getPaper, paperDimensions } from '../domain/paper'
import type { MixedCell } from '../domain/layout/mixed'
import type { GridCell } from '../domain/layout/grid'

type AnyCell = GridCell | MixedCell

const RULER_SIZE = 20 // px

/** Module-level image cache — survives re-renders and panel switches */
const imgCache = new Map<string, HTMLImageElement>()

function preload(id: string, dataUrl: string): Promise<HTMLImageElement> {
  if (imgCache.has(id)) return Promise.resolve(imgCache.get(id)!)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload  = () => { imgCache.set(id, img); resolve(img) }
    img.onerror = reject
    img.src     = dataUrl
  })
}

export function SheetPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number | null>(null)

  const { paperId, orientation, cells, sources, cutLine, unit, coveragePct } = useStore()
  const paper = getPaper(paperId)

  // ── Single-pass synchronous draw ─────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !paper) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const orient = orientation === 'auto' ? 'portrait' : orientation
    const { widthCm, heightCm } = paperDimensions(paper, orient)

    // Use the canvas container dimensions (responsive)
    const container = canvas.parentElement
    const containerW = container?.clientWidth  ?? 360
    const containerH = container?.clientHeight ?? 480

    const maxW = Math.max(containerW - RULER_SIZE - 4, 100)
    const maxH = Math.max(containerH - RULER_SIZE - 4, 100)
    const scale = Math.min(maxW / widthCm, maxH / heightCm)

    const pxW = widthCm  * scale
    const pxH = heightCm * scale

    const newW = Math.round(pxW + RULER_SIZE)
    const newH = Math.round(pxH + RULER_SIZE)
    if (canvas.width  !== newW) canvas.width  = newW
    if (canvas.height !== newH) canvas.height = newH

    // ── Background + paper ────────────────────────────────────────────────
    ctx.fillStyle = '#18181b'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(RULER_SIZE, RULER_SIZE, pxW, pxH)

    // ── Ruler ticks ───────────────────────────────────────────────────────
    ctx.fillStyle  = '#52525b'
    ctx.font       = '9px monospace'
    ctx.textAlign  = 'center'
    const tickCm = unit === 'cm' ? 1 : 2.54 / 2
    const ticksX = unit === 'cm' ? widthCm  : widthCm  / 2.54 * 2
    const ticksY = unit === 'cm' ? heightCm : heightCm / 2.54 * 2
    for (let i = 0; i <= Math.ceil(ticksX); i++) {
      const x = RULER_SIZE + i * tickCm * scale
      if (x > RULER_SIZE + pxW) break
      ctx.fillRect(x, RULER_SIZE - 4, 1, 4)
      if (i % 2 === 0) ctx.fillText(`${i * (unit === 'cm' ? 1 : 0.5)}`, x, RULER_SIZE - 6)
    }
    for (let i = 0; i <= Math.ceil(ticksY); i++) {
      const y = RULER_SIZE + i * tickCm * scale
      if (y > RULER_SIZE + pxH) break
      ctx.fillRect(RULER_SIZE - 4, y, 4, 1)
    }

    // ── Cells ─────────────────────────────────────────────────────────────
    const dashPx = (cutLine.dashMm / 10) * scale * 10
    const gapPx  = (cutLine.gapMm  / 10) * scale * 10
    const offPx  = (cutLine.offsetMm / 10) * scale * 10

    for (const cell of cells as AnyCell[]) {
      const src = sources[cell.sourceIndex]
      if (!src) continue

      const x = RULER_SIZE + cell.x * scale
      const y = RULER_SIZE + cell.y * scale
      const w = cell.widthCm  * scale
      const h = cell.heightCm * scale
      const half = (cell as MixedCell).half ?? null
      const img  = imgCache.get(src.id)

      if (img) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(x, y, w, h)
        ctx.clip()

        let sx = 0, sy = 0
        let sw = img.naturalWidth, sh = img.naturalHeight
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
      } else {
        // Placeholder — only shown before first load
        ctx.fillStyle = '#3f3f46'
        ctx.fillRect(x + 1, y + 1, w - 2, h - 2)
      }

      // Cut line
      if (cutLine.enabled) {
        ctx.strokeStyle = cutLine.color
        ctx.lineWidth   = Math.max(0.5, (cutLine.lineWidthMm / 10) * scale * 10)
        ctx.setLineDash([dashPx, gapPx])
        ctx.strokeRect(x - offPx, y - offPx, w + 2 * offPx, h + 2 * offPx)
        ctx.setLineDash([])
      }
    }

    // Sheet border
    ctx.strokeStyle = '#71717a'
    ctx.lineWidth   = 1
    ctx.strokeRect(RULER_SIZE, RULER_SIZE, pxW, pxH)
  }, [paper, orientation, cells, sources, cutLine, unit])

  // ── Preload → draw ────────────────────────────────────────────────────────
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(draw)

    const pending = sources.filter(s => !imgCache.has(s.id))
    if (pending.length === 0) return

    Promise.all(pending.map(s => preload(s.id, s.dataUrl))).then(() => {
      rafRef.current = requestAnimationFrame(draw)
    })

    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [draw, sources])

  // ── Resize observer — redraws on container resize / orientation change ────
  useEffect(() => {
    const canvas = canvasRef.current
    const container = canvas?.parentElement
    if (!container) return

    let debounce: ReturnType<typeof setTimeout>
    const ro = new ResizeObserver(() => {
      clearTimeout(debounce)
      debounce = setTimeout(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(draw)
      }, 60)
    })
    ro.observe(container)
    return () => { ro.disconnect(); clearTimeout(debounce) }
  }, [draw])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-zinc-400 gap-2">
        <span className="truncate">
          {paper ? `${paper.label} — ${orientation}` : 'No paper selected'}
        </span>
        <span className={`shrink-0 font-semibold ${
          coveragePct > 80 ? 'text-green-400' :
          coveragePct > 60 ? 'text-yellow-400' : 'text-zinc-400'
        }`}>
          {coveragePct.toFixed(1)}% · {cells.length}✂
        </span>
      </div>
      <div
        className="overflow-hidden bg-zinc-900 rounded-xl p-2 w-full"
        style={{ minHeight: '40vh', maxHeight: 'calc(100dvh - 220px)' }}
      >
        <canvas ref={canvasRef} className="block max-w-full" />
      </div>
    </div>
  )
}
