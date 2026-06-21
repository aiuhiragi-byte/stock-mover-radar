const API_BASE = 'https://api.twelvedata.com'

/** Twelve Data 上の東証(Tokyo Stock Exchange)の exchange パラメータ値 */
export const JPX_EXCHANGE = 'JPX'

/** 無料プランの上限 (8 credits/分, 800 credits/日) を踏まえた既定値 */
export const DEFAULT_BATCH_SIZE = 8
export const DEFAULT_BATCH_INTERVAL_MS = 65_000

export interface TwelveDataQuote {
  symbol: string
  name?: string
  exchange?: string
  currency?: string
  datetime?: string
  close?: string
  previous_close?: string
  change?: string
  percent_change?: string
  volume?: string
  is_market_open?: boolean
}

interface TwelveDataErrorPayload {
  code: number
  message: string
  status: 'error'
}

export class TwelveDataApiError extends Error {
  code: number
  constructor(payload: TwelveDataErrorPayload) {
    super(payload.message)
    this.code = payload.code
  }
}

function isErrorPayload(value: unknown): value is TwelveDataErrorPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { status?: unknown }).status === 'error' &&
    typeof (value as { code?: unknown }).code === 'number'
  )
}

export type QuoteOrError =
  | { ok: true; quote: TwelveDataQuote }
  | { ok: false; error: string }

/**
 * 銘柄コードのバッチ(最大 DEFAULT_BATCH_SIZE 件程度を推奨)を1回のAPI呼び出しで取得する。
 * Twelve Data の /quote はカンマ区切りで複数シンボルを渡すとシンボル毎の集計を1クレジットとして消費する。
 */
export async function fetchQuoteBatch(
  codes: string[],
  apiKey: string,
  exchange: string = JPX_EXCHANGE,
): Promise<Map<string, QuoteOrError>> {
  const url = new URL(`${API_BASE}/quote`)
  url.searchParams.set('symbol', codes.join(','))
  url.searchParams.set('exchange', exchange)
  url.searchParams.set('apikey', apiKey)

  const res = await fetch(url.toString())
  const body: unknown = await res.json()

  // APIキー不正・レート制限超過などリクエスト全体が失敗した場合
  if (isErrorPayload(body)) {
    throw new TwelveDataApiError(body)
  }

  const result = new Map<string, QuoteOrError>()

  if (codes.length === 1) {
    // 単一シンボルの場合はオブジェクトがフラットに返る
    const quote = body as TwelveDataQuote
    result.set(codes[0], { ok: true, quote })
    return result
  }

  // 複数シンボルの場合はシンボルをキーにしたオブジェクトで返る
  const map = body as Record<string, TwelveDataQuote | TwelveDataErrorPayload>
  for (const code of codes) {
    const entry = map[code]
    if (entry === undefined) {
      result.set(code, { ok: false, error: 'データを取得できませんでした' })
    } else if (isErrorPayload(entry)) {
      result.set(code, { ok: false, error: entry.message })
    } else {
      result.set(code, { ok: true, quote: entry })
    }
  }
  return result
}
