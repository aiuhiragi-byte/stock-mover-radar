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

export function formatCountdown(targetEpochMs: number | null, nowMs: number): string {
  if (targetEpochMs === null) return ''
  const remainingSec = Math.max(0, Math.ceil((targetEpochMs - nowMs) / 1000))
  const m = Math.floor(remainingSec / 60)
  const s = remainingSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
