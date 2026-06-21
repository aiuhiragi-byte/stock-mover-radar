import { useMemo } from 'react'
import { STOCKS } from './data/stocks'
import { ApiKeySettings } from './components/ApiKeySettings'
import { ScanControls } from './components/ScanControls'
import { MoversBoard } from './components/MoversBoard'
import { useLocalStorageState } from './hooks/useLocalStorageState'
import { useStockScanner } from './hooks/useStockScanner'
import { STORAGE_KEYS } from './lib/storage'
import type { ScanTarget } from './lib/types'

function App() {
  const [apiKey, setApiKey] = useLocalStorageState(STORAGE_KEYS.apiKey, '')
  const [scanTarget, setScanTarget] = useLocalStorageState<ScanTarget>(STORAGE_KEYS.scanTarget, 'all')
  const [segmentFilter, setSegmentFilter] = useLocalStorageState(STORAGE_KEYS.segmentFilter, {
    large: true,
    mid: true,
  })
  const [showAll, setShowAll] = useLocalStorageState(STORAGE_KEYS.showAll, false)

  const { results, status, progress, fatalError, nextBatchAt, start, stop } = useStockScanner(apiKey)

  const counts = useMemo(
    () => ({
      all: STOCKS.length,
      large: STOCKS.filter((s) => s.segment === 'large').length,
      mid: STOCKS.filter((s) => s.segment === 'mid').length,
    }),
    [],
  )

  const stocksForTarget = useMemo(
    () => (scanTarget === 'all' ? STOCKS : STOCKS.filter((s) => s.segment === scanTarget)),
    [scanTarget],
  )

  return (
    <div className="app">
      <header className="app-header">
        <h1>Stock Mover Radar</h1>
        <p className="subtitle">日本株（東証）大型・中型株の急騰・急落モニター</p>
      </header>

      <main>
        <ApiKeySettings apiKey={apiKey} onChange={setApiKey} />

        <ScanControls
          scanTarget={scanTarget}
          onScanTargetChange={setScanTarget}
          status={status}
          progress={progress}
          nextBatchAt={nextBatchAt}
          fatalError={fatalError}
          onStart={() => start(stocksForTarget)}
          onStop={stop}
          counts={counts}
        />

        <MoversBoard
          results={results}
          segmentFilter={segmentFilter}
          onSegmentFilterChange={setSegmentFilter}
          showAll={showAll}
          onShowAllChange={setShowAll}
          universeSize={stocksForTarget.length}
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
