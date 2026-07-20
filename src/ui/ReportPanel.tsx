import { useState } from 'react'
import { useStore } from '../state/store'
import { buildReport } from '../domain/report'
import { getPaper, paperDimensions } from '../domain/paper'
import { displayValue } from '../domain/units'

export function ReportPanel() {
  const [collapsed, setCollapsed] = useState(true) // collapsed by default on mobile
  const { cells, sources, paperId, orientation, unit, coveragePct } = useStore()
  const paper = getPaper(paperId)
  if (!paper || cells.length === 0) return null

  const orient = orientation === 'auto' ? 'portrait' : orientation
  const { widthCm, heightCm } = paperDimensions(paper, orient)
  const report = buildReport(cells, widthCm, heightCm)

  return (
    <div className="bg-zinc-800/60 rounded-xl overflow-hidden">
      {/* Header — always visible, acts as toggle on mobile */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 lg:cursor-default"
        onClick={() => setCollapsed(c => !c)}
      >
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          Report
        </h3>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold ${
            coveragePct > 80 ? 'text-green-400' :
            coveragePct > 60 ? 'text-yellow-400' : 'text-zinc-400'
          }`}>
            {report.coveragePct.toFixed(1)}% · {report.totalPieces} pcs
          </span>
          {/* Chevron — only visible on mobile */}
          <span className={`text-zinc-500 text-sm transition-transform lg:hidden ${collapsed ? '' : 'rotate-180'}`}>
            ▾
          </span>
        </div>
      </button>

      {/* Content — always open on lg, collapsible on mobile */}
      <div className={`lg:block ${collapsed ? 'hidden' : 'block'}`}>
        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-zinc-700/50 rounded-lg p-2">
              <div className="text-zinc-400">Total pieces</div>
              <div className="text-lg font-bold text-white">{report.totalPieces}</div>
            </div>
            <div className="bg-zinc-700/50 rounded-lg p-2">
              <div className="text-zinc-400">Coverage</div>
              <div className={`text-lg font-bold ${
                coveragePct > 80 ? 'text-green-400' :
                coveragePct > 60 ? 'text-yellow-400' : 'text-zinc-300'
              }`}>
                {report.coveragePct.toFixed(1)}%
              </div>
            </div>
          </div>

          {sources.length > 0 && (
            <div>
              <p className="text-xs text-zinc-400 mb-1">By image</p>
              {Object.entries(report.countsPerSource).map(([idx, count]) => {
                const src = sources[Number(idx)]
                return (
                  <div key={idx} className="flex items-center gap-2 text-xs text-zinc-300 py-0.5">
                    <span className="text-zinc-500 shrink-0">#{Number(idx) + 1}</span>
                    <span className="flex-1 truncate">{src?.name ?? '?'}</span>
                    <span className="font-semibold shrink-0">{count}×</span>
                  </div>
                )
              })}
            </div>
          )}

          <div>
            <p className="text-xs text-zinc-400 mb-1">Piece sizes</p>
            {report.pieceSizes.map((s, i) => (
              <div key={i} className="text-xs text-zinc-300 py-0.5">
                {displayValue(s.widthCm, unit, 2)} × {displayValue(s.heightCm, unit, 2)} {unit} × {s.count}
              </div>
            ))}
          </div>

          <div className="text-xs text-zinc-500">
            Paper: {displayValue(widthCm, unit, 2)} × {displayValue(heightCm, unit, 2)} {unit}
          </div>
        </div>
      </div>
    </div>
  )
}
