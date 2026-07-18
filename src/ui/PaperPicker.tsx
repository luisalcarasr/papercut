import { ALL_PAPERS } from '../domain/paper'
import { useStore } from '../state/store'

const FAMILIES = ['ISO-A', 'ISO-B', 'ANSI'] as const

export function PaperPicker() {
  const { paperId, orientation, setPaper, setOrientation } = useStore()

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Paper size</label>
        <select
          value={paperId}
          onChange={e => setPaper(e.target.value)}
          className="w-full bg-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-indigo-500"
        >
          {FAMILIES.map(fam => (
            <optgroup key={fam} label={fam}>
              {ALL_PAPERS.filter(p => p.family === fam).map(p => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.widthCm}×{p.heightCm} cm)
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Orientation</label>
        <div className="flex gap-2">
          {(['portrait', 'landscape', 'auto'] as const).map(o => (
            <button
              key={o}
              onClick={() => setOrientation(o)}
              className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                orientation === o
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-indigo-400'
              }`}
            >
              {o.charAt(0).toUpperCase() + o.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
