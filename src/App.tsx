import { useEffect, useMemo, useState } from 'react'
import { STOCKS } from './data/stocks'
import { MoversBoard } from './components/MoversBoard'
import { useLocalStorageState } from './hooks/useLocalStorageState'
import { STORAGE_KEYS } from './lib/storage'
import { formatTime } from './lib/format'
import type { ResultMap } from './lib/types'

interface ScanResultsPayload {
  generatedAt: string
  results: ResultMap
}

function App() {
  const [segmentFilter, setSegmentFilter] = useLocalStorageState(STORAGE_KEYS.segmentFilter, {
    large: true,
    mid: true,
  })
  const [showAll, setShowAll] = useLocalStorageState(STORAGE_KEYS.showAll, false)
  const [data, setData] = useState<ScanResultsPayload | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/scan-results.json', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<ScanResultsPayload>
      })
      .then((payload) => {
        if (!cancelled) setData(payload)
      })
      .catch(() => {
        if (!cancelled) setLoadError('データの取得に失敗しました。しばらくしてから再読み込みしてください。')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const universeSize = useMemo(() => STOCKS.length, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>Stock Mover Radar</h1>
        <p className="subtitle">日本株（東証）大型・中型株の急騰・急落モニター</p>
        <p className="hint small">
          {data ? `最終取得: ${formatTime(new Date(data.generatedAt).getTime())}` : '読み込み中…'}
          （6時間ごとに自動更新）
        </p>
      </header>

      <main>
        {loadError && <p className="error-banner">{loadError}</p>}

        <MoversBoard
          results={data?.results ?? {}}
          segmentFilter={segmentFilter}
          onSegmentFilterChange={setSegmentFilter}
          showAll={showAll}
          onShowAllChange={setShowAll}
          universeSize={universeSize}
        />
      </main>

      <footer className="app-footer">
        <p>
          データ提供: <a href="https://twelvedata.com/" target="_blank" rel="noreferrer">Twelve Data</a>
          。本アプリは情報提供のみを目的とし、投資助言ではありません。大型・中型の区分は固定リストによる簡易分類です。
        </p>
      </footer>
    </div>
  )
}

export default App
