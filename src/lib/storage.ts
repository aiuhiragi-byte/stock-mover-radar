export const STORAGE_KEYS = {
  segmentFilter: 'stock-mover-radar:segmentFilter',
  showAll: 'stock-mover-radar:showAll',
} as const

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // localStorageが使えない環境(プライベートモード等)では無視する
  }
}
