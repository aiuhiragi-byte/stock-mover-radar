import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { STOCKS } from '../src/data/stocks.ts'
import {
  DEFAULT_BATCH_INTERVAL_MS,
  DEFAULT_BATCH_SIZE,
  fetchQuoteBatch,
  TwelveDataApiError,
} from '../src/lib/twelvedata.ts'
import type { ResultEntry, ResultMap } from '../src/lib/types.ts'

const OUTPUT_PATH = fileURLToPath(new URL('../public/scan-results.json', import.meta.url))

function toNumber(value: string | undefined): number | null {
  if (value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function loadPreviousResults(): ResultMap {
  if (!existsSync(OUTPUT_PATH)) return {}
  try {
    const raw = JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8')) as { results?: ResultMap }
    return raw.results ?? {}
  } catch {
    return {}
  }
}

async function main() {
  const apiKey = process.env.TWELVEDATA_API_KEY
  if (!apiKey) {
    console.error('TWELVEDATA_API_KEY が設定されていません')
    process.exitCode = 1
    return
  }

  const previous = loadPreviousResults()
  const results: ResultMap = { ...previous }
  const batches = chunk(STOCKS, DEFAULT_BATCH_SIZE)
  let hadError = false

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    const codes = batch.map((s) => s.code)
    const metaByCode = new Map(batch.map((s) => [s.code, s]))

    try {
      const quotes = await fetchQuoteBatch(codes, apiKey)
      const fetchedAt = Date.now()

      for (const [code, outcome] of quotes) {
        const meta = metaByCode.get(code)
        if (!meta) continue
        const prevEntry = previous[code]

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
          results[code] = entry
        } else {
          results[code] = {
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

      console.log(`batch ${i + 1}/${batches.length} 取得完了 (${codes.length}件)`)
    } catch (err) {
      if (err instanceof TwelveDataApiError) {
        console.error(`Twelve Data APIエラー: ${err.message} (code=${err.code})`)
      } else {
        console.error('通信エラーが発生しました', err)
      }
      hadError = true
      break
    }

    const isLast = i === batches.length - 1
    if (!isLast) {
      await sleep(DEFAULT_BATCH_INTERVAL_MS)
    }
  }

  const output = { generatedAt: new Date().toISOString(), results }
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n')
  console.log(`wrote ${Object.keys(results).length} entries to ${OUTPUT_PATH}`)
  if (hadError) process.exitCode = 1
}

main()
