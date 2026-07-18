import { useStore } from '../state/store'
import type { LayoutMode } from '../state/store'

const MODES: { id: LayoutMode; label: string; desc: string }[] = [
  { id: 'auto',        label: 'Auto',           desc: 'Best layout chosen automatically' },
  { id: 'grid',        label: 'Grid N×M',        desc: 'Uniform grid, same piece' },
  { id: 'twoVertOneH', label: '2V + 1H',         desc: '2 vertical + 1 horizontal rotated' },
  { id: 'multiRow',    label: 'Multi-image rows', desc: 'Mix images by row with minimums' },
  { id: 'guillotine',  label: 'Guillotine',       desc: '2D packing, max coverage' },
]

export function LayoutControls() {
  const {
    layoutMode, gridCols, gridRows, gap, slots, sources,
    setLayoutMode, setGridCols, setGridRows, setGap,
    updateSlotMin, updateSlotHalf, setSlots,
  } = useStore()

  // Sync slots with sources when sources change
  const syncSlots = () => {
    const newSlots = sources.map(src => {
      const existing = slots.find(s => s.sourceId === src.id)
      return existing ?? { sourceId: src.id, minCount: 1, half: null as null }
    })
    setSlots(newSlots)
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Layout mode</label>
        <div className="grid grid-cols-1 gap-1">
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setLayoutMode(m.id)}
              className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                layoutMode === m.id
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-indigo-400'
              }`}
            >
              <span className="font-medium">{m.label}</span>
              <span className="text-zinc-400 ml-2">{m.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {layoutMode === 'grid' && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-zinc-400 mb-1 block">Cols</label>
            <input type="number" min={1} max={20} value={gridCols}
              onChange={e => setGridCols(Number(e.target.value))}
              className="w-full bg-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-zinc-400 mb-1 block">Rows</label>
            <input type="number" min={1} max={20} value={gridRows}
              onChange={e => setGridRows(Number(e.target.value))}
              className="w-full bg-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      )}

      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Gap / margin (cm)</label>
        <input type="number" min={0} max={5} step={0.1} value={gap}
          onChange={e => setGap(Number(e.target.value))}
          className="w-full bg-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {sources.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-400">Image slots</label>
            <button onClick={syncSlots} className="text-xs text-indigo-400 hover:text-indigo-300">
              Sync
            </button>
          </div>
          {slots.map((slot, idx) => {
            const src = sources.find(s => s.id === slot.sourceId)
            return (
              <div key={slot.sourceId} className="bg-zinc-800 rounded-lg p-2 space-y-1">
                <p className="text-xs text-zinc-300 truncate">#{idx+1} {src?.name ?? slot.sourceId}</p>
                <div className="flex gap-2 items-center">
                  <label className="text-xs text-zinc-500">Min copies</label>
                  <input type="number" min={0} max={100} value={slot.minCount}
                    onChange={e => updateSlotMin(idx, Number(e.target.value))}
                    className="w-16 bg-zinc-700 text-zinc-100 text-xs rounded px-2 py-1 border border-zinc-600"
                  />
                  <label className="text-xs text-zinc-500 ml-2">Half</label>
                  <select value={slot.half ?? 'none'}
                    onChange={e => updateSlotHalf(idx, e.target.value === 'none' ? null : e.target.value as 'left'|'right')}
                    className="bg-zinc-700 text-zinc-100 text-xs rounded px-2 py-1 border border-zinc-600"
                  >
                    <option value="none">Full</option>
                    <option value="left">Left half</option>
                    <option value="right">Right half</option>
                  </select>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
