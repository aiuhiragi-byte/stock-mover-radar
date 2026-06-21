import type { Segment } from '../data/stocks'

export interface ResultEntry {
  code: string
  name: string
  segment: Segment
  price: number | null
  previousClose: number | null
  change: number | null
  percentChange: number | null
  volume: number | null
  isMarketOpen: boolean | null
  updatedAt: number | null
  error: string | null
}

export type ResultMap = Record<string, ResultEntry>
