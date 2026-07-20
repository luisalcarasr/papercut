import { useStore } from '../state/store'
import { cmToIn, inToCm } from '../domain/units'
import { SMARTPHONE_PRESET } from '../domain/piece'
import { NumberField } from './NumberField'

export function SizeControls() {
  const {
    targetHeightCm, tolerancePct, sameHeight, unit,
    setTargetHeightCm, setTolerancePct, setSameHeight,
  } = useStore()

  const displayH = unit === 'cm' ? targetHeightCm : cmToIn(targetHeightCm)

  return (
    <div className="space-y-4">

      {/* Target height */}
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">
          Global target height ({unit})
        </label>
        <div className="flex gap-2">
          <NumberField
            value={displayH}
            onChange={v => setTargetHeightCm(unit === 'cm' ? v : inToCm(v))}
            min={0.5}
            max={200}
            step={unit === 'cm' ? 0.5 : 0.25}
            decimals={unit === 'cm' ? 1 : 2}
            suffix={unit}
            className="flex-1"
          />
          <button
            onClick={() => setTargetHeightCm(SMARTPHONE_PRESET.heightCm)}
            className="shrink-0 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-3 py-2 rounded-lg transition-colors"
            title={`Smartphone (~${SMARTPHONE_PRESET.heightCm} cm)`}
          >
            📱
          </button>
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          Individual images can override this in the Layout tab
        </p>
      </div>

      {/* Tolerance */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-zinc-400">Tolerance</label>
          <span className="text-xs text-zinc-300 font-medium">±{tolerancePct}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={30}
          step={1}
          value={tolerancePct}
          onChange={e => setTolerancePct(Number(e.target.value))}
          className="w-full accent-indigo-500"
        />
        <div className="flex justify-between text-xs text-zinc-600 mt-0.5">
          <span>0%</span>
          <span>30%</span>
        </div>
      </div>

      {/* Same height toggle */}
      <label className="flex items-center gap-3 cursor-pointer py-1">
        <input
          type="checkbox"
          checked={sameHeight}
          onChange={e => setSameHeight(e.target.checked)}
          className="accent-indigo-500 w-4 h-4 shrink-0"
        />
        <span className="text-xs text-zinc-300">Same height for all images</span>
      </label>

      {/* Presets */}
      <div>
        <label className="text-xs text-zinc-400 mb-2 block">Presets</label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: '📱 Smartphone', h: 15.4 },
            { label: '💳 Card',       h: 8.56 },
            { label: '4×6 photo',     h: 15.24 },
            { label: '5×7 photo',     h: 17.78 },
          ].map(p => {
            const display = unit === 'cm' ? p.h.toFixed(1) : cmToIn(p.h).toFixed(2)
            return (
              <button
                key={p.label}
                onClick={() => setTargetHeightCm(p.h)}
                className="text-left px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-indigo-500 text-xs text-zinc-300 transition-colors"
              >
                <span className="block font-medium">{p.label}</span>
                <span className="text-zinc-500">{display} {unit}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
