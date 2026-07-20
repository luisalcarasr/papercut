import { useStore, maxHeightCm } from '../state/store'
import type { LayoutMode, CountMode, SizeMode, ImageSlotConfig } from '../state/store'
import { NumberField, IntField } from './NumberField'
import { HeightSlider } from './HeightSlider'
import { cmToIn, inToCm } from '../domain/units'

// ── Mode definitions ──────────────────────────────────────────────────────────
const MODES: { id: LayoutMode; label: string; desc: string }[] = [
  { id: 'auto',       label: 'Auto',           desc: 'Best layout chosen automatically' },
  { id: 'multiImage', label: 'Multi-image',    desc: 'N images with count & size per image' },
  { id: 'grid',       label: 'Grid N×M',       desc: 'Uniform grid, same piece' },
  { id: 'twoVertOneH', label: '2V + 1H',       desc: '2 vertical + 1 horizontal rotated' },
  { id: 'guillotine', label: 'Guillotine',      desc: '2D packing, max coverage' },
]

// ── Per-image slot card ───────────────────────────────────────────────────────
function SlotCard({
  slot, idx, unit, globalHeight, maxCm,
}: {
  slot: ImageSlotConfig
  idx: number
  unit: 'cm' | 'in'
  globalHeight: number
  maxCm: number
}) {
  const { updateSlot, sources } = useStore()
  const src = sources.find(s => s.id === slot.sourceId)

  const resolvedH = slot.sizeMode === 'height' && slot.heightCm ? slot.heightCm : globalHeight

  return (
    <div className="bg-zinc-800 rounded-xl p-3 space-y-3 border border-zinc-700">
      {/* Header */}
      <div className="flex items-center gap-2 min-w-0">
        {src && (
          <img src={src.dataUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-200 truncate">
            #{idx + 1} {src?.name ?? slot.sourceId}
          </p>
          <p className="text-xs text-zinc-500">
            {src ? `${src.naturalWidth}×${src.naturalHeight}px` : ''}
          </p>
        </div>
      </div>

      {/* Crop half */}
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Crop</label>
        <div className="flex gap-1">
          {(['full', 'left', 'right'] as const).map(h => (
            <button
              key={h}
              onClick={() => updateSlot(idx, { half: h === 'full' ? null : h })}
              className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                (h === 'full' && slot.half === null) || slot.half === h
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-zinc-700 border-zinc-600 text-zinc-300 hover:border-indigo-400'
              }`}
            >
              {h === 'full' ? 'Full' : h === 'left' ? '← Left' : 'Right →'}
            </button>
          ))}
        </div>
      </div>

      {/* Size */}
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Height</label>
        <div className="flex gap-1 mb-1.5">
          {(['inherit', 'height'] as SizeMode[]).map(m => (
            <button
              key={m}
              onClick={() => updateSlot(idx, { sizeMode: m, heightCm: m === 'height' ? resolvedH : undefined })}
              className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                slot.sizeMode === m
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-zinc-700 border-zinc-600 text-zinc-300 hover:border-indigo-400'
              }`}
            >
              {m === 'inherit' ? 'Global' : 'Custom'}
            </button>
          ))}
        </div>
        {slot.sizeMode === 'height' && (
          <HeightSlider
            value={slot.heightCm ?? resolvedH}
            onChange={v => updateSlot(idx, { heightCm: v })}
            maxCm={maxCm}
            unit={unit}
          />
        )}
        {slot.sizeMode === 'inherit' && (
          <p className="text-xs text-zinc-500">
            Using global: {unit === 'cm' ? globalHeight.toFixed(1) : (globalHeight / 2.54).toFixed(2)} {unit}
          </p>
        )}
      </div>

      {/* Count */}
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">Quantity</label>
        <div className="flex gap-1 mb-1.5">
          {([
            { id: 'fill' as CountMode, label: 'Fill' },
            { id: 'exact' as CountMode, label: 'Exact' },
            { id: 'percent' as CountMode, label: '%' },
          ]).map(m => (
            <button
              key={m.id}
              onClick={() => updateSlot(idx, { countMode: m.id })}
              className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors ${
                slot.countMode === m.id
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-zinc-700 border-zinc-600 text-zinc-300 hover:border-indigo-400'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {slot.countMode === 'exact' && (
          <IntField
            value={slot.count ?? 1}
            onChange={v => updateSlot(idx, { count: Math.max(1, v) })}
            min={1}
            max={999}
            className="w-full"
            placeholder="copies"
          />
        )}
        {slot.countMode === 'percent' && (
          <NumberField
            value={slot.percent ?? 50}
            onChange={v => updateSlot(idx, { percent: Math.max(1, Math.min(100, v)) })}
            min={1}
            max={100}
            decimals={0}
            suffix="%"
            className="w-full"
          />
        )}
        {slot.countMode === 'fill' && (
          <p className="text-xs text-zinc-500">Fills remaining space on the sheet</p>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function LayoutControls() {
  const {
    layoutMode, gridCols, gridRows, gap, slots, sources,
    targetHeightCm, unit, paperId, orientation,
    setLayoutMode, setGridCols, setGridRows, setGap,
  } = useStore()

  const maxCm = maxHeightCm(paperId, orientation)

  return (
    <div className="space-y-4">

      {/* Mode selector */}
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
              <span className={`ml-2 ${layoutMode === m.id ? 'text-indigo-200' : 'text-zinc-500'}`}>
                {m.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid NxM controls */}
      {layoutMode === 'grid' && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-zinc-400 mb-1 block">Cols</label>
            <IntField value={gridCols} onChange={setGridCols} min={1} max={20} className="w-full" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-zinc-400 mb-1 block">Rows</label>
            <IntField value={gridRows} onChange={setGridRows} min={1} max={20} className="w-full" />
          </div>
        </div>
      )}

      {/* Gap */}
      <div>
        <label className="text-xs text-zinc-400 mb-1 block">
          Gap / margin ({unit === 'cm' ? 'cm' : 'in'})
        </label>
        <NumberField
          value={unit === 'cm' ? gap : cmToIn(gap)}
          onChange={v => setGap(unit === 'cm' ? v : inToCm(v))}
          min={0}
          max={10}
          step={unit === 'cm' ? 0.1 : 0.05}
          decimals={unit === 'cm' ? 1 : 2}
          suffix={unit}
          className="w-full"
        />
      </div>

      {/* Per-image cards */}
      {sources.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-400">
              Images ({sources.length})
            </label>
          </div>

          {sources.map((src, i) => {
            const slot = slots.find(s => s.sourceId === src.id) ?? {
              sourceId: src.id, half: null, sizeMode: 'inherit' as const, countMode: 'fill' as const,
            }
            return (
              <SlotCard
                key={src.id}
                slot={slot}
                idx={i}
                unit={unit}
                globalHeight={targetHeightCm}
                maxCm={maxCm}
              />
            )
          })}
        </div>
      )}

      {sources.length === 0 && (
        <p className="text-xs text-zinc-500 text-center py-4">
          Add images to configure per-image settings
        </p>
      )}
    </div>
  )
}
