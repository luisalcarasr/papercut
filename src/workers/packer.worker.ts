/** Web Worker — runs heavy layout computation off the main thread */

import { optimizeLayout } from '../domain/layout/optimize'
import type { OptimizeInput, OptimizeResult } from '../domain/layout/optimize'
import { twoVertOneHoriz, multiImageRows, singleImageGrid } from '../domain/layout/mixed'
import type { MixedLayout } from '../domain/layout/mixed'

export type WorkerRequest =
  | { type: 'optimize';      id: string; payload: OptimizeInput }
  | { type: 'twoVertOneH';   id: string; payload: { paperW: number; paperH: number; ratio: number; gap: number; sourceIndex: number; half: 'left'|'right'|null } }
  | { type: 'multiRow';      id: string; payload: Parameters<typeof multiImageRows>[0] }
  | { type: 'singleGrid';    id: string; payload: Parameters<typeof singleImageGrid>[0] }

export type WorkerResponse =
  | { type: 'optimize';    id: string; result: OptimizeResult }
  | { type: 'twoVertOneH'; id: string; result: MixedLayout }
  | { type: 'multiRow';    id: string; result: MixedLayout }
  | { type: 'singleGrid';  id: string; result: MixedLayout }
  | { type: 'error';       id: string; message: string }

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { type, id } = e.data
  try {
    if (type === 'optimize') {
      const result = optimizeLayout(e.data.payload)
      self.postMessage({ type: 'optimize', id, result } satisfies WorkerResponse)
    } else if (type === 'twoVertOneH') {
      const { paperW, paperH, ratio, gap, sourceIndex, half } = e.data.payload
      const result = twoVertOneHoriz(paperW, paperH, ratio, gap, sourceIndex, half)
      self.postMessage({ type: 'twoVertOneH', id, result } satisfies WorkerResponse)
    } else if (type === 'multiRow') {
      const result = multiImageRows(e.data.payload)
      self.postMessage({ type: 'multiRow', id, result } satisfies WorkerResponse)
    } else if (type === 'singleGrid') {
      const result = singleImageGrid(e.data.payload)
      self.postMessage({ type: 'singleGrid', id, result } satisfies WorkerResponse)
    }
  } catch (err) {
    self.postMessage({ type: 'error', id, message: String(err) } satisfies WorkerResponse)
  }
}
