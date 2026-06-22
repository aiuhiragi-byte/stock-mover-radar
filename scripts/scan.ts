import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { STOCKS } from '../src/data/stocks.ts'
import { DEFAULT_BATCH_INTERVAL_MS, DEFAULT_CONCURRENCY, fetchQuote } from '../src/lib/yahoo.ts'
import type { ResultMap } from '../src/lib/types.ts'

const OUTPUT_PATH = fileURLToPath(new URL('../public/scan-results.json', import.meta.url))

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
  const previous = loadPreviousResults()
  const results: ResultMap = { ...previous }
  const batches = chunk(STOCKS, DEFAULT_CONCURRENCY)
  let successCount = 0

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]

    await Promise.all(
      batch.map(async (meta) => {
        const outcome = await fetchQuote(meta.code)
        const prevEntry = previous[meta.code]

        if (outcome.ok) {
          successCount++
          const { price, previousClose, volume, isMarketOpen } = outcome.quote
          const change = price - previousClose
          const percentChange = previousClose !== 0 ? (change / previousClose) * 100 : null
          results[meta.code] = {
            code: meta.code,
            name: meta.name,
            segment: meta.segment,
            price,
            previousClose,
            change,
            percentChange,
            volume,
            isMarketOpen,
            updatedAt: Date.now(),
            error: null,
          }
        } else {
          results[meta.code] = {
            code: meta.code,
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
      }),
    )

    console.log(`batch ${i + 1}/${batches.length} 取得完了 (${batch.length}件)`)

    const isLast = i === batches.length - 1
    if (!isLast) {
      await sleep(DEFAULT_BATCH_INTERVAL_MS)
    }
  }

  const output = { generatedAt: new Date().toISOString(), results }
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n')
  console.log(`wrote ${Object.keys(results).length} entries to ${OUTPUT_PATH} (成功: ${successCount}/${STOCKS.length})`)

  if (successCount === 0) {
    console.error('全銘柄の取得に失敗しました')
    process.exitCode = 1
  }
}

main()
