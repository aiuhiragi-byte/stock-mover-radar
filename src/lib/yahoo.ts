const API_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'

/** 東証上場銘柄を示す Yahoo Finance のティッカー接尾辞 */
const EXCHANGE_SUFFIX = '.T'

/** 非公式APIのため明示的なレート制限は無いが、同時実行数・間隔を抑えて利用する */
export const DEFAULT_CONCURRENCY = 5
export const DEFAULT_BATCH_INTERVAL_MS = 300

export interface YahooQuote {
  price: number
  previousClose: number
  volume: number | null
  isMarketOpen: boolean | null
}

export type QuoteOrError = { ok: true; quote: YahooQuote } | { ok: false; error: string }

interface YahooChartMeta {
  regularMarketPrice?: number
  chartPreviousClose?: number
  regularMarketVolume?: number
  currentTradingPeriod?: {
    regular?: { start?: number; end?: number }
  }
}

interface YahooChartResponse {
  chart: {
    result?: Array<{ meta?: YahooChartMeta }> | null
    error?: { code?: string; description?: string } | null
  }
}

function deriveIsMarketOpen(meta: YahooChartMeta): boolean | null {
  const regular = meta.currentTradingPeriod?.regular
  if (!regular?.start || !regular?.end) return null
  const nowSec = Date.now() / 1000
  return nowSec >= regular.start && nowSec <= regular.end
}

/**
 * Yahoo Finance の非公式チャートAPIから東証銘柄の現在値を取得する。
 * シンボル単位のリクエストのみのため、呼び出し側で同時実行数・間隔を制御する。
 */
export async function fetchQuote(code: string): Promise<QuoteOrError> {
  const symbol = `${code}${EXCHANGE_SUFFIX}`
  const url = `${API_BASE}/${symbol}?interval=1d&range=5d`

  let res: Response
  try {
    res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : '通信エラーが発生しました' }
  }

  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}` }
  }

  const body = (await res.json()) as YahooChartResponse
  if (body.chart.error) {
    return { ok: false, error: body.chart.error.description ?? 'データを取得できませんでした' }
  }

  const meta = body.chart.result?.[0]?.meta
  if (
    !meta ||
    typeof meta.regularMarketPrice !== 'number' ||
    typeof meta.chartPreviousClose !== 'number'
  ) {
    return { ok: false, error: 'データを取得できませんでした' }
  }

  return {
    ok: true,
    quote: {
      price: meta.regularMarketPrice,
      previousClose: meta.chartPreviousClose,
      volume: meta.regularMarketVolume ?? null,
      isMarketOpen: deriveIsMarketOpen(meta),
    },
  }
}
