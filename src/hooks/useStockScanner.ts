import { useCallback, useRef, useState } from 'react'
import type { StockMeta } from '../data/stocks'
import {
  DEFAULT_BATCH_INTERVAL_MS,
  DEFAULT_BATCH_SIZE,
  fetchQuoteBatch,
  TwelveDataApiError,
} from '../lib/twelvedata'
import { STORAGE_KEYS } from '../lib/storage'
import type { ResultEntry, ResultMap, ScanStatus } from '../lib/types'
import { useLocalStorageState } from './useLocalStorageState'

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

function toNumber(value: string | undefined): number | null {
  if (value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

async function interruptibleWait(ms: number, cancelledRef: { current: boolean }) {
  const step = 250
  let elapsed = 0
  while (elapsed < ms && !cancelledRef.current) {
    await new Promise((resolve) => setTimeout(resolve, step))
    elapsed += step
  }
}

export function useStockScanner(apiKey: string) {
  const [results, setResults] = useLocalStorageState<ResultMap>(STORAGE_KEYS.results, {})
  const [status, setStatus] = useState<ScanStatus>('idle')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [fatalError, setFatalError] = useState<string | null>(null)
  const [nextBatchAt, setNextBatchAt] = useState<number | null>(null)

  const cancelledRef = useRef(false)
  const runningRef = useRef(false)

  const stop = useCallback(() => {
    cancelledRef.current = true
    setNextBatchAt(null)
  }, [])

  const start = useCallback(
    async (
      stocks: StockMeta[],
      options?: { batchSize?: number; intervalMs?: number },
    ) => {
      if (runningRef.current) return
      if (!apiKey) {
        setFatalError('APIキーが設定されていません。設定からTwelve DataのAPIキーを入力してください。')
        setStatus('error')
        return
      }
      if (stocks.length === 0) return

      const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE
      const intervalMs = options?.intervalMs ?? DEFAULT_BATCH_INTERVAL_MS

      runningRef.current = true
      cancelledRef.current = false
      setFatalError(null)
      setStatus('scanning')
      const batches = chunk(stocks, batchSize)
      setProgress({ done: 0, total: stocks.length })
      let hadFatalError = false

      for (let i = 0; i < batches.length; i++) {
        if (cancelledRef.current) break
        const batch = batches[i]
        const codes = batch.map((s) => s.code)
        const metaByCode = new Map(batch.map((s) => [s.code, s]))

        try {
          const quotes = await fetchQuoteBatch(codes, apiKey)
          const fetchedAt = Date.now()

          setResults((prev) => {
            const next = { ...prev }
            for (const [code, outcome] of quotes) {
              const meta = metaByCode.get(code)
              if (!meta) continue
              if (outcome.ok) {
                const q = outcome.quote
                const entry: ResultEntry = {
                  code,
                  name: meta.name,
                  segment: meta.segment,
                  price: toNumber(q.close),
                  previousClose: toNumber(q.previous_close),
                  change: toNumber(q.change),
                  percentChange: toNumber(q.percent_change),
                  volume: toNumber(q.volume),
                  isMarketOpen: q.is_market_open ?? null,
                  updatedAt: fetchedAt,
                  error: null,
                }
                next[code] = entry
              } else {
                const prevEntry = prev[code]
                next[code] = {
                  code,
                  name: meta.name,
                  segment: meta.segment,
                  price: prevEntry?.price ?? null,
                  previousClose: prevEntry?.previousClose ?? null,
                  change: prevEntry?.change ?? null,
                  percentChange: prevEntry?.percentChange ?? null,
                  volume: prevEntry?.volume ?? null,
                  isMarketOpen: prevEntry?.isMarketOpen ?? null,
                  updatedAt: prevEntry?.updatedAt ?? null,
                  error: outcome.error,
                }
              }
            }
            return next
          })

          setProgress((p) => ({ ...p, done: Math.min(p.total, p.done + batch.length) }))
        } catch (err) {
          if (err instanceof TwelveDataApiError) {
            const hint =
              err.code === 401 || err.code === 403
                ? 'APIキーが無効です。設定を確認してください。'
                : err.code === 429
                  ? 'APIの利用上限（レート制限）に達しました。しばらく待ってから再試行してください。'
                  : err.message
            setFatalError(hint)
          } else {
            setFatalError('通信エラーが発生しました。ネットワーク接続を確認してください。')
          }
          setStatus('error')
          hadFatalError = true
          cancelledRef.current = true
          break
        }

        const isLast = i === batches.length - 1
        if (!isLast && !cancelledRef.current) {
          setNextBatchAt(Date.now() + intervalMs)
          await interruptibleWait(intervalMs, cancelledRef)
          setNextBatchAt(null)
        }
      }

      runningRef.current = false
      setNextBatchAt(null)
      if (!cancelledRef.current) {
        setStatus('done')
      } else if (!hadFatalError) {
        setStatus('stopped')
      }
    },
    [apiKey, setResults],
  )

  return { results, status, progress, fatalError, nextBatchAt, start, stop }
}
