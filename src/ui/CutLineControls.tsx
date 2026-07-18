import { useStore } from '../state/store'

export function CutLineControls() {
  const { cutLine, setCutLine } = useStore()

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={cutLine.enabled}
          onChange={e => setCutLine({ enabled: e.target.checked })}
          className="accent-indigo-500 w-4 h-4"
        />
        <span className="text-xs text-zinc-300">Enable cut lines</span>
      </label>

      {cutLine.enabled && (
        <>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1 block">Color</label>
              <input
                type="color"
                value={cutLine.color}
                onChange={e => setCutLine({ color: e.target.value })}
                className="w-full h-9 rounded-lg border border-zinc-700 bg-zinc-800 cursor-pointer"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1 block">Width (mm)</label>
              <input
                type="number"
                min={0.1}
                max={2}
                step={0.1}
                value={cutLine.lineWidthMm}
                onChange={e => setCutLine({ lineWidthMm: Number(e.target.value) })}
                className="w-full bg-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1 block">Dash (mm)</label>
              <input
                type="number"
                min={0.5}
                max={10}
                step={0.5}
                value={cutLine.dashMm}
                onChange={e => setCutLine({ dashMm: Number(e.target.value) })}
                className="w-full bg-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-zinc-400 mb-1 block">Gap (mm)</label>
              <input
                type="number"
                min={0.5}
                max={10}
                step={0.5}
                value={cutLine.gapMm}
                onChange={e => setCutLine({ gapMm: Number(e.target.value) })}
                className="w-full bg-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Offset from edge (mm)</label>
            <input
              type="number"
              min={0}
              max={10}
              step={0.5}
              value={cutLine.offsetMm}
              onChange={e => setCutLine({ offsetMm: Number(e.target.value) })}
              className="w-full bg-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Live preview of dash pattern */}
          <div className="bg-zinc-900 rounded-lg p-3">
            <svg width="100%" height="16">
              {Array.from({ length: 10 }).map((_, i) => {
                const unit = cutLine.dashMm + cutLine.gapMm
                const pct = (cutLine.dashMm / (unit * 10)) * 100
                return (
                  <line
                    key={i}
                    x1={`${i * 10}%`}
                    y1="8"
                    x2={`${i * 10 + pct}%`}
                    y2="8"
                    stroke={cutLine.color}
                    strokeWidth={Math.max(1, cutLine.lineWidthMm * 3)}
                  />
                )
              })}
            </svg>
          </div>
        </>
      )}
    </div>
  )
}
