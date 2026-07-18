import { useState } from 'react'
import { ImageDropzone } from './ui/ImageDropzone'
import { PaperPicker } from './ui/PaperPicker'
import { SizeControls } from './ui/SizeControls'
import { LayoutControls } from './ui/LayoutControls'
import { CutLineControls } from './ui/CutLineControls'
import { SheetPreview } from './ui/SheetPreview'
import { ReportPanel } from './ui/ReportPanel'
import { useLayoutEngine } from './ui/useLayoutEngine'
import { useStore } from './state/store'
import { exportPdf, downloadPdf } from './pdf/exportPdf'
import { getPaper, paperDimensions } from './domain/paper'

type Panel = 'images' | 'paper' | 'size' | 'layout' | 'cutlines'

const PANELS: { id: Panel; label: string; icon: string }[] = [
  { id: 'images',   label: 'Images',   icon: '🖼️' },
  { id: 'paper',    label: 'Paper',    icon: '📄' },
  { id: 'size',     label: 'Size',     icon: '📐' },
  { id: 'layout',   label: 'Layout',   icon: '⚙️' },
  { id: 'cutlines', label: 'Cut lines', icon: '✂️' },
]

function UnitToggle() {
  const { unit, setUnit } = useStore()
  return (
    <button
      onClick={() => setUnit(unit === 'cm' ? 'in' : 'cm')}
      className="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
    >
      {unit === 'cm' ? 'cm → in' : 'in → cm'}
    </button>
  )
}

export default function App() {
  const [activePanel, setActivePanel] = useState<Panel>('images')
  const [exporting, setExporting] = useState(false)
  const { sources, cells, paperId, orientation, cutLine, exportSettings, importSettings } = useStore()

  useLayoutEngine()

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

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">✂️</span>
          <span className="font-bold text-lg tracking-tight text-white">papercut</span>
          <span className="text-xs text-zinc-500 ml-1">print layout tool</span>
        </div>
        <div className="flex-1" />
        <UnitToggle />
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
        <button
          onClick={handleExport}
          disabled={cells.length === 0 || exporting}
          className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg transition-colors"
        >
          {exporting ? 'Generating…' : '⬇ Export PDF'}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 border-r border-zinc-800 flex flex-col overflow-y-auto">
          {/* Panel tabs */}
          <div className="flex border-b border-zinc-800">
            {PANELS.map(p => (
              <button
                key={p.id}
                onClick={() => setActivePanel(p.id)}
                className={`flex-1 py-2 text-xs transition-colors ${
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
            {activePanel === 'images'   && <ImageDropzone />}
            {activePanel === 'paper'    && <PaperPicker />}
            {activePanel === 'size'     && <SizeControls />}
            {activePanel === 'layout'   && <LayoutControls />}
            {activePanel === 'cutlines' && <CutLineControls />}
          </div>
        </aside>

        {/* Main — Preview + Report */}
        <main className="flex-1 flex flex-col gap-4 p-6 overflow-y-auto">
          <SheetPreview />
          <ReportPanel />
        </main>
      </div>
    </div>
  )
}
