/** Zustand store with LocalStorage persistence */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ImageSource } from '../domain/piece'
import type { CutLineConfig } from '../domain/cutlines'
import { DEFAULT_CUT_LINE } from '../domain/cutlines'
import type { PaperOrientation } from '../domain/paper'
import type { MixedCell } from '../domain/layout/mixed'
import type { GridCell } from '../domain/layout/grid'
import type { Unit } from '../domain/units'

export type LayoutMode = 'grid' | 'twoVertOneH' | 'multiImage' | 'guillotine' | 'auto'

export type CountMode = 'fill' | 'exact' | 'percent'
export type SizeMode  = 'inherit' | 'height'

export interface ImageSlotConfig {
  sourceId:  string
  half:      'left' | 'right' | null
  // Size
  sizeMode:  SizeMode
  heightCm?: number       // used when sizeMode='height'
  // Count
  countMode: CountMode
  count?:    number       // used when countMode='exact'
  percent?:  number       // used when countMode='percent' (0-100)
}

function defaultSlot(sourceId: string): ImageSlotConfig {
  return {
    sourceId,
    half:      null,
    sizeMode:  'inherit',
    countMode: 'fill',
  }
}

export interface AppState {
  // ── Images ──────────────────────────────────────────────────────────────
  sources: ImageSource[]
  addSource:    (src: ImageSource) => void
  removeSource: (id: string) => void
  clearSources: () => void

  // ── Paper ────────────────────────────────────────────────────────────────
  paperId:      string
  orientation:  PaperOrientation | 'auto'
  setPaper:       (id: string) => void
  setOrientation: (o: PaperOrientation | 'auto') => void

  // ── Size (global) ─────────────────────────────────────────────────────────
  targetHeightCm: number
  tolerancePct:   number
  sameHeight:     boolean
  setTargetHeightCm: (h: number) => void
  setTolerancePct:   (t: number) => void
  setSameHeight:     (v: boolean) => void

  // ── Layout ───────────────────────────────────────────────────────────────
  layoutMode: LayoutMode
  gridCols:   number
  gridRows:   number
  gap:        number
  slots:      ImageSlotConfig[]
  setLayoutMode: (m: LayoutMode) => void
  setGridCols:   (n: number) => void
  setGridRows:   (n: number) => void
  setGap:        (g: number) => void

  /** Ensure slots are in sync with sources (called by engine on each compute) */
  ensureSlots: () => void
  updateSlot:  (idx: number, patch: Partial<ImageSlotConfig>) => void

  // ── Cut lines ────────────────────────────────────────────────────────────
  cutLine:    CutLineConfig
  setCutLine: (cfg: Partial<CutLineConfig>) => void

  // ── Units ────────────────────────────────────────────────────────────────
  unit:    Unit
  setUnit: (u: Unit) => void

  // ── Computed layout ──────────────────────────────────────────────────────
  cells:       (GridCell | MixedCell)[]
  coveragePct: number
  setCells:    (cells: (GridCell | MixedCell)[], coverage: number) => void

  // ── Persist helpers ──────────────────────────────────────────────────────
  exportSettings: () => object
  importSettings: (data: object) => void
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Images ────────────────────────────────────────────────────────────
      sources: [],
      addSource: src =>
        set(s => ({
          sources: [...s.sources, src],
          // Auto-create slot for new image
          slots: [...s.slots, defaultSlot(src.id)],
        })),
      removeSource: id =>
        set(s => ({
          sources: s.sources.filter(x => x.id !== id),
          slots:   s.slots.filter(x => x.sourceId !== id),
        })),
      clearSources: () => set({ sources: [], slots: [] }),

      // ── Paper ──────────────────────────────────────────────────────────────
      paperId:     'ANSI-B',
      orientation: 'portrait',
      setPaper:       id => set({ paperId: id }),
      setOrientation: o  => set({ orientation: o }),

      // ── Size ───────────────────────────────────────────────────────────────
      targetHeightCm: 14,
      tolerancePct:   10,
      sameHeight:     true,
      setTargetHeightCm: h => set({ targetHeightCm: h }),
      setTolerancePct:   t => set({ tolerancePct: t }),
      setSameHeight:     v => set({ sameHeight: v }),

      // ── Layout ─────────────────────────────────────────────────────────────
      layoutMode: 'auto',
      gridCols:   2,
      gridRows:   2,
      gap:        0.4,
      slots:      [],
      setLayoutMode: m => set({ layoutMode: m }),
      setGridCols:   n => set({ gridCols: n }),
      setGridRows:   n => set({ gridRows: n }),
      setGap:        g => set({ gap: g }),

      ensureSlots: () => {
        const { sources, slots } = get()
        const sourceIds = sources.map(s => s.id)
        // Remove orphaned slots, add missing ones, preserve order of sources
        const updated = sources.map(src => {
          const existing = slots.find(sl => sl.sourceId === src.id)
          return existing ?? defaultSlot(src.id)
        })
        // Only update if something actually changed
        const changed =
          updated.length !== slots.length ||
          updated.some((s, i) => s.sourceId !== slots[i]?.sourceId)
        if (changed) set({ slots: updated })
        void sourceIds // satisfy linter
      },

      updateSlot: (idx, patch) =>
        set(s => {
          const slots = [...s.slots]
          if (!slots[idx]) return {}
          slots[idx] = { ...slots[idx], ...patch }
          return { slots }
        }),

      // ── Cut lines ──────────────────────────────────────────────────────────
      cutLine:    DEFAULT_CUT_LINE,
      setCutLine: cfg => set(s => ({ cutLine: { ...s.cutLine, ...cfg } })),

      // ── Units ──────────────────────────────────────────────────────────────
      unit:    'cm',
      setUnit: u => set({ unit: u }),

      // ── Computed layout ────────────────────────────────────────────────────
      cells:       [],
      coveragePct: 0,
      setCells:    (cells, coveragePct) => set({ cells, coveragePct }),

      // ── Export / import ────────────────────────────────────────────────────
      exportSettings: () => {
        const s = get()
        return {
          paperId:        s.paperId,
          orientation:    s.orientation,
          targetHeightCm: s.targetHeightCm,
          tolerancePct:   s.tolerancePct,
          sameHeight:     s.sameHeight,
          layoutMode:     s.layoutMode,
          gridCols:       s.gridCols,
          gridRows:       s.gridRows,
          gap:            s.gap,
          slots:          s.slots,
          cutLine:        s.cutLine,
          unit:           s.unit,
        }
      },
      importSettings: (data: any) => {
        set({
          paperId:        data.paperId        ?? 'ANSI-B',
          orientation:    data.orientation    ?? 'portrait',
          targetHeightCm: data.targetHeightCm ?? 14,
          tolerancePct:   data.tolerancePct   ?? 10,
          sameHeight:     data.sameHeight      ?? true,
          layoutMode:     data.layoutMode     ?? 'auto',
          gridCols:       data.gridCols       ?? 2,
          gridRows:       data.gridRows       ?? 2,
          gap:            data.gap            ?? 0.4,
          slots:          data.slots          ?? [],
          cutLine:        { ...DEFAULT_CUT_LINE, ...(data.cutLine ?? {}) },
          unit:           data.unit           ?? 'cm',
        })
      },
    }),
    {
      name: 'papercut-state-v2',  // bump version to avoid old schema conflicts
      partialize: s => ({
        paperId:        s.paperId,
        orientation:    s.orientation,
        targetHeightCm: s.targetHeightCm,
        tolerancePct:   s.tolerancePct,
        sameHeight:     s.sameHeight,
        layoutMode:     s.layoutMode,
        gridCols:       s.gridCols,
        gridRows:       s.gridRows,
        gap:            s.gap,
        slots:          s.slots,
        cutLine:        s.cutLine,
        unit:           s.unit,
      }),
    },
  ),
)
