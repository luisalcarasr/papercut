/**
 * HeightSlider — potentiometer-style range input for image height.
 * Operates in cm internally; displays in the active unit (cm / in).
 * Range: 0.5 cm → maxCm (dynamic, based on current paper).
 * Step: 0.1 cm for fine control; arrow keys also move by 0.1 cm.
 */
import { cmToIn } from '../domain/units'

interface Props {
  value: number          // cm
  onChange: (cm: number) => void
  maxCm: number          // dynamic paper height cap
  unit: 'cm' | 'in'
  label?: string
}

const MIN_CM   = 0.5
const STEP_CM  = 0.1

function fmt(cm: number, unit: 'cm' | 'in', d = 1): string {
  if (unit === 'cm') return cm.toFixed(d)
  return cmToIn(cm).toFixed(d + 1)
}

/** Maps 0-1 fraction → visual fill percentage for the track */
function pct(value: number, min: number, max: number): number {
  if (max <= min) return 0
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
}

export function HeightSlider({ value, onChange, maxCm, unit, label }: Props) {
  const clamped = Math.max(MIN_CM, Math.min(maxCm, value))
  const fillPct = pct(clamped, MIN_CM, maxCm)

  const handle = (raw: string) => {
    const n = parseFloat(raw)
    if (!isNaN(n)) onChange(Math.max(MIN_CM, Math.min(maxCm, Math.round(n / STEP_CM) * STEP_CM)))
  }

  return (
    <div className="space-y-1.5">
      {/* Label row with live value */}
      <div className="flex items-center justify-between">
        {label && <span className="text-xs text-zinc-400">{label}</span>}
        <span className="text-sm font-semibold text-indigo-300 tabular-nums ml-auto">
          {fmt(clamped, unit)} <span className="text-xs font-normal text-zinc-400">{unit}</span>
        </span>
      </div>

      {/* Slider */}
      <div className="relative flex items-center h-8">
        {/* Track background */}
        <div className="absolute inset-x-0 h-2 rounded-full bg-zinc-700 pointer-events-none" />
        {/* Filled track */}
        <div
          className="absolute left-0 h-2 rounded-full bg-indigo-500 pointer-events-none"
          style={{ width: `${fillPct}%` }}
        />
        <input
          type="range"
          min={MIN_CM}
          max={maxCm}
          step={STEP_CM}
          value={clamped}
          onChange={e => handle(e.target.value)}
          className="relative w-full appearance-none bg-transparent cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-6
            [&::-webkit-slider-thumb]:h-6
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-indigo-400
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-indigo-300
            [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:shadow-indigo-900/50
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-webkit-slider-thumb]:active:scale-125
            [&::-moz-range-thumb]:w-6
            [&::-moz-range-thumb]:h-6
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-indigo-400
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-indigo-300
            [&::-moz-range-thumb]:shadow-lg
            focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
        />
      </div>

      {/* Min / max labels */}
      <div className="flex justify-between text-xs text-zinc-600 select-none">
        <span>{fmt(MIN_CM, unit)} {unit}</span>
        <span>{fmt(maxCm, unit)} {unit}</span>
      </div>
    </div>
  )
}
