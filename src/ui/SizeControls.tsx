import { useStore } from '../state/store'
import { inToCm, cmToIn } from '../domain/units'
import { SMARTPHONE_PRESET } from '../domain/piece'

export function SizeControls() {
  const {
    targetHeightCm, tolerancePct, sameHeight, unit,
    setTargetHeightCm, setTolerancePct, setSameHeight,
  } = useStore()

  const displayH = unit === 'cm' ? targetHeightCm : cmToIn(targetHeightCm)
  const step = unit === 'cm' ? 0.5 : 0.2

  const handleH = (v: string) => {
    const n = parseFloat(v)
    if (isNaN(n)) return
    setTargetHeightCm(unit === 'cm' ? n : inToCm(n))
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">
          Target height ({unit})
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={displayH.toFixed(unit === 'cm' ? 1 : 2)}
            step={step}
            min={1}
            onChange={e => handleH(e.target.value)}
            className="flex-1 bg-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => setTargetHeightCm(SMARTPHONE_PRESET.heightCm)}
            className="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-3 py-2 rounded-lg transition-colors"
            title="Set smartphone height (~15.4 cm)"
          >
            📱
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs text-zinc-400 mb-1 block">
          Tolerance ±{tolerancePct}%
        </label>
        <input
          type="range"
          min={0}
          max={30}
          step={1}
          value={tolerancePct}
          onChange={e => setTolerancePct(Number(e.target.value))}
          className="w-full accent-indigo-500"
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={sameHeight}
          onChange={e => setSameHeight(e.target.checked)}
          className="accent-indigo-500 w-4 h-4"
        />
        <span className="text-xs text-zinc-300">Same height for all images</span>
      </label>
    </div>
  )
}
