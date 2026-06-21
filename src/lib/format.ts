export function formatPrice(value: number | null): string {
  if (value === null) return '—'
  return value.toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 2 })
}

export function formatPercent(value: number | null): string {
  if (value === null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatSignedNumber(value: number | null): string {
  if (value === null) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`
}

export function formatVolume(value: number | null): string {
  if (value === null) return '—'
  return value.toLocaleString('ja-JP')
}

export function formatTime(epochMs: number | null): string {
  if (epochMs === null) return '未取得'
  return new Date(epochMs).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
