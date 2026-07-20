/**
 * NumberField — numeric input that commits on blur/Enter, not on every keystroke.
 * Prevents cursor-jumping and mid-edit reformatting.
 */
import { useState, useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'

interface Props {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  decimals?: number
  className?: string
  suffix?: string
  placeholder?: string
}

export function NumberField({
  value, onChange,
  min, max, step = 1,
  decimals = 1,
  className = '',
  suffix,
  placeholder,
}: Props) {
  const [raw, setRaw] = useState<string>(value.toFixed(decimals))
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync external value changes while not focused
  useEffect(() => {
    if (!focused) setRaw(value.toFixed(decimals))
  }, [value, focused, decimals])

  const commit = () => {
    const n = parseFloat(raw.replace(',', '.'))
    if (isNaN(n)) {
      // Revert to last known good value
      setRaw(value.toFixed(decimals))
      return
    }
    const clamped = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, n))
    setRaw(clamped.toFixed(decimals))
    onChange(clamped)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter')  { commit(); inputRef.current?.blur() }
    if (e.key === 'Escape') { setRaw(value.toFixed(decimals)); inputRef.current?.blur() }
    // Arrow keys: step
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const delta = e.key === 'ArrowUp' ? step : -step
      const next  = Math.max(min ?? -Infinity, Math.min(max ?? Infinity, value + delta))
      onChange(next)
      setRaw(next.toFixed(decimals))
    }
  }

  const base = `bg-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 border border-zinc-700
    focus:outline-none focus:border-indigo-500 transition-colors`

  return (
    <div className="relative flex items-center">
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={raw}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); commit() }}
        onChange={e => setRaw(e.target.value)}
        onKeyDown={onKeyDown}
        className={`${base} ${suffix ? 'pr-8' : ''} ${className}`}
      />
      {suffix && (
        <span className="absolute right-3 text-xs text-zinc-500 pointer-events-none select-none">
          {suffix}
        </span>
      )}
    </div>
  )
}

/** Integer-only variant */
export function IntField(props: Omit<Props, 'decimals' | 'step'> & { step?: number }) {
  return <NumberField {...props} decimals={0} step={props.step ?? 1} />
}
