import { useEffect, useState } from 'react'
import type { ScanStatus, ScanTarget } from '../lib/types'
import { formatCountdown } from '../lib/format'
import { DEFAULT_BATCH_SIZE } from '../lib/twelvedata'

interface Props {
  scanTarget: ScanTarget
  onScanTargetChange: (target: ScanTarget) => void
  status: ScanStatus
  progress: { done: number; total: number }
  nextBatchAt: number | null
  fatalError: string | null
  onStart: () => void
  onStop: () => void
  counts: { all: number; large: number; mid: number }
}

export function ScanControls({
  scanTarget,
  onScanTargetChange,
  status,
  progress,
  nextBatchAt,
  fatalError,
  onStart,
  onStop,
  counts,
}: Props) {
  const [now, setNow] = useState(Date.now())
  const scanning = status === 'scanning'

  useEffect(() => {
    if (!nextBatchAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [nextBatchAt])

  return (
    <section className="panel">
      <div className="panel-body">
        <div className="scan-target-row">
          <label>
            <input
              type="radio"
              name="scan-target"
              checked={scanTarget === 'all'}
              disabled={scanning}
              onChange={() => onScanTargetChange('all')}
            />
            すべて ({counts.all}件)
          </label>
          <label>
            <input
              type="radio"
              name="scan-target"
              checked={scanTarget === 'large'}
              disabled={scanning}
              onChange={() => onScanTargetChange('large')}
            />
            大型株のみ ({counts.large}件)
          </label>
          <label>
            <input
              type="radio"
              name="scan-target"
              checked={scanTarget === 'mid'}
              disabled={scanning}
              onChange={() => onScanTargetChange('mid')}
            />
            中型株のみ ({counts.mid}件)
          </label>
        </div>

        <div className="scan-buttons">
          {scanning ? (
            <button type="button" className="secondary" onClick={onStop}>
              スキャン停止
            </button>
          ) : (
            <button type="button" onClick={onStart}>
              スキャン開始
            </button>
          )}
          {scanning && (
            <span className="scan-progress">
              進捗 {progress.done} / {progress.total} 件
              {nextBatchAt && <> ・ 次のバッチまで {formatCountdown(nextBatchAt, now)}</>}
            </span>
          )}
        </div>

        <p className="hint small">
          無料プランのレート制限（8クレジット/分）に配慮し、{DEFAULT_BATCH_SIZE}銘柄ずつ取得して間隔を空けて巡回します。
          全銘柄のスキャンには数分かかります。
        </p>

        {fatalError && <p className="error-banner">{fatalError}</p>}
      </div>
    </section>
  )
}
