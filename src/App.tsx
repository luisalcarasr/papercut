import { useState, useRef, useEffect } from 'react'
import { ImageDropzone } from './ui/ImageDropzone'
import { PaperPicker } from './ui/PaperPicker'
import { SizeControls } from './ui/SizeControls'
import { LayoutControls } from './ui/LayoutControls'
import { CutLineControls } from './ui/CutLineControls'
import { SheetPreview } from './ui/SheetPreview'
import { ReportPanel } from './ui/ReportPanel'
import { useLayoutEngine } from './ui/useLayoutEngine'
import { useInstallPrompt } from './ui/useInstallPrompt'
import { useStore } from './state/store'
import { exportPdf, downloadPdf } from './pdf/exportPdf'
import { getPaper, paperDimensions } from './domain/paper'

// ── Panel definitions ────────────────────────────────────────────────────────
type Panel = 'images' | 'paper' | 'size' | 'layout' | 'cutlines'

const PANELS: { id: Panel; label: string; icon: string }[] = [
  { id: 'images',   label: 'Images',    icon: '🖼️' },
  { id: 'paper',    label: 'Paper',     icon: '📄' },
  { id: 'size',     label: 'Size',      icon: '📐' },
  { id: 'layout',   label: 'Layout',    icon: '⚙️' },
  { id: 'cutlines', label: 'Cut lines', icon: '✂️' },
]

function PanelContent({ panel }: { panel: Panel }) {
  return (
    <>
      {panel === 'images'   && <ImageDropzone />}
      {panel === 'paper'    && <PaperPicker />}
      {panel === 'size'     && <SizeControls />}
      {panel === 'layout'   && <LayoutControls />}
      {panel === 'cutlines' && <CutLineControls />}
    </>
  )
}

// ── Mobile drawer ────────────────────────────────────────────────────────────
function Drawer({
  open, onClose, panel,
}: {
  open: boolean
  onClose: () => void
  panel: Panel
}) {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 lg:hidden ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sheet from bottom */}
      <div
        className={`fixed bottom-0 inset-x-0 z-50 bg-zinc-900 rounded-t-2xl border-t border-zinc-800
          transform transition-transform duration-300 ease-out lg:hidden
          ${open ? 'translate-y-0' : 'translate-y-full'}
        `}
        style={{ maxHeight: '75dvh' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-zinc-600" />
        </div>

        {/* Panel title */}
        <div className="px-4 pb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300">
            {PANELS.find(p => p.id === panel)?.label}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-xl w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-4 pb-8" style={{ maxHeight: 'calc(75dvh - 80px)' }}>
          <PanelContent panel={panel} />
        </div>
      </div>
    </>
  )
}

// ── Mobile bottom navigation ─────────────────────────────────────────────────
function BottomNav({
  active, onSelect,
}: {
  active: Panel
  onSelect: (p: Panel) => void
}) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-zinc-900/95 backdrop-blur border-t border-zinc-800 lg:hidden safe-bottom">
      <div className="flex">
        {PANELS.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 min-h-[56px] transition-colors ${
              active === p.id
                ? 'text-indigo-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="text-lg leading-none">{p.icon}</span>
            <span className="text-[10px] leading-none">{p.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

// ── Header overflow menu (mobile) ────────────────────────────────────────────
function OverflowMenu({
  onImport, onExport, canInstall, onInstall,
}: {
  onImport: () => void
  onExport: () => void
  canInstall: boolean
  onInstall: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { unit, setUnit } = useStore()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-9 h-9 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
        aria-label="More options"
      >
        <span className="text-lg leading-none">⋯</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <button
            onClick={() => { setUnit(unit === 'cm' ? 'in' : 'cm'); setOpen(false) }}
            className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Units: {unit === 'cm' ? 'cm → in' : 'in → cm'}
          </button>
          <button
            onClick={() => { onImport(); setOpen(false) }}
            className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors border-t border-zinc-700"
          >
            Import recipe
          </button>
          <button
            onClick={() => { onExport(); setOpen(false) }}
            className="w-full text-left px-4 py-3 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors border-t border-zinc-700"
          >
            Export recipe
          </button>
          {canInstall && (
            <button
              onClick={() => { onInstall(); setOpen(false) }}
              className="w-full text-left px-4 py-3 text-sm text-indigo-400 hover:bg-zinc-700 transition-colors border-t border-zinc-700"
            >
              ⬇ Install app
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [activePanel, setActivePanel] = useState<Panel>('images')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const { sources, cells, paperId, orientation, cutLine, exportSettings, importSettings } = useStore()
  const { unit, setUnit } = useStore()
  const { canInstall, install } = useInstallPrompt()

  useLayoutEngine()

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (cells.length === 0 || sources.length === 0) return
    setExporting(true)
    try {
      const paper = getPaper(paperId)
      if (!paper) return
      const orient = orientation === 'auto' ? 'portrait' : orientation
      const { widthCm, heightCm } = paperDimensions(paper, orient)
      const bytes = await exportPdf(
        [{ paperW: widthCm, paperH: heightCm, cells }],
        { dpi: 300, cutLine, sources },
      )
      downloadPdf(bytes, 'papercut-output.pdf')
    } catch (e) {
      console.error('Export failed:', e)
      alert('Export failed: ' + String(e))
    } finally {
      setExporting(false)
    }
  }

  const handleExportSettings = () => {
    const data = exportSettings()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'papercut-settings.json'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportSettings = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]; if (!file) return
      const text = await file.text()
      importSettings(JSON.parse(text))
    }
    input.click()
  }

  const handleTabSelect = (panel: Panel) => {
    if (activePanel === panel && drawerOpen) {
      setDrawerOpen(false)
    } else {
      setActivePanel(panel)
      setDrawerOpen(true)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-zinc-900 text-zinc-100 flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="border-b border-zinc-800 px-4 lg:px-6 py-3 flex items-center gap-3 shrink-0 safe-top">
        {/* Logo */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">✂️</span>
          <span className="font-bold text-base lg:text-lg tracking-tight text-white whitespace-nowrap">papercut</span>
          <span className="hidden sm:block text-xs text-zinc-500 ml-1 whitespace-nowrap">print layout tool</span>
        </div>

        <div className="flex-1" />

        {/* Desktop controls */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={() => setUnit(unit === 'cm' ? 'in' : 'cm')}
            className="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            {unit === 'cm' ? 'cm → in' : 'in → cm'}
          </button>
          <button
            onClick={handleImportSettings}
            className="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            Import recipe
          </button>
          <button
            onClick={handleExportSettings}
            className="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            Export recipe
          </button>
          {canInstall && (
            <button
              onClick={install}
              className="text-xs bg-indigo-700 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              ⬇ Install app
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={cells.length === 0 || exporting}
            className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg transition-colors"
          >
            {exporting ? 'Generating…' : '⬇ Export PDF'}
          </button>
        </div>

        {/* Mobile controls */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            onClick={handleExport}
            disabled={cells.length === 0 || exporting}
            className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg transition-colors min-h-[36px]"
          >
            {exporting ? '…' : '⬇ PDF'}
          </button>
          <OverflowMenu
            onImport={handleImportSettings}
            onExport={handleExportSettings}
            canInstall={canInstall}
            onInstall={install}
          />
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-72 border-r border-zinc-800 flex-col overflow-y-auto shrink-0">
          {/* Panel tabs */}
          <div className="flex border-b border-zinc-800">
            {PANELS.map(p => (
              <button
                key={p.id}
                onClick={() => setActivePanel(p.id)}
                className={`flex-1 py-2.5 text-xs transition-colors ${
                  activePanel === p.id
                    ? 'border-b-2 border-indigo-500 text-indigo-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title={p.label}
              >
                {p.icon}
              </button>
            ))}
          </div>

          <div className="p-4 flex-1">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              {PANELS.find(p => p.id === activePanel)?.label}
            </h2>
            <PanelContent panel={activePanel} />
          </div>
        </aside>

        {/* Main — Preview + Report */}
        <main className="flex-1 flex flex-col gap-4 p-3 lg:p-6 overflow-y-auto pb-20 lg:pb-6">
          <SheetPreview />
          <ReportPanel />
        </main>
      </div>

      {/* ── Mobile bottom nav ────────────────────────────────────────────────── */}
      <BottomNav active={activePanel} onSelect={handleTabSelect} />

      {/* ── Mobile drawer ────────────────────────────────────────────────────── */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        panel={activePanel}
      />
    </div>
  )
}
