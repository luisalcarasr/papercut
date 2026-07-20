import { useStore } from '../state/store'
import { maxHeightCm } from '../state/store'
import { cmToIn } from '../domain/units'
import { HeightSlider } from './HeightSlider'

export function SizeControls() {
  const {
    targetHeightCm, tolerancePct, sameHeight, unit,
    paperId, orientation,
    setTargetHeightCm, setTolerancePct, setSameHeight,
  } = useStore()

  const maxCm = maxHeightCm(paperId, orientation)

  const PRESETS = [
    { label: '📱 Smartphone', h: 15.4  },
    { label: '💳 Card',       h: 8.56  },
    { label: '4×6 photo',     h: 15.24 },
    { label: '5×7 photo',     h: 17.78 },
  ]

  return (
    <div className="space-y-5">

      {/* Global height slider */}
      <div>
        <HeightSlider
          value={targetHeightCm}
          onChange={setTargetHeightCm}
          maxCm={maxCm}
          unit={unit}
          label="Global target height"
        />
        <p className="text-xs text-zinc-500 mt-2">
          Individual images can override this in the Layout tab
        </p>
      </div>

      {/* Presets */}
      <div>
        <label className="text-xs text-zinc-400 mb-2 block">Presets</label>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map(p => {
            const display = unit === 'cm' ? p.h.toFixed(1) : cmToIn(p.h).toFixed(2)
            const active  = Math.abs(targetHeightCm - p.h) < 0.05
            return (
              <button
                key={p.label}
                onClick={() => setTargetHeightCm(Math.min(p.h, maxCm))}
                className={`text-left px-2.5 py-2 rounded-lg border text-xs transition-colors ${
                  active
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 hover:border-indigo-500 text-zinc-300'
                }`}
              >
                <span className="block font-medium">{p.label}</span>
                <span className={active ? 'text-indigo-200' : 'text-zinc-500'}>
                  {display} {unit}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tolerance */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-zinc-400">Auto-layout tolerance</label>
          <span className="text-xs font-semibold text-indigo-300">±{tolerancePct}%</span>
        </div>
        <div className="relative flex items-center h-8">
          <div className="absolute inset-x-0 h-2 rounded-full bg-zinc-700 pointer-events-none" />
          <div
            className="absolute left-0 h-2 rounded-full bg-indigo-500 pointer-events-none"
            style={{ width: `${(tolerancePct / 30) * 100}%` }}
          />
          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={tolerancePct}
            onChange={e => setTolerancePct(Number(e.target.value))}
            className="relative w-full appearance-none bg-transparent cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-6
              [&::-webkit-slider-thumb]:h-6
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-indigo-400
              [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-indigo-300
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-moz-range-thumb]:w-6
              [&::-moz-range-thumb]:h-6
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-indigo-400
              [&::-moz-range-thumb]:border-2
              [&::-moz-range-thumb]:border-indigo-300
              focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          />
        </div>
        <div className="flex justify-between text-xs text-zinc-600 mt-0.5">
          <span>0%</span>
          <span>30%</span>
        </div>
      </div>

      {/* Same height toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={sameHeight}
          onChange={e => setSameHeight(e.target.checked)}
          className="accent-indigo-500 w-4 h-4 shrink-0"
        />
        <span className="text-xs text-zinc-300">Same height for all images</span>
      </label>

    </div>
  )
}
